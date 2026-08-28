import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

export async function callGemini(prompt: string, retries = 3): Promise<string> {
  const client = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const model = client.getGenerativeModel({ model: modelName });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      const is503 = err?.status === 503 || err?.statusText === 'Service Unavailable';
      const is429 = err?.status === 429;

      if ((is503 || is429) && attempt < retries) {
        const waitMs = attempt * 3000; // 3s, 6s
        console.warn(`[Gemini] ${err.status} on attempt ${attempt}, retrying in ${waitMs}ms...`);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini: max retries exceeded');
}
