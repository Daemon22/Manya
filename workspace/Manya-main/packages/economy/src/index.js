/**
 * Manya Economy — Tracks a shared resource budget (tokens, credits, API
 * calls — whatever unit you give it) and enforces it before work happens.
 *
 * Composes three existing Manya tools:
 *   - @manya/vault holds the current balance as an encrypted, persistent
 *     value, the same way it holds any other secret or piece of state.
 *   - @manya/ledger (itself stamp+unify) records every usage and every
 *     budget-exceeded refusal as a tamper-evident, subscribable event, so
 *     spend can be audited independently of the balance itself.
 *   - @manya/memory records the same events episodically, so an agent's
 *     own memory of "what did I spend and why" doesn't require querying
 *     the ledger separately.
 *
 * Economy does not hardcode which model or provider tiers exist — callers
 * supply their own tier map, since that's a fast-moving, deployment-specific
 * detail this package has no business guessing at.
 */

import { vault } from '@manya/vault';
import { ledger as ledgerApi } from '@manya/ledger';
import { memory } from '@manya/memory';

/**
 * Creates a new economy for an owner, with a starting balance.
 * @param {string} ownerId - Unique identifier for the economy's owner.
 * @param {object} memoryStore - A store created with @manya/memory's createMemoryStore.
 * @param {number} [startingBalance=1000000] - Starting balance in whatever unit you're tracking.
 * @returns {object} An economy instance.
 */
export function createEconomy(ownerId, memoryStore, startingBalance = 1000000) {
  if (!ownerId || typeof ownerId !== 'string') throw new Error('ownerId is required');
  if (!memoryStore || !memoryStore.ownerId) throw new Error('createEconomy requires a memory store');
  const store = vault.create(`${ownerId}-economy`);
  vault.put(store, 'balance', startingBalance);
  const economy = {
    ownerId,
    memoryStore,
    store,
    ledger: ledgerApi.create({ name: `${ownerId}-economy-ledger` }),
  };
  memory.remember(memoryStore, 'Economy', `Initialized with balance ${startingBalance}`);
  return economy;
}

/** Returns the current balance. */
export function getBalance(economy) {
  return vault.get(economy.store, 'balance');
}

/**
 * Records usage against the balance, whether or not it was pre-checked with
 * enforceBudget. Usage is recorded even if it drives the balance negative,
 * so the audit trail always reflects what actually happened.
 * @param {object} economy - The economy instance.
 * @param {string} agent - Who used the resource.
 * @param {number} amount - How much was used.
 * @returns {{ balance: number, spent: number }}
 */
export function trackUsage(economy, agent, amount) {
  if (typeof amount !== 'number' || amount < 0) throw new Error('amount must be a non-negative number');
  const balance = getBalance(economy) - amount;
  vault.put(economy.store, 'balance', balance);
  ledgerApi.record(economy.ledger, 'usage', { type: 'usage', sourceToolId: agent, payload: { amount, balance } });
  memory.remember(economy.memoryStore, agent, `Used ${amount}. Remaining balance: ${balance}.`);
  return { balance, spent: amount };
}

/**
 * Checks whether a requested amount fits within the current balance,
 * without spending anything. Records a refusal event if it doesn't fit.
 * @param {object} economy - The economy instance.
 * @param {number} amountRequested - The amount that would be needed.
 * @returns {boolean} True if the balance can cover the request.
 */
export function enforceBudget(economy, amountRequested) {
  const balance = getBalance(economy);
  if (amountRequested > balance) {
    ledgerApi.record(economy.ledger, 'budget-exceeded', {
      type: 'budget-exceeded',
      sourceToolId: economy.ownerId,
      payload: { amountRequested, balance },
    });
    memory.remember(economy.memoryStore, 'Economy', `Blocked action requiring ${amountRequested}, balance is ${balance}.`);
    return false;
  }
  return true;
}

/**
 * Picks a tier for a task's complexity from a caller-supplied tier map,
 * instead of hardcoding specific provider/model names that would go stale.
 * @param {object} economy - The economy instance.
 * @param {'low'|'medium'|'high'} complexity - The task's complexity.
 * @param {{low: string, medium: string, high: string}} tierMap - Caller-supplied tier names.
 * @returns {string} The selected tier.
 */
export function routeTier(economy, complexity, tierMap) {
  if (!tierMap || !tierMap[complexity]) {
    throw new Error(`No tier configured for complexity "${complexity}"`);
  }
  const tier = tierMap[complexity];
  memory.remember(economy.memoryStore, 'Economy', `Routed ${complexity}-complexity task to tier ${tier}.`);
  return tier;
}

/** Verifies the economy's usage ledger has not been tampered with. */
export function verifyLedger(economy) {
  return ledgerApi.verify(economy.ledger);
}

export const economy = {
  createEconomy,
  getBalance,
  trackUsage,
  enforceBudget,
  routeTier,
  verifyLedger,
};

export default economy;
