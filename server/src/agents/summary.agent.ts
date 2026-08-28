import { callGemini } from './gemini.client';
import { AgentRunner } from './runner';
import { retrieveRelevantChunks } from './tools/chunk-retriever.tool';

export interface SummaryResult {
  executiveSummary: string;
  bulletHighlights: string[];
  documentType: string;
  style: string;
  toolCallsLog: any[];
}

/**
 * Summary Agent
 *
 * Responsibilities:
 *  - Generate an executive summary adapted to document type
 *  - Produce bullet-point highlights
 *  - Adapts style: academic, executive, legal, or instructional
 */
export async function summaryAgent(
  question: string,
  rawText: string,
  chunks: string[],
  documentType: string,
  runner: AgentRunner,
): Promise<SummaryResult> {
  const toolCallsLog: any[] = [];

  // ── Tool Call: retrieve top chunks relevant to "summary" query ────────────
  const toolT0 = Date.now();
  const retrievalQuery = 'main points summary key findings conclusions overview';
  const retrieval = retrieveRelevantChunks(retrievalQuery, chunks, 8);
  const toolDuration = Date.now() - toolT0;

  toolCallsLog.push({
    toolName: 'retrieveRelevantChunks',
    input: { query: retrievalQuery, topK: 8 },
    output: {
      chunksReturned: retrieval.chunks.length,
      topScore: retrieval.scores[0]?.toFixed(3),
    },
  });

  runner.logStep(
    'SummaryAgent',
    'Calling tool: retrieveRelevantChunks',
    toolDuration,
    [
      {
        toolName: 'retrieveRelevantChunks',
        inputSummary: `query: "${retrievalQuery}" | total chunks: ${chunks.length}`,
        outputSummary: `retrieved ${retrieval.chunks.length} chunks, top score: ${retrieval.scores[0]?.toFixed(3) || 'N/A'}`,
        durationMs: toolDuration,
      },
    ],
  );

  // Determine style based on document type
  const styleMap: Record<string, string> = {
    research_paper: 'academic — focus on methodology, findings, and conclusions',
    business_report:
      'executive — focus on KPIs, decisions, and business impact',
    legal_policy:
      'formal legal — focus on obligations, definitions, and key clauses',
    manual_guide:
      'instructional — focus on steps, requirements, and key procedures',
    other: 'general — balanced overview',
  };

  const style = styleMap[documentType] || styleMap['other'];
  const context = retrieval.chunks.length > 0
    ? retrieval.chunks.join('\n\n---\n\n')
    : rawText;
  const contextForSummary = context.slice(0, 6000);

  // ── LLM Call: Generate summary ────────────────────────────────────────────
  const prompt = `You are a Summary Agent. Your ONLY knowledge source is the document text provided below.
Do NOT use any external knowledge. Do NOT fabricate information.

Document type: ${documentType}
Summary style: ${style}
User's request: "${question}"

Document content:
"""
${contextForSummary}
"""

Generate:
1. An executive summary (3-5 sentences) tailored to the "${style}" style
2. 5-8 bullet-point highlights of the most important information

Return ONLY this JSON (no markdown):
{
  "executiveSummary": "...",
  "bulletHighlights": ["...", "...", "..."]
}`;

  const llmT0 = Date.now();
  const raw = await callGemini(prompt);
  const llmDuration = Date.now() - llmT0;

  let result: { executiveSummary: string; bulletHighlights: string[] };

  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    result = JSON.parse(cleaned);
  } catch {
    // Fallback: extract text as plain summary
    result = {
      executiveSummary: raw.slice(0, 500),
      bulletHighlights: raw
        .split('\n')
        .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .slice(0, 8)
        .map((l) => l.replace(/^[-•]\s*/, '')),
    };
    console.warn('[SummaryAgent] JSON parse failed, using text fallback');
  }

  runner.logStep(
    'SummaryAgent',
    'Summary generation complete',
    llmDuration,
    undefined,
    `Summary length: ${result.executiveSummary.length} chars | Bullets: ${result.bulletHighlights.length}`,
  );

  return {
    executiveSummary: result.executiveSummary,
    bulletHighlights: result.bulletHighlights,
    documentType,
    style,
    toolCallsLog,
  };
}
