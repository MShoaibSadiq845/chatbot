# Smart Document Intelligence System

A decision-driven multi-agent platform for PDF analysis and Q&A — built with NestJS, Next.js, MongoDB, and Gemini AI.

---

## Agent Architecture

Every user request passes through a mandatory pipeline:

```
User Input
   ↓
[Input Guardrail]       — programmatic TypeScript check (not a prompt)
   ↓
[Router Agent]          — classifies intent, delegates to specialist (NEVER answers)
   ↓
[Specialized Agent]     — Analysis / Summary / Q&A
   ↓
[Tool Calls]            — explicit real tools (no fake outputs)
   ↓
[Output Guardrail]      — grounding + hallucination detection
   ↓
Final Answer
```

---

## Agent Responsibilities

### 1. Router Agent (`router.agent.ts`)
- **Only job**: classify user intent and return a routing decision JSON
- **Rules**: ✗ Must NOT answer the user · ✗ Must NOT call tools
- Determines: `analysis` | `summary` | `qa`
- Falls back to keyword inference if LLM JSON parse fails

### 2. Document Analysis Agent (`document-analysis.agent.ts`)
- Runs on PDF upload (not on user queries)
- **Tool calls**: `extractPdfText` → `countTokens`
- Identifies document type: `research_paper` | `business_report` | `legal_policy` | `manual_guide` | `other`
- Extracts: sections, themes, named entities
- Stores results in MongoDB for downstream agents

### 3. Summary Agent (`summary.agent.ts`)
- Triggered when Router detects summary intent
- **Tool call**: `retrieveRelevantChunks` with summary-oriented query
- Adapts style by document type:
  - research_paper → academic (methodology, findings, conclusions)
  - business_report → executive (KPIs, decisions, impact)
  - legal_policy → formal (obligations, clauses)
  - manual_guide → instructional (steps, requirements)
- Returns: executive summary + bullet highlights

### 4. Q&A Agent (`qa.agent.ts`)
- Triggered for factual questions about document content
- **Tool calls**: `retrieveRelevantChunks` + `locateSection`
- Answers ONLY from retrieved document context
- Explicitly returns: `"This information is not present in the document."` when applicable
- ✗ No hallucination · ✗ No external knowledge

---

## Tools Used

| Tool | File | Called By | Purpose |
|------|------|-----------|---------|
| `extractPdfText` | `pdf-extractor.tool.ts` | Analysis Agent | Parses PDF buffer via pdf-parse v2, returns text, page count, word count, chunks |
| `countTokens` | `chunk-retriever.tool.ts` | Analysis Agent | Counts words, sentences, paragraphs |
| `retrieveRelevantChunks` | `chunk-retriever.tool.ts` | Summary Agent, Q&A Agent | TF-IDF-style keyword scoring retrieves top-K relevant chunks |
| `locateSection` | `chunk-retriever.tool.ts` | Q&A Agent | Scans raw text line-by-line for section headings matching query keywords |

**Why these tools?**
- All tools are real functions with real logic — no hardcoded outputs
- Explicit invocation is logged by the Runner with input/output summaries
- Chunk retrieval grounds answers in actual document content before the LLM sees them

---

## Guardrails

Implemented in `guardrails.ts` — **pure TypeScript logic, not prompts**.

### `inputGuardrail` (runs before Router)
- Blocks empty / too-short / too-long questions
- Blocks prompt-injection patterns (`ignore previous instructions`, `jailbreak`, etc.)
- Blocks clearly off-topic questions (weather, recipes, sports scores, etc.)

### `outputGuardrail` (runs after LLM answer)
- Detects hallucination signals: phrases like `"as of my knowledge"`, `"according to Wikipedia"`, `"based on my training"`
- Blocks the response if detected, returns a safe fallback

### `groundingGuardrail` (runs after Q&A answer)
- Checks keyword overlap between the answer and retrieved context chunks
- Requires ≥15% overlap for answers longer than 100 chars
- Passes automatically if the agent explicitly says `"not present in the document"` (valid refusal)

