/**
 * Agent Runner
 *
 * Controls execution flow across agents.
 * Every request MUST pass through the Router Agent first.
 * The Runner logs all execution steps for traceability.
 */

export interface AgentRunTrace {
  requestId: string;
  steps: TraceStep[];
  finalAgent: string;
  totalDurationMs: number;
}

export interface TraceStep {
  agent: string;
  action: string;
  durationMs: number;
  toolCalls?: ToolCallTrace[];
  output?: string;
}

export interface ToolCallTrace {
  toolName: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
}

export class AgentRunner {
  private traces: TraceStep[] = [];
  private startTime: number;
  public requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
    this.startTime = Date.now();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Runner] Starting execution — requestId: ${requestId}`);
    console.log(`${'═'.repeat(60)}`);
  }

  logStep(
    agent: string,
    action: string,
    durationMs: number,
    toolCalls?: ToolCallTrace[],
    output?: string,
  ): void {
    const step: TraceStep = { agent, action, durationMs, toolCalls, output };
    this.traces.push(step);

    console.log(`\n[Runner → ${agent}]`);
    console.log(`  Action     : ${action}`);
    console.log(`  Duration   : ${durationMs}ms`);
    if (toolCalls && toolCalls.length > 0) {
      toolCalls.forEach((tc) => {
        console.log(`  Tool Used  : ${tc.toolName}`);
        console.log(`    Input    : ${tc.inputSummary}`);
        console.log(`    Output   : ${tc.outputSummary}`);
        console.log(`    Duration : ${tc.durationMs}ms`);
      });
    }
    if (output) {
      console.log(`  Output     : ${output.slice(0, 120)}...`);
    }
  }

  logHandoff(fromAgent: string, toAgent: string, reason: string): void {
    console.log(`\n[Runner] HANDOFF: ${fromAgent} → ${toAgent}`);
    console.log(`  Reason: ${reason}`);
  }

  logGuardrail(guardrailName: string, result: string, detail?: string): void {
    console.log(`\n[Runner] GUARDRAIL: ${guardrailName} → ${result}`);
    if (detail) console.log(`  Detail: ${detail}`);
  }

  getTrace(): AgentRunTrace {
    return {
      requestId: this.requestId,
      steps: this.traces,
      finalAgent: this.traces[this.traces.length - 1]?.agent || 'none',
      totalDurationMs: Date.now() - this.startTime,
    };
  }

  finish(): void {
    const total = Date.now() - this.startTime;
    console.log(`\n[Runner] Execution complete — total: ${total}ms`);
    console.log(`${'═'.repeat(60)}\n`);
  }
}
