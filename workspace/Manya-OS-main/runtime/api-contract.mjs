/**
 * @manya-os/runtime — API contract for the HTTP operating surface.
 *
 * Declares the request/response contracts for the runtime's operating
 * endpoints using @manya-os/contracts. Every body-taking endpoint is
 * validated against its `requestSchema` (via `validateRequest`) before the
 * operation executes. Response schemas document the expected output shape.
 */

import { compileSchema } from '@manya-os/contracts';

const reasonRequestSchema = compileSchema({
  name: 'ReasonRequest',
  version: '1.0.0',
  description: 'Body for POST /api/reason — an objective the cortex decomposes, plans, and executes.',
  fields: {
    description: { type: 'string' },
    options: {
      type: 'object',
      required: false,
      fields: {
        priority: { type: 'number', required: false },
        deadline: { type: 'number', required: false },
      },
    },
  },
});

const reasonResponseSchema = compileSchema({
  name: 'ReasonResponse',
  version: '1.0.0',
  description: 'Result of POST /api/reason — executed goal and plan plus memory id and operational summary.',
  fields: {
    goal: { type: 'object' },
    plan: { type: 'object' },
    events: { type: 'array', of: { type: 'object' } },
    memoryId: { type: 'string' },
    summary: {
      type: 'object',
      fields: {
        goal: { type: 'string' },
        status: { type: 'string' },
        tasks: { type: 'number' },
        completed: { type: 'boolean' },
        confidence: { type: 'number' },
        memoryId: { type: 'string' },
      },
    },
  },
});

const rememberRequestSchema = compileSchema({
  name: 'RememberRequest',
  version: '1.0.0',
  description: 'Body for POST /api/memory/remember — an episodic event to record and index.',
  fields: {
    event: { type: 'string' },
    agent: { type: 'string', required: false },
    context: { type: 'object', required: false },
    options: { type: 'object', required: false },
  },
});

const rememberResponseSchema = compileSchema({
  name: 'RememberResponse',
  version: '1.0.0',
  fields: {
    id: { type: 'string' },
  },
});

const publishRequestSchema = compileSchema({
  name: 'PublishRequest',
  version: '1.0.0',
  description: 'Body for POST /api/events/publish — a nervous-system event to emit.',
  fields: {
    topic: { type: 'string' },
    source: { type: 'string', required: false },
    payload: { type: 'object', required: false },
  },
});

const publishResponseSchema = compileSchema({
  name: 'PublishResponse',
  version: '1.0.0',
  fields: {
    event: { type: 'object' },
    delivered: { type: 'boolean' },
  },
});

const bridgePublishRequestSchema = compileSchema({
  name: 'BridgePublishRequest',
  version: '1.0.0',
  description: 'Body for POST /api/bridge/publish — an event forwarded onto the Manya wire.',
  fields: {
    topic: { type: 'string' },
    type: { type: 'string', required: false },
    source: { type: 'string', required: false },
    payload: { type: 'object', required: false },
  },
});

const bridgePublishResponseSchema = compileSchema({
  name: 'BridgePublishResponse',
  version: '1.0.0',
  fields: {
    topic: { type: 'string' },
    delivered: { type: 'boolean' },
  },
});

/**
 * The runtime API contract. Only the operating (body-taking) endpoints are
 * listed; validation is applied where a request body must satisfy a schema.
 */
export const RUNTIME_API_CONTRACT = {
  name: 'manya-os-runtime-api',
  version: '1.0.0',
  description: 'Contracts for the Manya-OS runtime HTTP operating surface.',
  endpoints: [
    {
      method: 'POST',
      path: '/api/reason',
      description: 'Decompose, plan, and execute an objective; record the outcome in memory; emit signals.',
      requestSchema: reasonRequestSchema,
      responseSchema: reasonResponseSchema,
    },
    {
      method: 'POST',
      path: '/api/memory/remember',
      description: 'Record and index an episodic memory event.',
      requestSchema: rememberRequestSchema,
      responseSchema: rememberResponseSchema,
    },
    {
      method: 'POST',
      path: '/api/events/publish',
      description: 'Publish a nervous-system event.',
      requestSchema: publishRequestSchema,
      responseSchema: publishResponseSchema,
    },
    {
      method: 'POST',
      path: '/api/bridge/publish',
      description: 'Forward an event onto the Manya wire through the federation bridge.',
      requestSchema: bridgePublishRequestSchema,
      responseSchema: bridgePublishResponseSchema,
    },
  ],
};