**Why outside prompts?** Prompt-based guardrails can be bypassed by clever user input or model behavior. TypeScript logic cannot be jailbroken.

---

## Runner & Tracing

`runner.ts` — `AgentRunner` class logs every step:

- Which agent was selected and why
- Each tool call: name, input summary, output summary, duration
- Each guardrail decision: passed / blocked
- Each handoff between agents

Example console output:
```
════════════════════════════════════════════════════════════
[Runner] Starting execution — requestId: abc-123

[Guardrail] inputGuardrail → PASSED

[Runner → RouterAgent]
  Action     : Routing to "summary" — intent: User wants a summary
  Duration   : 412ms

[Runner] HANDOFF: RouterAgent → summaryAgent
  Reason: Question contains summary-related keywords

[Runner → SummaryAgent]
  Tool Used  : retrieveRelevantChunks
    Input    : query: "main points summary..." | total chunks: 14
    Output   : retrieved 8 chunks, top score: 2.340
    Duration : 3ms

[Guardrail] outputGuardrail → PASSED
[Guardrail] groundingGuardrail → PASSED

[Runner] Execution complete — total: 1823ms
════════════════════════════════════════════════════════════
```

---

## Agent Design Notes

### Why agents were separated

Each agent has a single, clearly bounded responsibility. Separation enforces:

- **Router stays clean**: If the Router could answer, it would short-circuit. Forcing it to only route ensures every response goes through a specialist that is explicitly prompt-constrained and tool-equipped for that task.
- **Summary needs style adaptation**: The Summary Agent carries document-type-aware prompting and specific retrieval queries. If merged with Q&A, every answer would need conditional style logic — making the prompt bloated and error-prone.
- **Q&A needs strict grounding**: The Q&A Agent has two guardrail checks (output + grounding). These checks are calibrated for factual, document-bound answers. Summary answers have different characteristics (longer, interpretive) that would trigger false positives.

### What breaks if merged into one agent

- A single agent would need to decide routing, generate summaries, answer questions, and handle analysis — in one prompt. This leads to conflicting instructions and unpredictable behavior.
- Guardrails become harder to apply selectively. Grounding check that works for Q&A would falsely block valid summaries.
- Tool selection becomes ambiguous — the agent might call the wrong tool for the task.
- No explicit handoff = no traceable routing decision = impossible to debug or audit.

### What would improve in production

1. **Vector embeddings** for chunk retrieval instead of keyword scoring (use pgvector or Pinecone)
2. **Streaming responses** via SSE so users see the answer as it generates
3. **Agent memory** — persist conversation context so follow-up questions are coherent
4. **Document versioning** — re-analyze when a document is updated
5. **Rate limiting** per user/document to prevent abuse
6. **Async job queue** (Bull/BullMQ) for PDF analysis instead of fire-and-forget async
7. **Structured output enforcement** using Gemini's JSON mode / response schema

---

## How to Run Locally

### Prerequisites
- Node.js 18+
- MongoDB (Atlas URI provided in `.env`)
- Gemini API key (already configured)

### 1. Backend

```bash
cd server
npm install
npm run start:dev
# Server runs at http://localhost:5000
```

Or build and run:
```bash
npm run build
npm start
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
# App runs at http://localhost:3000
```

### Environment Variables

**`server/.env`** (already configured):
```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
MONGODB_URI=your_mongodb_uri
PORT=5000
```

**`client/.env.local`**:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload PDF, start analysis |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document with analysis |
| GET | `/api/documents/:id/status` | Poll analysis status |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/chat/ask` | Ask a question (full agent pipeline) |
| GET | `/api/documents/:id/chat/history` | Get chat history |
| DELETE | `/api/documents/:id/chat/history` | Clear chat history |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), MUI v9, RTK Query |
| Backend | NestJS, MongoDB, Mongoose |
| AI | Google Gemini (via `@google/generative-ai`) |
| PDF | pdf-parse v2 |
| Architecture | Multi-agent system with explicit handoffs, tools, and guardrails |

> ✗ No LangChain · ✗ No LangGraph · ✗ No single-agent shortcuts
