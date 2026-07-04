/**
 * Manya Perception — Ingests signals from the outside world into working
 * memory, without leaking sensitive content into that memory unfiltered.
 *
 * Composes three existing Manya tools:
 *   - @manya/lens classifies and redacts what's being perceived before it
 *     ever touches memory, so a perceived credit-card number doesn't sit in
 *     plaintext working memory.
 *   - @manya/hawk supplies environmental/device context (what kind of
 *     device, what capabilities) as a distinct perception channel.
 *   - @manya/memory is where all of it lands, as short-lived working
 *     context plus an episodic record that perception happened.
 */

import { memory } from '@manya/memory';
import { lens } from '@manya/lens';
import { hawk } from '@manya/hawk';

/**
 * Creates a perception instance bound to a memory store.
 * @param {object} memoryStore - A store created with @manya/memory's createMemoryStore.
 * @returns {object} A perception instance.
 */
export function createPerception(memoryStore) {
  if (!memoryStore || !memoryStore.ownerId) {
    throw new Error('createPerception requires a memory store');
  }
  return { memoryStore };
}

/**
 * Ingests raw text: redacts sensitive content, classifies its sensitivity,
 * and stores the redacted result as working memory.
 * @param {object} perception - The perception instance.
 * @param {string} source - Where this text came from (a channel, device, or agent id).
 * @param {string} rawText - The raw perceived text.
 * @param {object} [options] - Ingestion options.
 * @param {number} [options.ttlMs=300000] - How long the working memory entry lives.
 * @param {string[]} [options.redactRules=['pii']] - Which lens redaction rules to apply.
 * @returns {{ stored: string, redactionCount: number, found: Array<object>, sensitivity: object }}
 */
export function ingestText(perception, source, rawText, options = {}) {
  if (!source || typeof source !== 'string') throw new Error('source is required');
  if (typeof rawText !== 'string') throw new Error('rawText must be a string');

  const ttlMs = options.ttlMs ?? 300000;
  const rules = options.redactRules || ['pii'];
  const cleanText = rawText.replace(/\s+/g, ' ').trim();

  const { redacted, count, found } = lens.redact(cleanText, { rules });
  const sensitivity = cleanText.length > 0 ? lens.classify(cleanText) : { level: 'public', score: 0 };

  memory.rememberWorking(perception.memoryStore, `perception:text:${source}`, redacted, ttlMs);
  memory.remember(perception.memoryStore, 'Perception', `Ingested text from ${source}`, {
    redactionCount: count,
    sensitivityLevel: sensitivity.level,
  });

  return { stored: redacted, redactionCount: count, found, sensitivity };
}

/**
 * Ingests structured (JSON-serializable) data into working memory.
 * @param {object} perception - The perception instance.
 * @param {string} source - Where the data came from.
 * @param {object} data - The structured data.
 * @param {number} [ttlMs=300000] - How long the working memory entry lives.
 * @returns {boolean} True on success, false if the data could not be serialized.
 */
export function ingestStructured(perception, source, data, ttlMs = 300000) {
  if (!source || typeof source !== 'string') throw new Error('source is required');
  try {
    const serialized = JSON.parse(JSON.stringify(data));
    memory.rememberWorking(perception.memoryStore, `perception:data:${source}`, serialized, ttlMs);
    memory.remember(perception.memoryStore, 'Perception', `Ingested structured data from ${source}`);
    return true;
  } catch {
    memory.remember(perception.memoryStore, 'Perception', `Failed to parse structured data from ${source}`);
    return false;
  }
}

/**
 * Perceives the current environment (device/capabilities) and stores it as
 * short-lived working context, distinct from perceived text or data.
 * @param {object} perception - The perception instance.
 * @param {object} [env=globalThis] - Environment to inspect.
 * @param {number} [ttlMs=10000] - How long the snapshot lives in working memory.
 * @returns {object} The environment snapshot.
 */
export function perceiveEnvironment(perception, env = globalThis, ttlMs = 10000) {
  const snapshot = hawk.snapshot(env);
  memory.rememberWorking(perception.memoryStore, 'perception:environment', snapshot, ttlMs);
  memory.remember(perception.memoryStore, 'Perception', 'Perceived current environment', {
    deviceType: snapshot.device?.type,
  });
  return snapshot;
}

export const perception = {
  createPerception,
  ingestText,
  ingestStructured,
  perceiveEnvironment,
};

export default perception;
