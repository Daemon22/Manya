/**
 * @manya-os/cortex — typed error hierarchy tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  CortexError,
  DecompositionError,
  PlanningError,
  ToolError,
  RoutingError,
  SchedulerError,
  ConfidenceError,
  GoalError,
  ResourceError,
  WorkflowError,
  RetryError,
  CoordinationError,
} from '../src';

describe('CortexError', () => {
  test('is an Error subclass', () => {
    const err = new CortexError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CortexError);
  });

  test('sets name to class name', () => {
    const err = new CortexError('msg');
    expect(err.name).toBe('CortexError');
  });

  test('sets code to class name by default', () => {
    const err = new CortexError('msg');
    expect(err.code).toBe('CortexError');
  });

  test('accepts custom code', () => {
    const err = new CortexError('msg', 'CUSTOM_CODE');
    expect(err.code).toBe('CUSTOM_CODE');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new CortexError('msg', undefined, cause);
    expect(err.cause).toBe(cause);
  });

  test('cause is undefined when not provided', () => {
    const err = new CortexError('msg');
    expect(err.cause).toBeUndefined();
  });
});

describe('DecompositionError', () => {
  test('is a CortexError', () => {
    const err = new DecompositionError('bad input');
    expect(err).toBeInstanceOf(CortexError);
    expect(err).toBeInstanceOf(DecompositionError);
    expect(err.name).toBe('DecompositionError');
    expect(err.code).toBe('DECOMPOSITION_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new DecompositionError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('PlanningError', () => {
  test('is a CortexError', () => {
    const err = new PlanningError('cycle');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('PlanningError');
    expect(err.code).toBe('PLANNING_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new PlanningError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('ToolError', () => {
  test('is a CortexError', () => {
    const err = new ToolError('not found');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('ToolError');
    expect(err.code).toBe('TOOL_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new ToolError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('RoutingError', () => {
  test('is a CortexError', () => {
    const err = new RoutingError('no input');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('RoutingError');
    expect(err.code).toBe('ROUTING_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new RoutingError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('SchedulerError', () => {
  test('is a CortexError', () => {
    const err = new SchedulerError('dep missing');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('SchedulerError');
    expect(err.code).toBe('SCHEDULER_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new SchedulerError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('ConfidenceError', () => {
  test('is a CortexError', () => {
    const err = new ConfidenceError('no factors');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('ConfidenceError');
    expect(err.code).toBe('CONFIDENCE_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new ConfidenceError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('GoalError', () => {
  test('is a CortexError', () => {
    const err = new GoalError('not found');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('GoalError');
    expect(err.code).toBe('GOAL_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new GoalError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('ResourceError', () => {
  test('is a CortexError', () => {
    const err = new ResourceError('exceeded');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('ResourceError');
    expect(err.code).toBe('RESOURCE_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new ResourceError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('WorkflowError', () => {
  test('is a CortexError', () => {
    const err = new WorkflowError('step missing');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('WorkflowError');
    expect(err.code).toBe('WORKFLOW_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new WorkflowError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('RetryError', () => {
  test('is a CortexError', () => {
    const err = new RetryError('exhausted');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('RetryError');
    expect(err.code).toBe('RETRY_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new RetryError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('CoordinationError', () => {
  test('is a CortexError', () => {
    const err = new CoordinationError('plan required');
    expect(err).toBeInstanceOf(CortexError);
    expect(err.name).toBe('CoordinationError');
    expect(err.code).toBe('COORDINATION_ERROR');
  });

  test('preserves cause', () => {
    const cause = new Error('root');
    const err = new CoordinationError('msg', cause);
    expect(err.cause).toBe(cause);
  });
});
