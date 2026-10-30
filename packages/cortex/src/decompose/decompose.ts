/**
 * @manya-os/cortex — task decomposition.
 *
 * Breaks a high-level goal description into actionable sub-tasks using
 * heuristics (conjunctions, action verbs, sequencing cues).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Task } from '../types.js';
import { DecompositionError } from '../errors.js';
import { randomId } from '../util.js';

/** Heuristic action verbs that signal task boundaries. */
const ACTION_VERBS = [
  'fetch', 'load', 'read', 'write', 'send', 'receive', 'parse', 'validate',
  'compute', 'calculate', 'transform', 'filter', 'sort', 'merge', 'split',
  'create', 'delete', 'update', 'find', 'search', 'query', 'authenticate',
  'authorize', 'encrypt', 'decrypt', 'sign', 'verify', 'publish', 'subscribe',
  'start', 'stop', 'restart', 'deploy', 'rollback', 'monitor', 'alert',
];

/** Conjunctions that signal multiple sub-tasks. */
const CONJUNCTIONS = [' and ', ', then ', '; ', ' after that ', ' followed by '];

/**
 * Decompose a goal description into sub-tasks.
 * Returns an array of Task objects (without ids assigned by caller).
 */
export function decompose(goalDescription: string, opts?: { goalId?: string }): Task[] {
  if (!goalDescription || typeof goalDescription !== 'string') {
    throw new DecompositionError('goalDescription must be a non-empty string');
  }
  const tasks: Task[] = [];

  // 1. Split on conjunctions.
  const parts = splitOnConjunctions(goalDescription);

  // 2. For each part, identify the action verb and required tools.
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    const verb = findActionVerb(part);
    const tools = inferTools(part, verb);
    const task: Task = {
      id: randomId('task'),
      goalId: opts?.goalId,
      description: part,
      requiredTools: tools,
      status: 'pending',
      createdAt: Date.now(),
      dependsOn: i > 0 ? [tasks[i - 1].id] : [],
    };
    tasks.push(task);
  }

  // 3. If no decomposition happened, return a single task wrapping the whole goal.
  if (tasks.length === 0) {
    tasks.push({
      id: randomId('task'),
      goalId: opts?.goalId,
      description: goalDescription,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  return tasks;
}

/** Split a description on conjunctions. */
function splitOnConjunctions(text: string): string[] {
  let parts = [text];
  for (const conj of CONJUNCTIONS) {
    const next: string[] = [];
    for (const p of parts) next.push(...p.split(conj));
    parts = next;
  }
  return parts.map(p => p.trim()).filter(Boolean);
}

/** Find the first action verb in a description. */
function findActionVerb(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const v of ACTION_VERBS) {
    const re = new RegExp(`\\b${v}\\b`);
    if (re.test(lower)) return v;
  }
  return undefined;
}

/** Infer required tools from text + verb. */
function inferTools(text: string, verb?: string): string[] {
  const tools = new Set<string>();
  if (verb) tools.add(verb);
  const lower = text.toLowerCase();
  if (/\bfile|filesystem|path\b/.test(lower)) tools.add('fs');
  if (/\bhttp|api|endpoint|url\b/.test(lower)) tools.add('http');
  if (/\bdb|database|sql|query\b/.test(lower)) tools.add('db');
  if (/\bmemory|recall|remember\b/.test(lower)) tools.add('memory');
  if (/\bsign|verify|encrypt|decrypt\b/.test(lower)) tools.add('crypto');
  if (/\bsend|receive|publish|broadcast\b/.test(lower)) tools.add('messaging');
  return Array.from(tools);
}

/** Estimate the depth of decomposition needed (1 = simple, 3 = complex). */
export function estimateComplexity(goalDescription: string): number {
  const lower = goalDescription.toLowerCase();
  let depth = 1;
  for (const conj of CONJUNCTIONS) {
    if (lower.includes(conj)) depth++;
  }
  if (lower.includes(' if ') || lower.includes(' when ')) depth++;
  if (lower.includes(' for each ') || lower.includes(' all ')) depth++;
  return Math.min(5, depth);
}
