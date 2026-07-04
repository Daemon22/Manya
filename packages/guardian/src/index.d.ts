export interface Guardian {
  ownerId: string;
  constitution: object;
  policy: object;
  ledger: object;
}

export function createGuardian(ownerId: string): Guardian;

export function setPrinciple(
  guardian: Guardian,
  key: string,
  value: unknown,
  options?: { tags?: string[]; metadata?: object }
): { key: string; createdAt: string; updatedAt: string; tags: string[]; metadata: object };

export function getPrinciple(guardian: Guardian, key: string): unknown;

export function grantRole(
  guardian: Guardian,
  subjectId: string,
  roleName: string,
  permissions: Array<{ resource: string; actions: string[] }>
): void;

export function checkAction(
  guardian: Guardian,
  subjectId: string,
  resource: string,
  action: string,
  context?: object
): { allowed: boolean; reason?: string; matchedRules: object[] };

export function verifyAuditTrail(
  guardian: Guardian
): { valid: boolean; brokenAt: number | null; errors: string[] };

export const guardian: {
  createGuardian: typeof createGuardian;
  setPrinciple: typeof setPrinciple;
  getPrinciple: typeof getPrinciple;
  grantRole: typeof grantRole;
  checkAction: typeof checkAction;
  verifyAuditTrail: typeof verifyAuditTrail;
};

export default guardian;
