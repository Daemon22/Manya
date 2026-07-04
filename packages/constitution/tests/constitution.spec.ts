/**
 * @manya/constitution — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  // rules
  evaluateRule, evaluateRuleSet, validateRule, RULE_CATEGORIES,
  // policies
  evaluatePolicy, evaluatePolicySet, evaluateCondition,
  parseCondition, clearConditionCache,
  // permissions
  can, whoCan, grantRole, revokeRole,
  expandRoles, permissionsForRole, permissionMatches,
  validatePermissionModel, WILDCARD,
  // hierarchy
  escalationPath, findCommonAuthority, canOverride,
  ancestors, roots, children, validateHierarchy,
  // emergency
  EmergencyController, validateProcedure, STATE_RANK, STATE_ORDER,
  // safety
  SafetyChecker, validateSafetyRule, ENFORCEMENT_POINTS,
  // conflict
  ConflictResolver, validateConflict,
  RESOLUTION_STRATEGIES, CONFLICT_SEVERITIES,
  // enforce
  EnforcementEngine,
  // documents
  diffDocuments, isRatified, ratify, supersede,
  validateDocument, validateSection,
  compareVersions, formatVersion, parseVersion,
  SECTION_TYPES, DOCUMENT_STATUSES,
  // errors
  ConstitutionError, RuleError, PolicyError, PermissionError,
  HierarchyError, EmergencyError, SafetyError, ConflictError,
  EnforcementError, DocumentError,
  // logging
  shouldScrubField, scrubMetadata,
} from '../src';
import type {
  EthicalRule, GovernanceContext, PermissionModel, Policy, PolicySet,
  RuleSet, SafetyRule, GovernanceDocument,
} from '../src';

const ts = '2024-06-01T00:00:00.000Z';

function ctx(action: string, extra: Record<string, unknown> = {}): GovernanceContext {
  return { subject: 'tester', action, timestamp: ts, metadata: extra };
}

// ---------------------------------------------------------------------------
// Ethical rules
// ---------------------------------------------------------------------------

describe('ethical rules', () => {
  const harmRule: EthicalRule = {
    id: 'harm.no-physical-harm', name: 'No physical harm',
    description: 'do not harm a person', category: 'harm',
    forbidden: true, severity: 'critical',
  };
  const deceiveRule: EthicalRule = {
    id: 'deception.no-lies', name: 'No lies',
    description: 'do not deceive the user', category: 'deception',
    forbidden: true, severity: 'high',
  };
  const privacyRule: EthicalRule = {
    id: 'privacy.no-leak', name: 'No leaks',
    description: 'do not leak personal data', category: 'privacy',
    forbidden: true, severity: 'critical',
  };
  const fairnessRule: EthicalRule = {
    id: 'fairness.no-discrimination', name: 'No discrimination',
    description: 'do not discriminate by age', category: 'fairness',
    forbidden: true, severity: 'high',
  };
  const autonomyRule: EthicalRule = {
    id: 'autonomy.respect-choice', name: 'Respect choice',
    description: 'shall honor the user refusal', category: 'autonomy',
    forbidden: false, severity: 'high',
  };
  const transparencyRule: EthicalRule = {
    id: 'transparency.disclose', name: 'Disclose',
    description: 'must disclose sponsored content', category: 'transparency',
    forbidden: false, severity: 'medium',
  };

  test('each category is represented in RULE_CATEGORIES', () => {
    expect(RULE_CATEGORIES).toEqual([
      'harm', 'deception', 'privacy', 'fairness', 'autonomy', 'transparency',
    ]);
  });

  test('forbidden harm rule triggers when action matches verb', () => {
    const ev = evaluateRule(harmRule, ctx('harm the user'));
    expect(ev.violated).toBe(true);
    expect(ev.ruleId).toBe('harm.no-physical-harm');
    expect(ev.severity).toBe('critical');
  });

  test('forbidden harm rule does not trigger when verb absent', () => {
    const ev = evaluateRule(harmRule, ctx('help the user'));
    expect(ev.violated).toBe(false);
  });

  test('forbidden deception rule triggers on verb match in reason', () => {
    const ev = evaluateRule(deceiveRule, ctx('respond', { reason: 'we will deceive' }));
    expect(ev.violated).toBe(true);
  });

  test('forbidden privacy rule triggers on verb match', () => {
    const ev = evaluateRule(privacyRule, ctx('leak data'));
    expect(ev.violated).toBe(true);
  });

  test('forbidden fairness rule triggers on verb match', () => {
    const ev = evaluateRule(fairnessRule, ctx('discriminate by age'));
    expect(ev.violated).toBe(true);
  });

  test('required autonomy rule triggers when verb absent', () => {
    const ev = evaluateRule(autonomyRule, ctx('ignore user'));
    expect(ev.violated).toBe(true);
  });

  test('required autonomy rule passes when verb present', () => {
    const ev = evaluateRule(autonomyRule, ctx('honor user refusal'));
    expect(ev.violated).toBe(false);
  });

  test('required transparency rule triggers when verb absent', () => {
    const ev = evaluateRule(transparencyRule, ctx('show ads'));
    expect(ev.violated).toBe(true);
  });

  test('evaluateRuleSet returns only violated rules', () => {
    const set: RuleSet = { id: 'rs1', rules: [harmRule, autonomyRule] };
    const out = evaluateRuleSet(set, ctx('help user'));
    // harmRule passes (verb "harm" absent); autonomyRule violated (verb "honor" absent).
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe('autonomy.respect-choice');
  });

  test('validateRule accepts a well-formed rule', () => {
    expect(() => validateRule(harmRule)).not.toThrow();
  });

  test('validateRule rejects unknown category', () => {
    expect(() => validateRule({ ...harmRule, category: 'foo' as never }))
      .toThrow(RuleError);
  });

  test('evaluateRule throws on null context', () => {
    expect(() => evaluateRule(harmRule, null as never)).toThrow(RuleError);
  });
});

// ---------------------------------------------------------------------------
// Policy condition parser
// ---------------------------------------------------------------------------

describe('policy condition parser', () => {
  beforeEach(() => clearConditionCache());

  test('== with string', () => {
    expect(evaluateCondition('context.action == "read"', ctx('read'))).toBe(true);
    expect(evaluateCondition('context.action == "write"', ctx('read'))).toBe(false);
  });

  test('!= with string', () => {
    expect(evaluateCondition('context.action != "write"', ctx('read'))).toBe(true);
    expect(evaluateCondition('context.action != "read"', ctx('read'))).toBe(false);
  });

  test('in with list of strings', () => {
    expect(evaluateCondition('context.action in ["read", "list"]', ctx('read'))).toBe(true);
    expect(evaluateCondition('context.action in ["read", "list"]', ctx('write'))).toBe(false);
  });

  test('numeric comparison', () => {
    expect(evaluateCondition('context.level == 5', ctx('x', { level: 5 }))).toBe(true);
    expect(evaluateCondition('context.level == 5', ctx('x', { level: 6 }))).toBe(false);
  });

  test('boolean comparison', () => {
    expect(evaluateCondition('context.flag == true', ctx('x', { flag: true }))).toBe(true);
    expect(evaluateCondition('context.flag == false', ctx('x', { flag: true }))).toBe(false);
  });

  test('null comparison', () => {
    expect(evaluateCondition('context.x == null', ctx('x', { x: null }))).toBe(true);
    expect(evaluateCondition('context.x == null', ctx('x', { x: 1 }))).toBe(false);
  });

  test('NOT operator', () => {
    expect(evaluateCondition('NOT context.action == "read"', ctx('write'))).toBe(true);
    expect(evaluateCondition('NOT context.action == "read"', ctx('read'))).toBe(false);
  });

  test('AND operator', () => {
    const c = 'context.action == "read" AND context.resource == "db"';
    expect(evaluateCondition(c, ctx('read', { resource: 'db' }))).toBe(true);
    expect(evaluateCondition(c, ctx('read', { resource: 'file' }))).toBe(false);
  });

  test('OR operator', () => {
    const c = 'context.action == "read" OR context.action == "list"';
    expect(evaluateCondition(c, ctx('read'))).toBe(true);
    expect(evaluateCondition(c, ctx('list'))).toBe(true);
    expect(evaluateCondition(c, ctx('write'))).toBe(false);
  });

  test('AND has higher precedence than OR', () => {
    // (a == "x" AND b == "y") OR c == "z"
    const c = 'context.a == "x" AND context.b == "y" OR context.c == "z"';
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'NO', c: 'z' }))).toBe(true);
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'y', c: 'no' }))).toBe(true);
    expect(evaluateCondition(c, ctx('x', { a: 'NO', b: 'NO', c: 'no' }))).toBe(false);
  });

  test('parentheses override precedence', () => {
    // a == "x" AND (b == "y" OR c == "z")
    const c = 'context.a == "x" AND (context.b == "y" OR context.c == "z")';
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'NO', c: 'z' }))).toBe(true);
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'NO', c: 'NO' }))).toBe(false);
    expect(evaluateCondition(c, ctx('x', { a: 'NO', b: 'y', c: 'z' }))).toBe(false);
  });

  test('nested parentheses', () => {
    const c = '(context.a == "x" AND (context.b == "y" OR context.c == "z"))';
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'NO', c: 'z' }))).toBe(true);
  });

  test('NOT with parentheses', () => {
    const c = 'NOT (context.a == "x" AND context.b == "y")';
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'y' }))).toBe(false);
    expect(evaluateCondition(c, ctx('x', { a: 'x', b: 'NO' }))).toBe(true);
  });

  test('empty list literal', () => {
    expect(evaluateCondition('context.action in []', ctx('read'))).toBe(false);
  });

  test('parseCondition returns AST', () => {
    const ast = parseCondition('context.action == "read"');
    expect(ast.kind).toBe('cmp');
  });

  test('rejects unterminated string', () => {
    expect(() => parseCondition('context.action == "read')).toThrow(PolicyError);
  });

  test('rejects unexpected character', () => {
    expect(() => parseCondition('context.action @ "read"')).toThrow(PolicyError);
  });

  test('rejects missing operator after literal', () => {
    expect(() => parseCondition('"read" "write"')).toThrow(PolicyError);
  });

  test('evaluatePolicy returns matched=true when condition holds', () => {
    const p: Policy = {
      id: 'p1', name: 'allow reads', description: 'd',
      condition: 'context.action == "read"', action: 'allow', priority: 0,
    };
    const ev = evaluatePolicy(p, ctx('read'));
    expect(ev.matched).toBe(true);
    expect(ev.action).toBe('allow');
  });

  test('evaluatePolicySet returns highest-priority matching action', () => {
    const ps: PolicySet = {
      id: 'ps1',
      policies: [
        { id: 'low', name: 'low', description: 'd', condition: 'context.action == "read"', action: 'allow', priority: 1 },
        { id: 'high', name: 'high', description: 'd', condition: 'context.action == "read"', action: 'deny', priority: 10 },
        { id: 'unrelated', name: 'unrelated', description: 'd', condition: 'context.action == "write"', action: 'allow', priority: 100 },
      ],
    };
    const ev = evaluatePolicySet(ps, ctx('read'));
    expect(ev.matched).toBe(true);
    expect(ev.action).toBe('deny');
    expect(ev.policyId).toBe('high');
  });

  test('evaluatePolicySet tiebreaks by restrictiveness', () => {
    const ps: PolicySet = {
      id: 'ps2',
      policies: [
        { id: 'allow', name: 'a', description: 'd', condition: 'context.action == "read"', action: 'allow', priority: 5 },
        { id: 'deny', name: 'd', description: 'd', condition: 'context.action == "read"', action: 'deny', priority: 5 },
      ],
    };
    const ev = evaluatePolicySet(ps, ctx('read'));
    expect(ev.action).toBe('deny');
  });

  test('evaluatePolicySet defaults to allow when no policy matches', () => {
    const ps: PolicySet = {
      id: 'ps3',
      policies: [
        { id: 'p', name: 'p', description: 'd', condition: 'context.action == "write"', action: 'deny', priority: 10 },
      ],
    };
    const ev = evaluatePolicySet(ps, ctx('read'));
    expect(ev.matched).toBe(false);
    expect(ev.action).toBe('allow');
  });
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

describe('permissions', () => {
  const model: PermissionModel = {
    roles: [
      { name: 'user', permissions: ['data:read'] },
      { name: 'operator', permissions: ['data:write'], inherits: ['user'] },
      { name: 'admin', permissions: ['data:delete'], inherits: ['operator'] },
    ],
    assignments: [
      { subject: 'alice', role: 'admin' },
      { subject: 'bob', role: 'user' },
      { subject: 'carol', role: 'operator' },
    ],
  };

  test('admin inherits user and operator permissions', () => {
    expect(can(model, 'alice', 'data:read')).toBe(true);
    expect(can(model, 'alice', 'data:write')).toBe(true);
    expect(can(model, 'alice', 'data:delete')).toBe(true);
  });

  test('operator inherits user but not admin', () => {
    expect(can(model, 'carol', 'data:read')).toBe(true);
    expect(can(model, 'carol', 'data:write')).toBe(true);
    expect(can(model, 'carol', 'data:delete')).toBe(false);
  });

  test('user only has their own permissions', () => {
    expect(can(model, 'bob', 'data:read')).toBe(true);
    expect(can(model, 'bob', 'data:write')).toBe(false);
    expect(can(model, 'bob', 'data:delete')).toBe(false);
  });

  test('unknown subject has no permissions', () => {
    expect(can(model, 'nobody', 'data:read')).toBe(false);
  });

  test('wildcard permission matches everything', () => {
    const m: PermissionModel = {
      roles: [{ name: 'super', permissions: [WILDCARD] }],
      assignments: [{ subject: 'root', role: 'super' }],
    };
    expect(can(m, 'root', 'data:read')).toBe(true);
    expect(can(m, 'root', 'anything:anything')).toBe(true);
  });

  test('module wildcard matches all actions in module', () => {
    const m: PermissionModel = {
      roles: [{ name: 'r', permissions: ['data:*'] }],
      assignments: [{ subject: 's', role: 'r' }],
    };
    expect(can(m, 's', 'data:read')).toBe(true);
    expect(can(m, 's', 'data:write')).toBe(true);
    expect(can(m, 's', 'other:read')).toBe(false);
  });

  test('permissionMatches directly', () => {
    expect(permissionMatches('data:read', 'data:read')).toBe(true);
    expect(permissionMatches('data:*', 'data:read')).toBe(true);
    expect(permissionMatches('*', 'data:read')).toBe(true);
    expect(permissionMatches('data:write', 'data:read')).toBe(false);
  });

  test('whoCan returns subjects with permission (sorted)', () => {
    expect(whoCan(model, 'data:read').sort()).toEqual(['alice', 'bob', 'carol']);
    expect(whoCan(model, 'data:delete')).toEqual(['alice']);
  });

  test('grantRole adds assignment immutably', () => {
    const next = grantRole(model, 'dave', 'user');
    expect(next.assignments).not.toBe(model.assignments);
    expect(can(next, 'dave', 'data:read')).toBe(true);
    // Original model unchanged.
    expect(can(model, 'dave', 'data:read')).toBe(false);
  });

  test('grantRole is idempotent', () => {
    const next = grantRole(model, 'bob', 'user');
    expect(next.assignments).toHaveLength(model.assignments.length);
  });

  test('grantRole rejects unknown role', () => {
    expect(() => grantRole(model, 'dave', 'ghost')).toThrow(PermissionError);
  });

  test('revokeRole removes assignment immutably', () => {
    const next = revokeRole(model, 'bob', 'user');
    expect(can(next, 'bob', 'data:read')).toBe(false);
    expect(can(model, 'bob', 'data:read')).toBe(true);
  });

  test('expandRoles returns transitive set', () => {
    expect(expandRoles(model, 'admin').has('user')).toBe(true);
    expect(expandRoles(model, 'admin').has('operator')).toBe(true);
    expect(expandRoles(model, 'admin').has('admin')).toBe(true);
  });

  test('permissionsForRole includes inherited', () => {
    const p = permissionsForRole(model, 'admin');
    expect(p.has('data:read')).toBe(true);
    expect(p.has('data:write')).toBe(true);
    expect(p.has('data:delete')).toBe(true);
  });

  test('validatePermissionModel detects cycle', () => {
    const cyclic: PermissionModel = {
      roles: [
        { name: 'a', permissions: [], inherits: ['b'] },
        { name: 'b', permissions: [], inherits: ['a'] },
      ],
      assignments: [],
    };
    expect(() => validatePermissionModel(cyclic)).toThrow(PermissionError);
  });

  test('validatePermissionModel detects unknown parent', () => {
    const bad: PermissionModel = {
      roles: [{ name: 'a', permissions: [], inherits: ['ghost'] }],
      assignments: [],
    };
    expect(() => validatePermissionModel(bad)).toThrow(PermissionError);
  });

  test('validatePermissionModel detects duplicate role names', () => {
    const bad: PermissionModel = {
      roles: [
        { name: 'a', permissions: [] },
        { name: 'a', permissions: [] },
      ],
      assignments: [],
    };
    expect(() => validatePermissionModel(bad)).toThrow(PermissionError);
  });

  test('validatePermissionModel detects bad permission string', () => {
    const bad: PermissionModel = {
      roles: [{ name: 'a', permissions: ['nocolon' as never] }],
      assignments: [],
    };
    expect(() => validatePermissionModel(bad)).toThrow(PermissionError);
  });
});

// ---------------------------------------------------------------------------
// Decision hierarchy
// ---------------------------------------------------------------------------

describe('decision hierarchy', () => {
  const hierarchy = {
    nodes: [
      { id: 'board', role: 'board', authority: 100 },
      { id: 'ceo', role: 'ceo', authority: 80, parent: 'board' },
      { id: 'cto', role: 'cto', authority: 60, parent: 'ceo' },
      { id: 'eng', role: 'eng', authority: 40, parent: 'cto' },
      { id: 'eng-lead', role: 'eng-lead', authority: 50, parent: 'cto' },
      { id: 'cfo', role: 'cfo', authority: 70, parent: 'ceo' },
    ],
  };

  test('escalationPath returns leaf-to-root chain', () => {
    expect(escalationPath(hierarchy, 'eng')).toEqual(['eng', 'cto', 'ceo', 'board']);
  });

  test('escalationPath of root returns just root', () => {
    expect(escalationPath(hierarchy, 'board')).toEqual(['board']);
  });

  test('findCommonAuthority of two siblings is their parent', () => {
    expect(findCommonAuthority(hierarchy, 'eng', 'eng-lead')).toBe('cto');
  });

  test('findCommonAuthority of cousin nodes is grandparent', () => {
    expect(findCommonAuthority(hierarchy, 'eng', 'cfo')).toBe('ceo');
  });

  test('findCommonAuthority of node with itself is itself', () => {
    expect(findCommonAuthority(hierarchy, 'eng', 'eng')).toBe('eng');
  });

  test('findCommonAuthority of disjoint trees is undefined', () => {
    const forest = {
      nodes: [
        { id: 'a1', role: 'r', authority: 1 },
        { id: 'a2', role: 'r', authority: 1, parent: 'a1' },
        { id: 'b1', role: 'r', authority: 1 },
        { id: 'b2', role: 'r', authority: 1, parent: 'b1' },
      ],
    };
    expect(findCommonAuthority(forest, 'a2', 'b2')).toBeUndefined();
  });

  test('canOverride true when decider has higher authority', () => {
    expect(canOverride(hierarchy, 'ceo', 'eng')).toBe(true);
  });

  test('canOverride false when decider has lower authority', () => {
    expect(canOverride(hierarchy, 'eng', 'ceo')).toBe(false);
  });

  test('canOverride false when authorities are equal', () => {
    expect(canOverride(hierarchy, 'eng', 'eng-lead')).toBe(false);
  });

  test('ancestors returns immediate-parent-first list', () => {
    expect(ancestors(hierarchy, 'eng')).toEqual(['cto', 'ceo', 'board']);
  });

  test('roots returns nodes without parents', () => {
    expect(roots(hierarchy).map((n) => n.id)).toEqual(['board']);
  });

  test('children returns direct children', () => {
    expect(children(hierarchy, 'ceo').map((n) => n.id).sort()).toEqual(['cfo', 'cto']);
  });

  test('validateHierarchy rejects cycles', () => {
    const cyclic = {
      nodes: [
        { id: 'a', role: 'r', authority: 1, parent: 'b' },
        { id: 'b', role: 'r', authority: 1, parent: 'a' },
      ],
    };
    expect(() => validateHierarchy(cyclic)).toThrow(HierarchyError);
  });

  test('validateHierarchy rejects unknown parent', () => {
    const bad = {
      nodes: [{ id: 'a', role: 'r', authority: 1, parent: 'ghost' }],
    };
    expect(() => validateHierarchy(bad)).toThrow(HierarchyError);
  });

  test('validateHierarchy rejects duplicate ids', () => {
    const bad = {
      nodes: [
        { id: 'a', role: 'r', authority: 1 },
        { id: 'a', role: 'r', authority: 1 },
      ],
    };
    expect(() => validateHierarchy(bad)).toThrow(HierarchyError);
  });

  test('escalationPath throws on unknown node', () => {
    expect(() => escalationPath(hierarchy, 'ghost')).toThrow(HierarchyError);
  });
});

// ---------------------------------------------------------------------------
// Emergency
// ---------------------------------------------------------------------------

describe('emergency', () => {
  test('STATE_ORDER lists states least-to-most severe', () => {
    expect(STATE_ORDER).toEqual(['normal', 'heightened', 'emergency', 'critical']);
    expect(STATE_RANK.normal).toBeLessThan(STATE_RANK.critical);
  });

  test('initial state is normal and all actions allowed', () => {
    const c = new EmergencyController();
    expect(c.getState()).toBe('normal');
    expect(c.isActionAllowed('data:delete')).toBe(true);
    expect(c.getActiveProcedure()).toBeUndefined();
  });

  test('declareEmergency sets state and procedure', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'proc-h', name: 'Heightened',
      state: 'heightened',
      triggerConditions: ['threat'],
      allowedActions: ['data:read'],
      requiredApprovals: ['admin'],
      timeout: 0,
    });
    expect(c.getState()).toBe('heightened');
    expect(c.getActiveProcedure()?.id).toBe('proc-h');
    expect(c.getDeclaredAt()).toBeDefined();
  });

  test('isActionAllowed respects allowedActions', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: ['data:read'],
      requiredApprovals: [], timeout: 0,
    });
    expect(c.isActionAllowed('data:read')).toBe(true);
    expect(c.isActionAllowed('data:delete')).toBe(false);
  });

  test('isActionAllowed supports wildcards', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: ['data:*'],
      requiredApprovals: [], timeout: 0,
    });
    expect(c.isActionAllowed('data:read')).toBe(true);
    expect(c.isActionAllowed('data:write')).toBe(true);
    expect(c.isActionAllowed('user:read')).toBe(false);
  });

  test('isActionAllowed supports full wildcard', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: ['data:read'],
      requiredApprovals: [], timeout: 0,
    });
    c.declareEmergency('emergency', {
      id: 'p2', name: 'p2', state: 'emergency',
      triggerConditions: [], allowedActions: ['data:read'],
      requiredApprovals: [], timeout: 0,
    });
    c.declareEmergency('critical', {
      id: 'p3', name: 'p3', state: 'critical',
      triggerConditions: [], allowedActions: ['*'],
      requiredApprovals: [], timeout: 0,
    });
    expect(c.isActionAllowed('anything:whatever')).toBe(true);
  });

  test('liftEmergency resets to normal', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    c.liftEmergency();
    expect(c.getState()).toBe('normal');
    expect(c.getActiveProcedure()).toBeUndefined();
  });

  test('cannot escalate more than one level at a time', () => {
    const c = new EmergencyController();
    expect(() => c.declareEmergency('critical', {
      id: 'p', name: 'p', state: 'critical',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    })).toThrow(EmergencyError);
  });

  test('can de-escalate by more than one level', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p1', name: 'p1', state: 'heightened',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    c.declareEmergency('emergency', {
      id: 'p2', name: 'p2', state: 'emergency',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    c.declareEmergency('critical', {
      id: 'p3', name: 'p3', state: 'critical',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    // De-escalate from critical straight to heightened (two levels down).
    c.declareEmergency('heightened', {
      id: 'p4', name: 'p4', state: 'heightened',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    expect(c.getState()).toBe('heightened');
    c.liftEmergency();
    expect(c.getState()).toBe('normal');
  });

  test('declareEmergency rejects mismatched procedure state', () => {
    const c = new EmergencyController();
    expect(() => c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'critical',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    })).toThrow(EmergencyError);
  });

  test('declareEmergency rejects state=normal', () => {
    const c = new EmergencyController();
    expect(() => c.declareEmergency('normal', {
      id: 'p', name: 'p', state: 'normal',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    })).toThrow(EmergencyError);
  });

  test('onStateChange listener is invoked', () => {
    const c = new EmergencyController();
    const events: string[] = [];
    c.onStateChange((s) => events.push(s));
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: 0,
    });
    c.liftEmergency();
    expect(events).toEqual(['heightened', 'normal']);
  });

  test('isTimedOut reports when elapsed >= timeout', () => {
    const c = new EmergencyController();
    c.declareEmergency('heightened', {
      id: 'p', name: 'p', state: 'heightened',
      triggerConditions: [], allowedActions: [], requiredApprovals: [],
      timeout: 1000,
    });
    const declaredAt = c.getDeclaredAt()!;
    const soon = new Date(Date.parse(declaredAt) + 500).toISOString();
    const later = new Date(Date.parse(declaredAt) + 2000).toISOString();
    expect(c.isTimedOut(soon)).toBe(false);
    expect(c.isTimedOut(later)).toBe(true);
  });

  test('validateProcedure rejects invalid fields', () => {
    expect(() => validateProcedure({
      id: '', name: '', state: 'critical' as never,
      triggerConditions: [], allowedActions: [], requiredApprovals: [], timeout: -1,
    })).toThrow(EmergencyError);
  });
});

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

describe('safety', () => {
  test('ENFORCEMENT_POINTS lists all three', () => {
    expect(ENFORCEMENT_POINTS).toEqual(['pre', 'post', 'both']);
  });

  test('validateSafetyRule accepts well-formed rule', () => {
    const r: SafetyRule = {
      id: 's1', invariant: 'x > 0', enforcementPoint: 'pre', severity: 'high',
    };
    expect(() => validateSafetyRule(r)).not.toThrow();
  });

  test('validateSafetyRule rejects bad enforcement point', () => {
    const r = {
      id: 's1', invariant: 'x', enforcementPoint: 'never' as never, severity: 'high',
    };
    expect(() => validateSafetyRule(r)).toThrow(SafetyError);
  });

  test('SafetyChecker.runPre only runs pre/both rules', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'pre', invariant: 'pre-check', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: false, reason: 'pre failed' }),
    );
    checker.register(
      { id: 'post', invariant: 'post-check', enforcementPoint: 'post', severity: 'high' },
      () => ({ satisfied: false, reason: 'post failed' }),
    );
    const violations = checker.runPre(ctx('a'));
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('pre');
  });

  test('SafetyChecker.runPost only runs post/both rules', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'pre', invariant: 'pre-check', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: false, reason: 'pre failed' }),
    );
    checker.register(
      { id: 'post', invariant: 'post-check', enforcementPoint: 'post', severity: 'high' },
      () => ({ satisfied: false, reason: 'post failed' }),
    );
    const violations = checker.runPost(ctx('a'));
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe('post');
  });

  test('SafetyChecker "both" runs at pre and post', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'both', invariant: 'both-check', enforcementPoint: 'both', severity: 'high' },
      () => ({ satisfied: false, reason: 'failed' }),
    );
    expect(checker.runPre(ctx('a'))).toHaveLength(1);
    expect(checker.runPost(ctx('a'))).toHaveLength(1);
  });

  test('assertSafe throws on medium-or-higher violation', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'critical', invariant: 'inv', enforcementPoint: 'pre', severity: 'critical' },
      () => ({ satisfied: false, reason: 'boom' }),
    );
    expect(() => checker.assertSafe(ctx('a'))).toThrow(SafetyError);
  });

  test('assertSafe does not throw on low-severity violation', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'low', invariant: 'inv', enforcementPoint: 'pre', severity: 'low' },
      () => ({ satisfied: false, reason: 'advisory' }),
    );
    const out = checker.assertSafe(ctx('a'));
    expect(out).toHaveLength(1);
  });

  test('verifyInvariants runs every rule regardless of enforcement point', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'pre', invariant: 'inv', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: false, reason: 'x' }),
    );
    checker.register(
      { id: 'post', invariant: 'inv', enforcementPoint: 'post', severity: 'high' },
      () => ({ satisfied: false, reason: 'x' }),
    );
    expect(checker.verifyInvariants(ctx('a'))).toHaveLength(2);
  });

  test('predicate errors are recorded as violations', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 'throwy', invariant: 'inv', enforcementPoint: 'pre', severity: 'high' },
      () => { throw new Error('predicate blew up'); },
    );
    const out = checker.runPre(ctx('a'));
    expect(out).toHaveLength(1);
    expect(out[0].reason).toContain('predicate blew up');
  });

  test('register rejects duplicate id', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 's', invariant: 'i', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: true }),
    );
    expect(() => checker.register(
      { id: 's', invariant: 'i', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: true }),
    )).toThrow(SafetyError);
  });

  test('unregister removes a rule', () => {
    const checker = new SafetyChecker();
    checker.register(
      { id: 's', invariant: 'i', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: false }),
    );
    checker.unregister('s');
    expect(checker.list()).toHaveLength(0);
    expect(checker.get('s')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

describe('conflict resolution', () => {
  const resolver = new ConflictResolver();
  const conflict = {
    id: 'c1', parties: ['a', 'b', 'c'], description: 'who owns x',
    severity: 'medium' as const,
  };

  test('RESOLUTION_STRATEGIES lists all five', () => {
    expect(RESOLUTION_STRATEGIES).toEqual([
      'consensus', 'majority', 'authority', 'arbitration', 'escalation',
    ]);
  });

  test('CONFLICT_SEVERITIES lists all four', () => {
    expect(CONFLICT_SEVERITIES).toEqual(['low', 'medium', 'high', 'critical']);
  });

  test('consensus succeeds when all parties agree', () => {
    const r = resolver.resolveConflict(conflict, 'consensus', { agreements: ['a', 'b', 'c'] });
    expect(r.resolution).not.toContain('No consensus');
    expect(r.dissenters).toBeUndefined();
  });

  test('consensus reports dissenters', () => {
    const r = resolver.resolveConflict(conflict, 'consensus', { agreements: ['a'] });
    expect(r.dissenters).toEqual(['b', 'c']);
    expect(r.resolution).toContain('No consensus');
  });

  test('consensus requires agreements', () => {
    expect(() => resolver.resolveConflict(conflict, 'consensus'))
      .toThrow(ConflictError);
  });

  test('majority succeeds at ceil(n/2)', () => {
    const r = resolver.resolveConflict(conflict, 'majority', { agreements: ['a', 'b'] });
    expect(r.resolution).not.toContain('No majority');
  });

  test('majority fails below ceil(n/2)', () => {
    const r = resolver.resolveConflict(conflict, 'majority', { agreements: ['a'] });
    expect(r.resolution).toContain('No majority');
    expect(r.dissenters).toEqual(['b', 'c']);
  });

  test('authority picks highest-authority party', () => {
    const r = resolver.resolveConflict(conflict, 'authority', {
      authorities: { a: 10, b: 50, c: 30 },
    });
    expect(r.reason).toContain('b');
    expect(r.dissenters).toEqual(['a', 'c']);
  });

  test('authority requires authorities for every party', () => {
    expect(() => resolver.resolveConflict(conflict, 'authority', {
      authorities: { a: 10, b: 50 },
    })).toThrow(ConflictError);
  });

  test('arbitration names the arbitrator', () => {
    const r = resolver.resolveConflict(conflict, 'arbitration', {
      arbitrator: 'Azura Council',
    });
    expect(r.reason).toContain('Azura Council');
  });

  test('arbitration requires an arbitrator', () => {
    expect(() => resolver.resolveConflict(conflict, 'arbitration'))
      .toThrow(ConflictError);
  });

  test('escalation always produces an escalation resolution', () => {
    const r = resolver.resolveConflict(conflict, 'escalation');
    expect(r.resolution).toContain('Escalated');
    expect(r.strategy).toBe('escalation');
  });

  test('validateConflict rejects <2 parties', () => {
    expect(() => validateConflict({
      id: 'c', parties: ['a'], description: 'd', severity: 'low',
    })).toThrow(ConflictError);
  });

  test('validateConflict rejects duplicate parties', () => {
    expect(() => validateConflict({
      id: 'c', parties: ['a', 'a'], description: 'd', severity: 'low',
    })).toThrow(ConflictError);
  });

  test('validateConflict rejects bad severity', () => {
    expect(() => validateConflict({
      id: 'c', parties: ['a', 'b'], description: 'd',
      severity: 'catastrophic' as never,
    })).toThrow(ConflictError);
  });
});

// ---------------------------------------------------------------------------
// Enforcement engine
// ---------------------------------------------------------------------------

describe('enforcement engine', () => {
  function buildEngine() {
    const ruleSet: RuleSet = {
      id: 'ethics', rules: [
        { id: 'no-harm', name: 'no harm', description: 'do not harm',
          category: 'harm', forbidden: true, severity: 'critical' },
      ],
    };
    const policySet: PolicySet = {
      id: 'policies', policies: [
        { id: 'deny-delete', name: 'deny delete', description: 'd',
          condition: 'context.action == "data:delete"', action: 'deny', priority: 10 },
      ],
    };
    const permissionModel: PermissionModel = {
      roles: [
        { name: 'admin', permissions: ['data:*'] },
        { name: 'user', permissions: ['data:read'] },
      ],
      assignments: [
        { subject: 'alice', role: 'admin' },
        { subject: 'bob', role: 'user' },
      ],
    };
    const safety = new SafetyChecker();
    safety.register(
      { id: 'never-fail', invariant: 'always passes', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: true }),
    );

    return new EnforcementEngine()
      .registerRuleSet(ruleSet)
      .registerPolicySet(policySet)
      .registerPermissionModel(permissionModel)
      .registerSafetyChecker(safety);
  }

  test('allowed when subject has permission and no rule/policy blocks', () => {
    const engine = buildEngine();
    const r = engine.evaluate('data:read', 'alice', ctx('data:read'));
    expect(r.allowed).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.auditId).toMatch(/^audit-/);
  });

  test('denied when subject lacks permission', () => {
    const engine = buildEngine();
    const r = engine.evaluate('data:delete', 'bob', ctx('data:delete'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('permission denied'))).toBe(true);
  });

  test('denied when policy denies', () => {
    const engine = buildEngine();
    const r = engine.evaluate('data:delete', 'alice', ctx('data:delete'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('policy deny-delete denied'))).toBe(true);
  });

  test('denied when ethical rule violated', () => {
    const engine = buildEngine();
    const r = engine.evaluate('harm the user', 'alice', ctx('harm the user'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('ethical rule no-harm'))).toBe(true);
  });

  test('audit log records every evaluation', () => {
    const engine = buildEngine();
    engine.evaluate('data:read', 'alice', ctx('data:read'));
    engine.evaluate('data:delete', 'bob', ctx('data:delete'));
    const log = engine.getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].allowed).toBe(true);
    expect(log[1].allowed).toBe(false);
  });

  test('audit entry is retrievable by id', () => {
    const engine = buildEngine();
    const r = engine.evaluate('data:read', 'alice', ctx('data:read'));
    expect(engine.getAuditEntry(r.auditId)?.subject).toBe('alice');
  });

  test('clearAuditLog empties the log', () => {
    const engine = buildEngine();
    engine.evaluate('data:read', 'alice', ctx('data:read'));
    engine.clearAuditLog();
    expect(engine.getAuditLog()).toHaveLength(0);
  });

  test('getAuditLog returns defensive copies', () => {
    const engine = buildEngine();
    engine.evaluate('data:read', 'alice', ctx('data:read'));
    const a = engine.getAuditLog();
    const b = engine.getAuditLog();
    expect(a).not.toBe(b);
    expect(a[0].reasons).not.toBe(b[0].reasons);
  });

  test('evaluate rejects empty action', () => {
    const engine = buildEngine();
    expect(() => engine.evaluate('', 'alice', ctx('x'))).toThrow(EnforcementError);
  });

  test('require_approval is treated as deny by default', () => {
    const engine = new EnforcementEngine()
      .registerPolicySet({
        id: 'ps', policies: [
          { id: 'p', name: 'p', description: 'd',
            condition: 'context.action == "data:write"',
            action: 'require_approval', priority: 1 },
        ],
      });
    const r = engine.evaluate('data:write', 'alice', ctx('data:write'));
    expect(r.allowed).toBe(false);
  });

  test('require_approval can be made non-blocking', () => {
    const engine = new EnforcementEngine({ requireApprovalDenies: false })
      .registerPolicySet({
        id: 'ps', policies: [
          { id: 'p', name: 'p', description: 'd',
            condition: 'context.action == "data:write"',
            action: 'require_approval', priority: 1 },
        ],
      });
    const r = engine.evaluate('data:write', 'alice', ctx('data:write'));
    expect(r.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Governance documents
// ---------------------------------------------------------------------------

describe('governance documents', () => {
  const doc: GovernanceDocument = {
    id: 'constitution-v1', name: 'Constitution',
    version: { major: 1, minor: 0, patch: 0 },
    sections: [
      { id: 'art-1', title: 'Article 1', content: 'Preamble', type: 'preamble' },
      { id: 'art-2', title: 'Article 2', content: 'Rights', type: 'article' },
    ],
    status: 'ratified',
    ratifiedAt: '2024-01-15T00:00:00.000Z',
  };

  test('SECTION_TYPES and DOCUMENT_STATUSES are exported', () => {
    expect(SECTION_TYPES).toContain('article');
    expect(DOCUMENT_STATUSES).toContain('ratified');
  });

  test('parseVersion parses a full semver', () => {
    const v = parseVersion('1.2.3-alpha.1+build.5');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: 'alpha.1', build: 'build.5' });
  });

  test('parseVersion rejects invalid input', () => {
    expect(() => parseVersion('not-a-version')).toThrow(DocumentError);
  });

  test('formatVersion round-trips', () => {
    const v = { major: 1, minor: 2, patch: 3, prerelease: 'alpha.1' };
    expect(formatVersion(v)).toBe('1.2.3-alpha.1');
  });

  test('compareVersions orders correctly', () => {
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 1 })).toBeLessThan(0);
    expect(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBeGreaterThan(0);
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(0);
  });

  test('prerelease is lower than release', () => {
    const a = { major: 1, minor: 0, patch: 0, prerelease: 'alpha' };
    const b = { major: 1, minor: 0, patch: 0 };
    expect(compareVersions(a, b)).toBeLessThan(0);
  });

  test('isRatified returns true for ratified doc', () => {
    expect(isRatified(doc)).toBe(true);
    expect(isRatified({ ...doc, status: 'draft' })).toBe(false);
  });

  test('validateDocument accepts a well-formed doc', () => {
    expect(() => validateDocument(doc)).not.toThrow();
  });

  test('validateDocument rejects duplicate section ids', () => {
    const bad = { ...doc, sections: [...doc.sections, { ...doc.sections[0] }] };
    expect(() => validateDocument(bad)).toThrow(DocumentError);
  });

  test('validateSection rejects empty title', () => {
    expect(() => validateSection({ id: 'x', title: '', content: 'c', type: 'article' }))
      .toThrow(DocumentError);
  });

  test('validateDocument rejects ratified doc without ratifiedAt', () => {
    const bad = { ...doc, ratifiedAt: undefined };
    expect(() => validateDocument(bad)).toThrow(DocumentError);
  });

  test('ratify promotes a proposed doc', () => {
    const proposed = { ...doc, status: 'proposed' as const, ratifiedAt: undefined };
    const r = ratify(proposed, '2024-06-01T00:00:00.000Z');
    expect(r.status).toBe('ratified');
    expect(r.ratifiedAt).toBe('2024-06-01T00:00:00.000Z');
  });

  test('ratify rejects an already-ratified doc', () => {
    expect(() => ratify(doc)).toThrow(DocumentError);
  });

  test('diffDocuments reports added sections', () => {
    const newer: GovernanceDocument = {
      ...doc,
      version: { major: 1, minor: 1, patch: 0 },
      sections: [...doc.sections, { id: 'art-3', title: 'Article 3', content: 'New', type: 'article' }],
    };
    const diff = diffDocuments(doc, newer);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe('art-3');
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  test('diffDocuments reports removed sections', () => {
    const newer: GovernanceDocument = {
      ...doc,
      version: { major: 1, minor: 1, patch: 0 },
      sections: [doc.sections[0]],
    };
    const diff = diffDocuments(doc, newer);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].id).toBe('art-2');
  });

  test('diffDocuments reports changed sections', () => {
    const newer: GovernanceDocument = {
      ...doc,
      version: { major: 1, minor: 1, patch: 0 },
      sections: [
        doc.sections[0],
        { ...doc.sections[1], content: 'Rights (amended)' },
      ],
    };
    const diff = diffDocuments(doc, newer);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].id).toBe('art-2');
    expect(diff.changed[0].newSection.content).toBe('Rights (amended)');
  });

  test('supersede marks old as superseded and points to new', () => {
    const newer: GovernanceDocument = {
      ...doc,
      id: 'constitution-v2',
      version: { major: 2, minor: 0, patch: 0 },
      status: 'ratified',
      ratifiedAt: '2024-06-01T00:00:00.000Z',
    };
    const { superseded, successor } = supersede(doc, newer);
    expect(superseded.status).toBe('superseded');
    expect(superseded.supersededBy).toBe('constitution-v2');
    expect(successor.id).toBe('constitution-v2');
  });

  test('supersede rejects non-ratified old doc', () => {
    const proposed: GovernanceDocument = { ...doc, status: 'proposed', ratifiedAt: undefined };
    const newer: GovernanceDocument = { ...doc, id: 'v2', version: { major: 2, minor: 0, patch: 0 } };
    expect(() => supersede(proposed, newer)).toThrow(DocumentError);
  });

  test('supersede rejects equal-or-lower version', () => {
    const newer: GovernanceDocument = { ...doc, id: 'v2', version: { major: 1, minor: 0, patch: 0 } };
    expect(() => supersede(doc, newer)).toThrow(DocumentError);
  });
});

// ---------------------------------------------------------------------------
// Errors & logging
// ---------------------------------------------------------------------------

describe('errors and logging', () => {
  test('every error extends ConstitutionError and has stable code', () => {
    const cases: Array<[new () => ConstitutionError, string]> = [
      [RuleError as never, 'RULE_ERROR'],
      [PolicyError as never, 'POLICY_ERROR'],
      [PermissionError as never, 'PERMISSION_ERROR'],
      [HierarchyError as never, 'HIERARCHY_ERROR'],
      [EmergencyError as never, 'EMERGENCY_ERROR'],
      [SafetyError as never, 'SAFETY_ERROR'],
      [ConflictError as never, 'CONFLICT_ERROR'],
      [EnforcementError as never, 'ENFORCEMENT_ERROR'],
      [DocumentError as never, 'DOCUMENT_ERROR'],
    ];
    for (const [Ctor, code] of cases) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = new (Ctor as any)('msg');
      expect(err).toBeInstanceOf(ConstitutionError);
      expect(err.code).toBe(code);
      expect(err.message).toBe('msg');
    }
  });

  test('ConstitutionError default code is CONSTITUTION_ERROR', () => {
    const e = new ConstitutionError('boom');
    expect(e.code).toBe('CONSTITUTION_ERROR');
  });

  test('shouldScrubField and scrubMetadata', () => {
    expect(shouldScrubField('apiKey')).toBe(true);
    expect(shouldScrubField('user_apiKey')).toBe(true);
    expect(shouldScrubField('name')).toBe(false);
    const scrubbed = scrubMetadata({ name: 'a', apiKey: 'secret', nested: { token: 'x' } }) as Record<string, unknown>;
    expect(scrubbed.name).toBe('a');
    expect(scrubbed.apiKey).toBe('[redacted]');
    expect((scrubbed.nested as Record<string, unknown>).token).toBe('[redacted]');
  });
});

// ---------------------------------------------------------------------------
// End-to-end
// ---------------------------------------------------------------------------

describe('end-to-end: full constitution evaluation', () => {
  function buildConstitution() {
    const ruleSet: RuleSet = {
      id: 'ethics', rules: [
        { id: 'no-harm', name: 'No harm', description: 'do not harm a person',
          category: 'harm', forbidden: true, severity: 'critical' },
        { id: 'no-deception', name: 'No deception', description: 'do not deceive',
          category: 'deception', forbidden: true, severity: 'high' },
      ],
    };
    const policySet: PolicySet = {
      id: 'policies', policies: [
        { id: 'deny-harm', name: 'deny harm', description: 'd',
          condition: 'context.action == "harm"', action: 'deny', priority: 100 },
        { id: 'approval-delete', name: 'approval for delete', description: 'd',
          condition: 'context.action == "data:delete"',
          action: 'require_approval', priority: 10 },
      ],
    };
    const permissionModel: PermissionModel = {
      roles: [
        { name: 'user', permissions: ['data:read'] },
        { name: 'operator', permissions: ['data:write'], inherits: ['user'] },
        { name: 'admin', permissions: ['data:delete', 'data:*'], inherits: ['operator'] },
      ],
      assignments: [
        { subject: 'alice', role: 'admin' },
        { subject: 'bob', role: 'user' },
      ],
    };
    const safety = new SafetyChecker();
    safety.register(
      { id: 'always-pass', invariant: 'true', enforcementPoint: 'pre', severity: 'high' },
      () => ({ satisfied: true }),
    );

    return new EnforcementEngine()
      .registerRuleSet(ruleSet)
      .registerPolicySet(policySet)
      .registerPermissionModel(permissionModel)
      .registerSafetyChecker(safety);
  }

  test('admin reading data is allowed', () => {
    const e = buildConstitution();
    const r = e.evaluate('data:read', 'alice', ctx('data:read'));
    expect(r.allowed).toBe(true);
  });

  test('user writing data is denied (no permission)', () => {
    const e = buildConstitution();
    const r = e.evaluate('data:write', 'bob', ctx('data:write'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('permission denied'))).toBe(true);
  });

  test('admin deleting data is denied (require_approval blocks)', () => {
    const e = buildConstitution();
    const r = e.evaluate('data:delete', 'alice', ctx('data:delete'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('approval-delete'))).toBe(true);
  });

  test('harm action is denied by policy, rule, and permission', () => {
    const e = buildConstitution();
    const r = e.evaluate('harm', 'alice', ctx('harm'));
    expect(r.allowed).toBe(false);
    // Denied by policy (deny-harm) AND ethical rule (no-harm).
    expect(r.violations.some((v) => v.includes('deny-harm'))).toBe(true);
    expect(r.violations.some((v) => v.includes('no-harm'))).toBe(true);
  });

  test('deception action is denied by ethical rule', () => {
    const e = buildConstitution();
    const r = e.evaluate('deceive user', 'alice', ctx('deceive user'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('no-deception'))).toBe(true);
  });

  test('non-disclosure of sponsorship is denied by required rule', () => {
    // Build a separate engine that includes the must-disclose requirement rule.
    const ruleSet: RuleSet = {
      id: 'ethics', rules: [
        { id: 'must-disclose', name: 'Disclose',
          description: 'must disclose sponsorship',
          category: 'transparency', forbidden: false, severity: 'medium' },
      ],
    };
    const e = new EnforcementEngine().registerRuleSet(ruleSet);
    // Action does not include "disclose" → must-disclose is violated.
    const r = e.evaluate('data:read', 'alice', ctx('data:read'));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('must-disclose'))).toBe(true);
  });

  test('disclose action satisfies the must-disclose requirement rule', () => {
    const ruleSet: RuleSet = {
      id: 'ethics', rules: [
        { id: 'must-disclose', name: 'Disclose',
          description: 'must disclose sponsorship',
          category: 'transparency', forbidden: false, severity: 'medium' },
      ],
    };
    const e = new EnforcementEngine().registerRuleSet(ruleSet);
    const r = e.evaluate('disclose sponsorship', 'alice', ctx('disclose sponsorship'));
    expect(r.allowed).toBe(true);
  });

  test('all evaluations are audited', () => {
    const e = buildConstitution();
    e.evaluate('data:read', 'alice', ctx('data:read'));
    e.evaluate('harm', 'alice', ctx('harm'));
    e.evaluate('data:write', 'bob', ctx('data:write'));
    expect(e.getAuditLog()).toHaveLength(3);
  });
});
