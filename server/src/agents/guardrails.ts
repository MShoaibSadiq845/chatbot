/**
 * GUARDRAILS — Enforced outside of agent prompts
 *
 * These are programmatic, rule-based checks that run BEFORE and AFTER
 * agent execution. They cannot be bypassed by prompt injection or
 * model hallucination because they are pure TypeScript logic.
 */

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
}

// ─── Input Guardrails (run before routing) ──────────────────────────────────

const UNSAFE_PATTERNS = [
  /ignore (previous|all|above|prior) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as (a|an) (different|new|unrestricted)/i,
  /jailbreak/i,
  /bypass (your|the) (rules|restrictions|guidelines)/i,
  /forget (your|the) (instructions|rules|context)/i,
  /\bdangerouslyAllowBrowser\b/i,
];

const OFF_TOPIC_PATTERNS = [
  /\b(weather|stock price|lottery|recipe|sports score|news|celebrity)\b/i,
  /\b(write (me )?a (poem|song|story|joke))\b/i,
  /\b(what is your name|who (made|created|built) you)\b/i,
  /\b(translate (this )?(to|into))\b/i,
  /\b(how to (hack|crack|exploit))\b/i,
];

/**
 * Input guardrail: blocks unsafe or clearly off-topic questions
 * before they reach any agent.
 */
export function inputGuardrail(question: string): GuardrailResult {
  const trimmed = question.trim();

  if (!trimmed || trimmed.length < 3) {
    return { allowed: false, reason: 'Question is too short or empty.' };
  }

  if (trimmed.length > 2000) {
    return {
      allowed: false,
      reason: 'Question exceeds maximum length of 2000 characters.',
    };
  }

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason:
          'This question contains unsafe content and cannot be processed.',
      };
    }
  }

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason:
          'This question appears unrelated to document analysis. Please ask something about the uploaded document.',
      };
    }
  }

  return { allowed: true };
}

// ─── Output Guardrails (run after agent produces an answer) ──────────────────

const HALLUCINATION_SIGNALS = [
  /\bas of my (knowledge|training|last update)\b/i,
  /\bI (don't|do not) have access to (real-time|current|live)\b/i,
  /\bbased on my (general|broad|training) knowledge\b/i,
  /\baccording to (Wikipedia|Google|the internet|external sources)\b/i,
  /\bI (believe|think|assume) (that )?(generally|typically|usually)\b/i,
];

/**
 * Output guardrail: detects if the agent is trying to use
 * external knowledge instead of document content.
 */
export function outputGuardrail(answer: string): GuardrailResult {
  if (!answer || answer.trim().length === 0) {
    return {
      allowed: false,
      reason: 'Agent produced an empty response.',
    };
  }

  for (const pattern of HALLUCINATION_SIGNALS) {
    if (pattern.test(answer)) {
      return {
        allowed: false,
        reason:
          'Answer appears to reference external knowledge rather than document content. Blocked to prevent hallucination.',
      };
    }
  }

  return { allowed: true };
}

// ─── Document-Grounding Check ────────────────────────────────────────────────

/**
 * Verifies that a Q&A answer is grounded in the provided context chunks.
 * Checks for minimum keyword overlap between answer and retrieved context.
 */
export function groundingGuardrail(
  answer: string,
  contextChunks: string[],
): GuardrailResult {
  // If the agent explicitly says info is not present, that's valid
  const notFoundPhrases = [
    'not present in the document',
    'not mentioned in the document',
    'not found in the document',
    'document does not contain',
    'no information about',
    'cannot find',
  ];

  const lowerAnswer = answer.toLowerCase();
  for (const phrase of notFoundPhrases) {
    if (lowerAnswer.includes(phrase)) {
      return { allowed: true }; // Explicitly refusing is grounded behavior
    }
  }

  if (contextChunks.length === 0) {
    // No chunks retrieved but answer may still be valid from rawText context
    return { allowed: true };
  }

  // Check keyword overlap: answer should share meaningful words with context
  const combinedContext = contextChunks.join(' ').toLowerCase();
  const answerWords = answer
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  if (answerWords.length === 0) return { allowed: true };

  const contextWords = new Set(combinedContext.split(/\s+/));
  const overlap = answerWords.filter((w) => contextWords.has(w)).length;
  const overlapRatio = overlap / answerWords.length;

  // Require at least 15% keyword overlap with retrieved context
  if (overlapRatio < 0.15 && answer.length > 100) {
    return {
      allowed: false,
      reason:
        'Answer does not appear grounded in the document content. Insufficient keyword overlap with retrieved context.',
    };
  }

  return { allowed: true };
}
