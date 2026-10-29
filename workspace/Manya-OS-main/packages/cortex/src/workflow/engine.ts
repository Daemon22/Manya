/**
 * @manya-os/cortex — workflow engine.
 *
 * Executes a multi-step workflow with conditional branching.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Workflow, WorkflowExecution, WorkflowStep, ToolResult } from '../types.js';
import { WorkflowError } from '../errors.js';
import { randomId } from '../util.js';
import type { ToolRegistry } from '../tools/registry.js';

export class WorkflowEngine {
  constructor(private readonly tools: ToolRegistry) {}

  /** Execute a workflow. Returns the final execution state. */
  async execute(workflow: Workflow, initialInput?: unknown): Promise<WorkflowExecution> {
    if (!workflow) throw new WorkflowError('workflow is required');
    const step = this.findStep(workflow, workflow.initialStep);
    if (!step) throw new WorkflowError(`initial step ${workflow.initialStep} not found`);
    const exec: WorkflowExecution = {
      id: randomId('wfexec'),
      workflowId: workflow.id,
      currentStepId: workflow.initialStep,
      visitedSteps: [workflow.initialStep],
      outputs: {},
      status: 'running',
      startedAt: Date.now(),
    };
    let currentStep: WorkflowStep | undefined = step;
    let currentInput: unknown = initialInput;
    while (currentStep && !currentStep.terminal && exec.status === 'running') {
      const result = await this.executeStep(currentStep, currentInput);
      exec.outputs[currentStep.id] = result.output;
      if (!result.success) {
        exec.status = 'failed';
        exec.error = result.error;
        exec.endedAt = Date.now();
        break;
      }
      // Determine next step.
      const nextId = currentStep.nextOnSuccess;
      if (!nextId) {
        // No next step → terminal.
        exec.status = 'completed';
        exec.endedAt = Date.now();
        break;
      }
      const nextStep = this.findStep(workflow, nextId);
      if (!nextStep) {
        exec.status = 'failed';
        exec.error = `next step ${nextId} not found`;
        exec.endedAt = Date.now();
        break;
      }
      exec.currentStepId = nextId;
      exec.visitedSteps.push(nextId);
      currentInput = result.output;
      currentStep = nextStep;
    }
    if (exec.status === 'running' && currentStep?.terminal) {
      exec.status = 'completed';
      exec.endedAt = Date.now();
    }
    return exec;
  }

  private findStep(workflow: Workflow, stepId: string): WorkflowStep | undefined {
    return workflow.steps.find(s => s.id === stepId);
  }

  private async executeStep(step: WorkflowStep, input: unknown): Promise<ToolResult> {
    if (!step.tool) {
      // No-op step (passthrough).
      return { success: true, output: input };
    }
    return this.tools.invoke(step.tool, step.input ?? input);
  }

  /** Abort a running execution. */
  abort(exec: WorkflowExecution): WorkflowExecution {
    if (exec.status !== 'running') return exec;
    exec.status = 'aborted';
    exec.endedAt = Date.now();
    return exec;
  }
}
