import type { MemoryStore } from '@manya/memory';

export interface Economy {
  ownerId: string;
  memoryStore: MemoryStore;
  store: object;
  ledger: object;
}

export function createEconomy(ownerId: string, memoryStore: MemoryStore, startingBalance?: number): Economy;
export function getBalance(economy: Economy): number;
export function trackUsage(economy: Economy, agent: string, amount: number): { balance: number; spent: number };
export function enforceBudget(economy: Economy, amountRequested: number): boolean;
export function routeTier(
  economy: Economy,
  complexity: 'low' | 'medium' | 'high',
  tierMap: { low: string; medium: string; high: string }
): string;
export function verifyLedger(economy: Economy): { valid: boolean; brokenAt: number | null; errors: string[] };

export const economy: {
  createEconomy: typeof createEconomy;
  getBalance: typeof getBalance;
  trackUsage: typeof trackUsage;
  enforceBudget: typeof enforceBudget;
  routeTier: typeof routeTier;
  verifyLedger: typeof verifyLedger;
};

export default economy;
