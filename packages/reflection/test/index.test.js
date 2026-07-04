import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { memory } from '@manya/memory';
import { cortex as cortexApi, createCortex } from '@manya/cortex';
import { _resetMesh } from '@manya/unify';
import { reflection } from '../src/index.js';

beforeEach(() => {
  _resetMesh();
});

function setup() {
  const store = memory.createMemoryStore('ara');
  const cortex = createCortex(store);
  return { store, cortex, refl: reflection.createReflection(store, cortex) };
}

test('evaluateAgainstIntent passes when output shares concepts with the intent', () => {
  const { refl } = setup();
  const result = reflection.evaluateAgainstIntent(refl, 'schedule a dentist appointment', 'Booked a dentist appointment for Tuesday.');
  assert.equal(result.passes, true);
  assert.ok(result.matchedConcepts.includes('dentist'));
});

test('evaluateAgainstIntent fails when output is unrelated', () => {
  const { refl } = setup();
  const result = reflection.evaluateAgainstIntent(refl, 'schedule a dentist appointment', 'The weather today is sunny and warm.');
  assert.equal(result.passes, false);
});

test('critiquePlan flags low-confidence plans', () => {
  const { refl, cortex } = setup();
  const planResult = cortexApi.plan(cortex, 'figure out the weekend trip');
  const { critiques, lowConfidence } = reflection.critiquePlan(refl, planResult);
  assert.equal(critiques.length, planResult.steps.length + (lowConfidence ? 1 : 0));
  assert.equal(lowConfidence, planResult.confidence < 0.5);
});

test('learnFromFailure records a lesson and produces a revised plan', () => {
  const { refl, store } = setup();
  const { lesson, revisedPlan } = reflection.learnFromFailure(refl, 'derive a key', 'no passphrase was provided');

  assert.match(lesson, /no passphrase was provided/);
  const fact = memory.recallFact(store, 'failure_lesson:derive a key');
  assert.ok(fact);
  assert.equal(fact.fact, lesson);
  assert.ok(revisedPlan.intent);
});
