"use strict";
/**
 * @manya-os/cortex — workflow engine.
 *
 * Executes a multi-step workflow with conditional branching.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const errors_js_1 = require("../errors.js");
const util_js_1 = require("../util.js");
class WorkflowEngine {
    tools;
    constructor(tools) {
        this.tools = tools;
    }
    /** Execute a workflow. Returns the final execution state. */
    async execute(workflow, initialInput) {
        if (!workflow)
            throw new errors_js_1.WorkflowError('workflow is required');
        const step = this.findStep(workflow, workflow.initialStep);
        if (!step)
            throw new errors_js_1.WorkflowError(`initial step ${workflow.initialStep} not found`);
        const exec = {
            id: (0, util_js_1.randomId)('wfexec'),
            workflowId: workflow.id,
            currentStepId: workflow.initialStep,
            visitedSteps: [workflow.initialStep],
            outputs: {},
            status: 'running',
            startedAt: Date.now(),
        };
        let currentStep = step;
        let currentInput = initialInput;
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
    findStep(workflow, stepId) {
        return workflow.steps.find(s => s.id === stepId);
    }
    async executeStep(step, input) {
        if (!step.tool) {
            // No-op step (passthrough).
            return { success: true, output: input };
        }
        return this.tools.invoke(step.tool, step.input ?? input);
    }
    /** Abort a running execution. */
    abort(exec) {
        if (exec.status !== 'running')
            return exec;
        exec.status = 'aborted';
        exec.endedAt = Date.now();
        return exec;
    }
}
exports.WorkflowEngine = WorkflowEngine;
//# sourceMappingURL=engine.js.map