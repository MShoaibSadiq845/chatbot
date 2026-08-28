// pdf-parse v2: constructor signature is PDFParse(buffer, options)
// load() and getText() are called on the instance without args
import { PDFParse } from 'pdf-parse';

export interface PdfExtractionResult {
  rawText: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * PDF Extraction Tool
 * Extracts raw text, metadata, and splits into chunks for further processing.
 * Uses pdf-parse v2 PDFParse(buffer, options) API.
 * Called explicitly by Document Analysis Agent.
 */
export async function extractPdfText(
  buffer: Buffer,
): Promise<PdfExtractionResult> {
  console.log('[Tool: extractPdfText] Invoked — parsing PDF buffer');

  const parser = new PDFParse(new Uint8Array(buffer), {
    verbosity: 0,
    useSystemFonts: true,
  });

  const textResult = await parser.getText();
  const infoResult = await parser.getInfo().catch(() => ({ info: {} }));

  const rawText = (textResult?.pages ?? [])
    .map((p: any) => p?.text ?? '')
    .join('\n')
    .trim();

  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const pageCount = textResult?.total ?? textResult?.pages?.length ?? 0;

  const chunks = chunkText(rawText, 500, 50);

  console.log(
    `[Tool: extractPdfText] Extracted ${wordCount} words across ${pageCount} pages → ${chunks.length} chunks`,
  );

  return {
    rawText,
    pageCount,
    wordCount,
    chunks,
    metadata: {
      title: infoResult?.info?.Title || undefined,
      author: infoResult?.info?.Author || undefined,
      subject: infoResult?.info?.Subject || undefined,
    },
  };
}

/**
 * Chunks text into segments of ~chunkSize words with optional overlap.
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}
