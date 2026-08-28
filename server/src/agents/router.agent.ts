import { callGemini } from './gemini.client';
import { AgentRunner } from './runner';

export type AgentRoute = 'analysis' | 'summary' | 'qa';

export interface RouterDecision {
  selectedAgent: AgentRoute;
  intent: string;
  reasoning: string;
}

/**
 * Router Agent
 *
 * Rules (hard-enforced):
 *  ✗ Must NOT answer the user
 *  ✗ Must NOT call tools
 *  ✓ Only performs routing / delegation
 *
 * Receives the user's message and decides which specialized agent
 * should handle it, returning a structured routing decision.
 */
export async function routerAgent(
  question: string,
  documentType: string,
  runner: AgentRunner,
): Promise<RouterDecision> {
  const t0 = Date.now();

  const prompt = `You are a Router Agent in a multi-agent document intelligence system.
Your ONLY job is to classify the user's intent and decide which specialized agent should handle it.

You MUST NOT answer the user's question.
You MUST NOT use any tools.
You MUST only output a JSON routing decision.

Available agents:
- "analysis"  → When the user wants to understand the document structure, type, themes, entities, or key sections
- "summary"   → When the user wants a summary, overview, highlights, key points, or TL;DR of the document
- "qa"        → When the user asks a specific factual question about the document content

Document type: ${documentType}
User message: "${question}"

Respond with ONLY this JSON (no markdown, no explanation):
{
  "selectedAgent": "analysis" | "summary" | "qa",
  "intent": "one-line description of what the user wants",
  "reasoning": "one sentence explaining why you chose this agent"
}`;

  const raw = await callGemini(prompt);
  const duration = Date.now() - t0;

  // Parse JSON from response (strip markdown fences if present)
  let decision: RouterDecision;
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    decision = JSON.parse(cleaned);
  } catch {
    // Fallback: infer from keywords
    decision = inferRouteFromKeywords(question);
    console.warn(
      `[RouterAgent] JSON parse failed, using keyword fallback: ${decision.selectedAgent}`,
    );
  }

  // Validate selectedAgent is one of the allowed values
  const allowed: AgentRoute[] = ['analysis', 'summary', 'qa'];
  if (!allowed.includes(decision.selectedAgent)) {
    decision.selectedAgent = 'qa'; // safe default
  }

  runner.logStep(
    'RouterAgent',
    `Routing to "${decision.selectedAgent}" — intent: ${decision.intent}`,
    duration,
    undefined,
    `→ ${decision.selectedAgent}`,
  );

  runner.logHandoff(
    'RouterAgent',
    decision.selectedAgent + 'Agent',
    decision.reasoning,
  );

  return decision;
}

function inferRouteFromKeywords(question: string): RouterDecision {
  const q = question.toLowerCase();

  if (
    q.includes('summary') || q.includes('summarize') ||
    q.includes('overview') || q.includes('tldr') ||
    q.includes('highlights') || q.includes('key points') ||
    // Urdu/Hinglish
    q.includes('summary do') || q.includes('khulasa') ||
    q.includes('mukhtasar') || q.includes('bata do') ||
    q.includes('samajhao') || q.includes('mutaliq') ||
    q.includes('important points')
  ) {
    return {
      selectedAgent: 'summary',
      intent: 'User wants a summary of the document',
      reasoning: 'Question contains summary-related keywords',
    };
  }

  if (
    q.includes('type') || q.includes('structure') ||
    q.includes('sections') || q.includes('themes') ||
    q.includes('entities') || q.includes('analyze') ||
    q.includes('identify') ||
    // Urdu/Hinglish
    q.includes('kaun si') || q.includes('kya hain') ||
    q.includes('topics') || q.includes('main cheez')
  ) {
    return {
      selectedAgent: 'analysis',
      intent: 'User wants document analysis',
      reasoning: 'Question contains analysis-related keywords',
    };
  }

  return {
    selectedAgent: 'qa',
    intent: 'User is asking a factual question about the document',
    reasoning: 'Defaulting to Q&A agent for factual questions',
  };
}
