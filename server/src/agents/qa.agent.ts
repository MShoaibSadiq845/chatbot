import { callGemini } from './gemini.client';
import { AgentRunner } from './runner';
import {
  retrieveRelevantChunks,
  locateSection,
} from './tools/chunk-retriever.tool';
import { groundingGuardrail, outputGuardrail } from './guardrails';

export interface QAResult {
  answer: string;
  contextUsed: string[];
  toolCallsLog: any[];
  blocked: boolean;
  blockReason?: string;
  groundingScore: number;
}

/**
 * Q&A Agent
 *
 * Rules:
 *  ✗ No hallucination — answers ONLY from document context
 *  ✗ No external knowledge
 *  ✓ Explicitly states "This information is not present in the document" when applicable
 *  ✓ Uses retrieveRelevantChunks + locateSection tools before answering
 */
export async function qaAgent(
  question: string,
  rawText: string,
  chunks: string[],
  documentType: string,
  runner: AgentRunner,
): Promise<QAResult> {
  const toolCallsLog: any[] = [];

  // ── Tool Call 1: Retrieve relevant chunks ──────────────────────────────────
  const t0 = Date.now();
  const retrieval = retrieveRelevantChunks(question, chunks, 6);
  const retrievalDuration = Date.now() - t0;

  toolCallsLog.push({
    toolName: 'retrieveRelevantChunks',
    input: { query: question, topK: 6 },
    output: {
      chunksReturned: retrieval.chunks.length,
      scores: retrieval.scores.map((s) => s.toFixed(3)),
    },
  });

  runner.logStep(
    'QAAgent',
    'Calling tool: retrieveRelevantChunks',
    retrievalDuration,
    [
      {
        toolName: 'retrieveRelevantChunks',
        inputSummary: `query: "${question.slice(0, 60)}" | chunks: ${chunks.length}`,
        outputSummary: `${retrieval.chunks.length} chunks retrieved, scores: [${retrieval.scores.map((s) => s.toFixed(2)).join(', ')}]`,
        durationMs: retrievalDuration,
      },
    ],
  );

  // ── Tool Call 2: Try to locate a specific section ──────────────────────────
  // Extract potential section keyword from question
  const sectionKeywords = extractSectionKeywords(question);
  let sectionContent: string | null = null;

  if (sectionKeywords.length > 0) {
    const sectionT0 = Date.now();
    for (const kw of sectionKeywords) {
      sectionContent = locateSection(kw, rawText);
      if (sectionContent) break;
    }
    const sectionDuration = Date.now() - sectionT0;

    toolCallsLog.push({
      toolName: 'locateSection',
      input: { keywords: sectionKeywords },
      output: { found: !!sectionContent, contentLength: sectionContent?.length || 0 },
    });

    runner.logStep(
      'QAAgent',
      'Calling tool: locateSection',
      sectionDuration,
      [
        {
          toolName: 'locateSection',
          inputSummary: `keywords: [${sectionKeywords.join(', ')}]`,
          outputSummary: sectionContent
            ? `Section found (${sectionContent.length} chars)`
            : 'Section not found',
          durationMs: sectionDuration,
        },
      ],
    );
  }

  // Build context from retrieved chunks + section content
  // If no chunks retrieved, fall back to full rawText (for small docs)
  const contextParts = [...retrieval.chunks];
  if (sectionContent) contextParts.unshift(sectionContent);
  const context = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n').slice(0, 5000)
    : rawText.slice(0, 5000);

  // ── LLM Call: Answer strictly from context ────────────────────────────────
  const prompt = `You are a Q&A Agent. You MUST answer the question STRICTLY from the document context provided below.

CRITICAL RULES:
- If the answer is not in the context, respond EXACTLY: "This information is not present in the document."
- Do NOT use any knowledge outside of the provided context.
- Do NOT infer, assume, or speculate.
- Do NOT mention that you are an AI.
- Quote or paraphrase directly from the context when possible.

Document type: ${documentType}

Context from document:
"""
${context || 'No relevant context found in document.'}
"""

Question: "${question}"

Answer (be concise and factual, based ONLY on the context above):`;

  const llmT0 = Date.now();
  const rawAnswer = await callGemini(prompt);
  const llmDuration = Date.now() - llmT0;

  runner.logStep(
    'QAAgent',
    'LLM answer generation',
    llmDuration,
    undefined,
    rawAnswer.slice(0, 100),
  );

  // ── Output Guardrail ───────────────────────────────────────────────────────
  const outputCheck = outputGuardrail(rawAnswer);
  runner.logGuardrail(
    'outputGuardrail',
    outputCheck.allowed ? 'PASSED' : 'BLOCKED',
    outputCheck.reason,
  );

  if (!outputCheck.allowed) {
    return {
      answer:
        'This information is not present in the document. The system detected a potential hallucination and blocked the response.',
      contextUsed: retrieval.chunks,
      toolCallsLog,
      blocked: true,
      blockReason: outputCheck.reason,
      groundingScore: 0,
    };
  }

  // ── Grounding Guardrail ───────────────────────────────────────────────────
  const groundingCheck = groundingGuardrail(rawAnswer, retrieval.chunks);
  runner.logGuardrail(
    'groundingGuardrail',
    groundingCheck.allowed ? 'PASSED' : 'BLOCKED',
    groundingCheck.reason,
  );

  if (!groundingCheck.allowed) {
    return {
      answer:
        'This information is not present in the document. The response could not be verified against the document content.',
      contextUsed: retrieval.chunks,
      toolCallsLog,
      blocked: true,
      blockReason: groundingCheck.reason,
      groundingScore: 0,
    };
  }

  // Calculate rough grounding score for transparency
  const groundingScore = calculateGroundingScore(rawAnswer, retrieval.chunks);

  return {
    answer: rawAnswer.trim(),
    contextUsed: retrieval.chunks,
    toolCallsLog,
    blocked: false,
    groundingScore,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractSectionKeywords(question: string): string[] {
  const patterns = [
    /\b(?:in|about|under|regarding)\s+(?:the\s+)?([a-z\s]{3,30})\s+section/i,
    /\b(?:section|chapter|part)\s+(?:on|about|called|named)?\s*['""]?([a-z\s]{3,30})['""]?/i,
    /\bwhat\s+(?:does|is|are)?\s+(?:the\s+)?([a-z\s]{3,20})\s+(?:section|chapter|part)/i,
  ];

  const keywords: string[] = [];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match && match[1]) {
      keywords.push(match[1].trim());
    }
  }
  return keywords;
}

function calculateGroundingScore(answer: string, chunks: string[]): number {
  if (chunks.length === 0) return 0;
  const combined = chunks.join(' ').toLowerCase();
  const answerWords = answer
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (answerWords.length === 0) return 1;
  const contextWords = new Set(combined.split(/\s+/));
  const overlap = answerWords.filter((w) => contextWords.has(w)).length;
  return Math.min(1, overlap / answerWords.length);
}
