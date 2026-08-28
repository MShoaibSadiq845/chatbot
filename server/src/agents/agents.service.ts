import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentRunner } from './runner';
import { routerAgent } from './router.agent';
import { documentAnalysisAgent, AnalysisResult } from './document-analysis.agent';
import { summaryAgent } from './summary.agent';
import { qaAgent } from './qa.agent';
import { inputGuardrail } from './guardrails';

export interface RunAgentPipelineResult {
  answer: string;
  agentUsed: string;
  routingDecision: { selectedAgent: string; reasoning: string; intent: string };
  toolCallsLog: any[];
  trace: any;
  blocked: boolean;
  blockReason?: string;
  groundingScore?: number;
}

@Injectable()
export class AgentsService {
  /**
   * Main entry: analyze a PDF document.
   * Always calls DocumentAnalysisAgent (no routing needed for initial analysis).
   */
  async analyzeDocument(pdfBuffer: Buffer): Promise<AnalysisResult> {
    const runner = new AgentRunner(uuidv4());
    const result = await documentAnalysisAgent(pdfBuffer, runner);
    runner.finish();
    return result;
  }

  /**
   * Main entry: handle a user question about a document.
   * Enforces: Input Guardrail → Router Agent → Specialized Agent → Output Guardrail
   */
  async runAgentPipeline(
    question: string,
    rawText: string,
    chunks: string[],
    documentType: string,
  ): Promise<RunAgentPipelineResult> {
    const requestId = uuidv4();
    const runner = new AgentRunner(requestId);

    // ── Step 1: Input Guardrail (outside all agents) ──────────────────────
    const inputCheck = inputGuardrail(question);
    runner.logGuardrail(
      'inputGuardrail',
      inputCheck.allowed ? 'PASSED' : 'BLOCKED',
      inputCheck.reason,
    );

    if (!inputCheck.allowed) {
      runner.finish();
      return {
        answer: inputCheck.reason || 'This question cannot be processed.',
        agentUsed: 'guardrail',
        routingDecision: {
          selectedAgent: 'blocked',
          reasoning: 'Blocked by input guardrail',
          intent: 'blocked',
        },
        toolCallsLog: [],
        trace: runner.getTrace(),
        blocked: true,
        blockReason: inputCheck.reason,
      };
    }

    // ── Step 2: Router Agent (mandatory, never skipped) ───────────────────
    const routingDecision = await routerAgent(question, documentType, runner);

    // ── Step 3: Handoff to Specialized Agent ──────────────────────────────
    let answer = '';
    let toolCallsLog: any[] = [];
    let blocked = false;
    let blockReason: string | undefined;
    let groundingScore: number | undefined;

    switch (routingDecision.selectedAgent) {
      case 'analysis': {
        const analysisResult = await qaAgent(
          question,
          rawText,
          chunks,
          documentType,
          runner,
        );
        // For analysis questions, still use QA agent with full retrieval
        // but frame it through analysis context
        answer = analysisResult.answer;
        toolCallsLog = analysisResult.toolCallsLog;
        blocked = analysisResult.blocked;
        blockReason = analysisResult.blockReason;
        groundingScore = analysisResult.groundingScore;

        // If the question is truly about document structure, enrich the answer
        if (!blocked && chunks.length > 0) {
          const docTypeLabel = documentType.replace('_', ' ');
          if (!answer.toLowerCase().includes(docTypeLabel.toLowerCase())) {
            answer = `[Document type: ${docTypeLabel}]\n\n${answer}`;
          }
        }
        break;
      }

      case 'summary': {
        const summaryResult = await summaryAgent(
          question,
          rawText,
          chunks,
          documentType,
          runner,
        );
        answer = `**Executive Summary**\n\n${summaryResult.executiveSummary}\n\n**Key Highlights**\n\n${summaryResult.bulletHighlights.map((b) => `• ${b}`).join('\n')}`;
        toolCallsLog = summaryResult.toolCallsLog;
        break;
      }

      case 'qa':
      default: {
        const qaResult = await qaAgent(
          question,
          rawText,
          chunks,
          documentType,
          runner,
        );
        answer = qaResult.answer;
        toolCallsLog = qaResult.toolCallsLog;
        blocked = qaResult.blocked;
        blockReason = qaResult.blockReason;
        groundingScore = qaResult.groundingScore;
        break;
      }
    }

    runner.finish();

    return {
      answer,
      agentUsed: routingDecision.selectedAgent,
      routingDecision,
      toolCallsLog,
      trace: runner.getTrace(),
      blocked,
      blockReason,
      groundingScore,
    };
  }
}
