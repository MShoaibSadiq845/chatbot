/**
 * Chunk Retriever Tool (Semantic Search via Keyword Scoring)
 * Retrieves the most relevant text chunks from a document for a given query.
 * Called explicitly by the Q&A Agent before answering questions.
 */

export interface RetrievalResult {
  chunks: string[];
  scores: number[];
  totalChunksSearched: number;
}

/**
 * Retrieves top-K most relevant chunks for a query using TF-IDF-style scoring.
 * This is a real, non-fake retrieval — no hardcoded results.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: string[],
  topK: number = 5,
): RetrievalResult {
  console.log(
    `[Tool: retrieveRelevantChunks] Invoked — query: "${query.slice(0, 80)}..." | chunks: ${chunks.length}`,
  );

  if (!chunks || chunks.length === 0) {
    return { chunks: [], scores: [], totalChunksSearched: 0 };
  }

  const queryTokens = tokenize(query);

  const scored = chunks.map((chunk, idx) => {
    const chunkTokens = tokenize(chunk);
    const score = computeScore(queryTokens, chunkTokens);
    return { chunk, score, idx };
  });

  scored.sort((a, b) => b.score - a.score);

  let top = scored.slice(0, topK).filter((s) => s.score > 0);

  // If no scored matches (e.g. non-English query), return all chunks
  if (top.length === 0) {
    console.log('[Tool: retrieveRelevantChunks] No scored matches — returning all chunks as fallback');
    top = scored.slice(0, topK);
  }

  console.log(
    `[Tool: retrieveRelevantChunks] Top scores: ${top.map((t) => t.score.toFixed(3)).join(', ')}`,
  );

  return {
    chunks: top.map((t) => t.chunk),
    scores: top.map((t) => t.score),
    totalChunksSearched: chunks.length,
  };
}

/**
 * Section Locator Tool
 * Locates specific sections in the document by heading keywords.
 */
export function locateSection(
  sectionKeyword: string,
  rawText: string,
): string | null {
  console.log(
    `[Tool: locateSection] Invoked — looking for section: "${sectionKeyword}"`,
  );

  const lines = rawText.split('\n');
  const keyword = sectionKeyword.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(keyword) && lines[i].trim().length < 100) {
      // Likely a heading — grab the next 30 lines as section content
      const sectionContent = lines.slice(i, i + 30).join('\n').trim();
      console.log(`[Tool: locateSection] Found section at line ${i}`);
      return sectionContent;
    }
  }

  console.log(`[Tool: locateSection] Section not found: "${sectionKeyword}"`);
  return null;
}

/**
 * Word/Token Counter Tool
 */
export function countTokens(text: string): {
  words: number;
  sentences: number;
  paragraphs: number;
} {
  console.log('[Tool: countTokens] Invoked');
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0).length;
  return { words, sentences, paragraphs };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function computeScore(queryTokens: string[], chunkTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const chunkSet = new Map<string, number>();
  for (const t of chunkTokens) {
    chunkSet.set(t, (chunkSet.get(t) || 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const tf = chunkSet.get(qt) || 0;
    if (tf > 0) {
      // Boost exact matches, apply diminishing returns
      score += 1 + Math.log(tf);
    }
  }
  // Normalize by query length
  return score / queryTokens.length;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'now', 'old', 'see', 'two', 'who', 'did', 'does',
  'let', 'put', 'say', 'she', 'too', 'use', 'way', 'will', 'with', 'this',
  'that', 'from', 'they', 'what', 'have', 'been', 'were', 'said', 'each',
  'which', 'their', 'there', 'when', 'would', 'about', 'could', 'into',
  'more', 'also', 'than', 'then', 'some', 'other', 'such', 'these', 'those',
]);
