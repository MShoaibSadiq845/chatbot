import { callGemini } from './gemini.client';
import { AgentRunner } from './runner';
import { extractPdfText, PdfExtractionResult } from './tools/pdf-extractor.tool';
import { countTokens } from './tools/chunk-retriever.tool';

export interface AnalysisResult {
  documentType: string;
  sections: string[];
  themes: string[];
  entities: string[];
  wordCount: number;
  pageCount: number;
  chunks: string[];
  rawText: string;
  extraction: PdfExtractionResult;
}

/**
 * Document Analysis Agent
 *
 * Responsibilities:
 *  - Explicitly calls extractPdfText tool on the buffer
 *  - Identifies document type (research, business, legal, manual)
 *  - Extracts sections, themes, key entities
 *  - Returns structured metadata for later use by Summary and Q&A agents
 */
export async function documentAnalysisAgent(
  pdfBuffer: Buffer,
  runner: AgentRunner,
): Promise<AnalysisResult> {

  // ── Tool Call 1: Extract PDF text ────────────────────────────────────────
  const toolT0 = Date.now();
  const extraction = await extractPdfText(pdfBuffer);
  const toolDuration = Date.now() - toolT0;

  runner.logStep(
    'DocumentAnalysisAgent',
    'Calling tool: extractPdfText',
    toolDuration,
    [
      {
        toolName: 'extractPdfText',
        inputSummary: `Buffer size: ${pdfBuffer.length} bytes`,
        outputSummary: `${extraction.wordCount} words, ${extraction.pageCount} pages, ${extraction.chunks.length} chunks`,
        durationMs: toolDuration,
      },
    ],
  );

  // ── Tool Call 2: Count tokens ─────────────────────────────────────────────
  const tokenT0 = Date.now();
  const tokenStats = countTokens(extraction.rawText);
  const tokenDuration = Date.now() - tokenT0;

  runner.logStep(
    'DocumentAnalysisAgent',
    'Calling tool: countTokens',
    tokenDuration,
    [
      {
        toolName: 'countTokens',
        inputSummary: `Text length: ${extraction.rawText.length} chars`,
        outputSummary: `words: ${tokenStats.words}, sentences: ${tokenStats.sentences}, paragraphs: ${tokenStats.paragraphs}`,
        durationMs: tokenDuration,
      },
    ],
  );

  // ── LLM Call: Classify and extract structure ──────────────────────────────
  const sampleText = extraction.rawText.slice(0, 4000);

  const prompt = `You are a Document Analysis Agent. Analyze this document excerpt and return structured JSON.

Document excerpt (first 4000 chars):
"""
${sampleText}
"""

Classify and extract:
1. documentType: one of ["research_paper", "business_report", "legal_policy", "manual_guide", "other"]
2. sections: list of main section titles or headings you can identify (max 10)
3. themes: main topics and themes covered (max 8)
4. entities: key named entities — people, organizations, products, concepts (max 10)

Return ONLY valid JSON, no markdown:
{
  "documentType": "...",
  "sections": ["...", "..."],
  "themes": ["...", "..."],
  "entities": ["...", "..."]
}`;

  const llmT0 = Date.now();
  const raw = await callGemini(prompt);
  const llmDuration = Date.now() - llmT0;

  let structured: {
    documentType: string;
    sections: string[];
    themes: string[];
    entities: string[];
  };

  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    structured = JSON.parse(cleaned);
  } catch {
    structured = {
      documentType: 'other',
      sections: ['Document content'],
      themes: ['General content'],
      entities: [],
    };
    console.warn('[DocumentAnalysisAgent] JSON parse failed, using fallback');
  }

  runner.logStep(
    'DocumentAnalysisAgent',
    'LLM classification complete',
    llmDuration,
    undefined,
    `Type: ${structured.documentType} | Sections: ${structured.sections.length} | Themes: ${structured.themes.length}`,
  );

  return {
    documentType: structured.documentType,
    sections: structured.sections,
    themes: structured.themes,
    entities: structured.entities,
    wordCount: extraction.wordCount,
    pageCount: extraction.pageCount,
    chunks: extraction.chunks,
    rawText: extraction.rawText,
    extraction,
  };
}
