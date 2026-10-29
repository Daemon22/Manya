/**
 * @manya/constitution — operational policies.
 *
 * A `Policy` pairs a `condition` expression with an `action` and a `priority`.
 * The condition language is a small, safe subset of boolean logic with
 * equality/inequality/membership operators:
 *
 *   - `context.field == value`
 *   - `context.field != value`
 *   - `context.field in [a, b, c]`
 *   - `NOT <expr>`
 *   - `<expr> AND <expr>`
 *   - `<expr> OR <expr>`
 *   - parentheses for grouping
 *
 * Values can be strings (single- or double-quoted), numbers, `true`, `false`,
 * and `null`. Field paths support a single dot (`context.<field>`); nested
 * paths like `context.foo.bar` are supported by walking the metadata object.
 *
 * The parser is a hand-written recursive-descent parser that produces a plain
 * AST (no `eval`), so the language is sandboxed.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type {
  GovernanceContext, Policy, PolicyAction, PolicyEvaluation, PolicySet,
} from '../types.js';
import { PolicyError } from '../errors.js';

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType =
  | 'IDENT'      // context.<field> (we keep the full dotted form)
  | 'STRING'
  | 'NUMBER'
  | 'TRUE'
  | 'FALSE'
  | 'NULL'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'IN'
  | 'EQ'         // ==
  | 'NEQ'        // !=
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS: Record<string, TokenType> = {
  and: 'AND',
  or: 'OR',
  not: 'NOT',
  in: 'IN',
  true: 'TRUE',
  false: 'FALSE',
  null: 'NULL',
};

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    // whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
    // operators
    if (ch === '=' && src[i + 1] === '=') { out.push({ type: 'EQ', value: '==', pos: i }); i += 2; continue; }
    if (ch === '!' && src[i + 1] === '=') { out.push({ type: 'NEQ', value: '!=', pos: i }); i += 2; continue; }
    if (ch === '(') { out.push({ type: 'LPAREN', value: '(', pos: i }); i++; continue; }
    if (ch === ')') { out.push({ type: 'RPAREN', value: ')', pos: i }); i++; continue; }
    if (ch === '[') { out.push({ type: 'LBRACKET', value: '[', pos: i }); i++; continue; }
    if (ch === ']') { out.push({ type: 'RBRACKET', value: ']', pos: i }); i++; continue; }
    if (ch === ',') { out.push({ type: 'COMMA', value: ',', pos: i }); i++; continue; }
    // strings
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i++;
      let buf = '';
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < n) {
          buf += src[i + 1];
          i += 2;
        } else {
          buf += src[i];
          i++;
        }
      }
      if (i >= n) throw new PolicyError(`unterminated string literal at position ${start}`);
      i++; // closing quote
      out.push({ type: 'STRING', value: buf, pos: start });
      continue;
    }
    // numbers
    if (ch >= '0' && ch <= '9') {
      const start = i;
      let num = '';
      while (i < n && ((src[i] >= '0' && src[i] <= '9') || src[i] === '.')) {
        num += src[i];
        i++;
      }
      out.push({ type: 'NUMBER', value: num, pos: start });
      continue;
    }
    // identifiers and keywords; support dotted form `context.field.subfield`
    if (isIdentStart(ch)) {
      const start = i;
      let ident = '';
      while (i < n && isIdentPart(src[i])) {
        ident += src[i];
        i++;
      }
      // allow dotted access
      while (i < n && src[i] === '.' && i + 1 < n && isIdentStart(src[i + 1])) {
        ident += '.';
        i++;
        while (i < n && isIdentPart(src[i])) {
          ident += src[i];
          i++;
        }
      }
      const lower = ident.toLowerCase();
      if (KEYWORDS[lower] && !ident.includes('.')) {
        out.push({ type: KEYWORDS[lower], value: ident, pos: start });
      } else {
        out.push({ type: 'IDENT', value: ident, pos: start });
      }
      continue;
    }
    throw new PolicyError(`unexpected character '${ch}' at position ${i}`);
  }
  out.push({ type: 'EOF', value: '', pos: i });
  return out;
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}
function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type AstNode =
  | { kind: 'and'; left: AstNode; right: AstNode }
  | { kind: 'or'; left: AstNode; right: AstNode }
  | { kind: 'not'; operand: AstNode }
  | { kind: 'cmp'; op: '==' | '!=' | 'in'; left: AstNode; right: AstNode }
  | { kind: 'field'; path: string[] }
  | { kind: 'literal'; value: unknown }
  | { kind: 'list'; items: unknown[] };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }
  private expect(type: TokenType): Token {
    const t = this.next();
    if (t.type !== type) {
      throw new PolicyError(`expected ${type} but got ${t.type} ('${t.value}') at position ${t.pos}`);
    }
    return t;
  }

  parse(): AstNode {
    const node = this.parseOr();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new PolicyError(`unexpected token '${t.value}' at position ${t.pos}`);
    }
    return node;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek().type === 'OR') {
      this.next();
      const right = this.parseAnd();
      left = { kind: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.peek().type === 'AND') {
      this.next();
      const right = this.parseNot();
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseNot(): AstNode {
    if (this.peek().type === 'NOT') {
      this.next();
      const operand = this.parseNot();
      return { kind: 'not', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const t = this.peek();
    if (t.type === 'LPAREN') {
      this.next();
      const node = this.parseOr();
      this.expect('RPAREN');
      return node;
    }
    // Otherwise, must be a comparison: operand OP operand
    return this.parseComparison();
  }

  private parseComparison(): AstNode {
    const left = this.parseOperand();
    const opTok = this.peek();
    if (opTok.type === 'EQ' || opTok.type === 'NEQ' || opTok.type === 'IN') {
      this.next();
      const right = this.parseOperand();
      const op: '==' | '!=' | 'in' = opTok.type === 'EQ' ? '==' : opTok.type === 'NEQ' ? '!=' : 'in';
      return { kind: 'cmp', op, left, right };
    }
    // Bare operand (no operator) — treat as boolean truthiness of the field.
    // This is only allowed when the operand is a field; otherwise it's an error.
    if (left.kind === 'field') {
      // Synthesize `field == true` semantics: evaluate truthiness of the field value.
      return { kind: 'cmp', op: '==', left, right: { kind: 'literal', value: true } };
    }
    throw new PolicyError(`expected operator after operand at position ${opTok.pos}`);
  }

  private parseOperand(): AstNode {
    const t = this.next();
    switch (t.type) {
      case 'IDENT':
        return this.parseField(t.value);
      case 'STRING':
        return { kind: 'literal', value: t.value };
      case 'NUMBER':
        return { kind: 'literal', value: parseNumber(t.value) };
      case 'TRUE':
        return { kind: 'literal', value: true };
      case 'FALSE':
        return { kind: 'literal', value: false };
      case 'NULL':
        return { kind: 'literal', value: null };
      case 'LBRACKET':
        return this.parseList();
      default:
        throw new PolicyError(`unexpected token '${t.value}' at position ${t.pos}`);
    }
  }

  private parseField(value: string): AstNode {
    // Strip leading `context.` if present (it is the conventional root).
    const path = value.split('.');
    if (path[0] === 'context') path.shift();
    if (path.length === 0) {
      throw new PolicyError(`invalid field reference '${value}'`);
    }
    return { kind: 'field', path };
  }

  private parseList(): AstNode {
    const items: unknown[] = [];
    if (this.peek().type === 'RBRACKET') {
      this.next();
      return { kind: 'list', items };
    }
    for (;;) {
      const t = this.next();
      switch (t.type) {
        case 'STRING': items.push(t.value); break;
        case 'NUMBER': items.push(parseNumber(t.value)); break;
        case 'TRUE': items.push(true); break;
        case 'FALSE': items.push(false); break;
        case 'NULL': items.push(null); break;
        default:
          throw new PolicyError(`invalid list element '${t.value}' at position ${t.pos}`);
      }
      if (this.peek().type === 'COMMA') { this.next(); continue; }
      break;
    }
    this.expect('RBRACKET');
    return { kind: 'list', items };
  }
}

function parseNumber(s: string): number {
  const n = Number(s);
  if (Number.isNaN(n)) throw new PolicyError(`invalid number literal '${s}'`);
  return n;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Resolves a dotted field path against a `GovernanceContext`. The path's first
 * segment may name a top-level GovernanceContext field (`subject`, `action`,
 * `resource`, `timestamp`). When that field is set, it is used; when it is
 * undefined (e.g. `resource` was not provided), the lookup falls back to
 * `metadata.<root>`. Paths whose root is not a top-level field are looked up
 * entirely in `metadata`.
 */
function lookupField(path: string[], context: GovernanceContext): unknown {
  const root = path[0];
  const TOP_LEVEL = new Set(['subject', 'action', 'resource', 'timestamp']);
  let cur: unknown;
  if (TOP_LEVEL.has(root)) {
    const topVal = (context as unknown as Record<string, unknown>)[root];
    if (topVal !== undefined) {
      cur = topVal;
    } else if (context.metadata && typeof context.metadata === 'object') {
      cur = (context.metadata as Record<string, unknown>)[root];
    } else {
      cur = undefined;
    }
  } else if (context.metadata && typeof context.metadata === 'object') {
    cur = (context.metadata as Record<string, unknown>)[root];
  } else {
    cur = undefined;
  }
  // Walk remaining path segments.
  for (let i = 1; i < path.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[path[i]];
  }
  return cur;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) {
    // Allow number/number coercion only when both are numbers.
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    // Allow string/number loose comparison? We are strict here.
    return false;
  }
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(
    (a as Record<string, unknown>)[k],
    (b as Record<string, unknown>)[k],
  ));
}

function evaluate(node: AstNode, context: GovernanceContext): unknown {
  switch (node.kind) {
    case 'and':
      return Boolean(evaluate(node.left, context)) && Boolean(evaluate(node.right, context));
    case 'or':
      return Boolean(evaluate(node.left, context)) || Boolean(evaluate(node.right, context));
    case 'not':
      return !Boolean(evaluate(node.operand, context));
    case 'cmp': {
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);
      switch (node.op) {
        case '==': return deepEqual(left, right);
        case '!=': return !deepEqual(left, right);
        case 'in': {
          if (!Array.isArray(right)) {
            throw new PolicyError('`in` operator requires a list on the right-hand side');
          }
          return right.some((v) => deepEqual(left, v));
        }
        default:
          throw new PolicyError(`unknown operator ${(node as { op: string }).op}`);
      }
    }
    case 'field':
      return lookupField(node.path, context);
    case 'literal':
      return node.value;
    case 'list':
      return node.items;
    default:
      throw new PolicyError(`unknown AST node kind ${(node as { kind: string }).kind}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Cache of parsed conditions, keyed by source string. Weakness: unbounded. */
const parseCache = new Map<string, AstNode>();

/**
 * Parses a condition expression into an AST. Results are cached by source
 * string for performance. Throws `PolicyError` on syntax errors.
 */
export function parseCondition(condition: string): AstNode {
  if (typeof condition !== 'string' || condition.length === 0) {
    throw new PolicyError('condition must be a non-empty string');
  }
  const cached = parseCache.get(condition);
  if (cached) return cached;
  const tokens = tokenize(condition);
  const ast = new Parser(tokens).parse();
  parseCache.set(condition, ast);
  return ast;
}

/** Clears the condition-parse cache (useful in tests). */
export function clearConditionCache(): void {
  parseCache.clear();
}

/** Evaluates a condition against a context. */
export function evaluateCondition(condition: string, context: GovernanceContext): boolean {
  const ast = parseCondition(condition);
  return Boolean(evaluate(ast, context));
}

/** Evaluates a single policy. Returns `matched: true` when the condition holds. */
export function evaluatePolicy(policy: Policy, context: GovernanceContext): PolicyEvaluation {
  if (!policy || typeof policy !== 'object') {
    throw new PolicyError('policy must be a non-null object');
  }
  if (typeof policy.id !== 'string' || policy.id.length === 0) {
    throw new PolicyError('policy.id must be a non-empty string');
  }
  const matched = evaluateCondition(policy.condition, context);
  return {
    matched,
    action: policy.action,
    reason: matched
      ? `condition "${policy.condition}" matched`
      : `condition "${policy.condition}" did not match`,
    policyId: policy.id,
  };
}

/**
 * Evaluates a policy set against `context` and returns the action of the
 * highest-priority matching policy. If multiple policies match at the same
 * priority, the most restrictive wins (deny > require_approval > allow). If
 * no policy matches, returns `{ matched: false, action: 'allow' }` (default
 * allow when no policy applies).
 */
export function evaluatePolicySet(
  policies: PolicySet,
  context: GovernanceContext,
): PolicyEvaluation {
  if (!policies || !Array.isArray(policies.policies)) {
    throw new PolicyError('policies.policies must be an array');
  }
  let best: { policy: Policy; eval_: PolicyEvaluation } | undefined;
  for (const p of policies.policies) {
    const ev = evaluatePolicy(p, context);
    if (!ev.matched) continue;
    if (!best || p.priority > best.policy.priority) {
      best = { policy: p, eval_: ev };
      continue;
    }
    if (p.priority === best.policy.priority) {
      // Tiebreak by restrictiveness.
      const rank: Record<PolicyAction, number> = { allow: 0, require_approval: 1, deny: 2 };
      if (rank[p.action] > rank[best.policy.action]) {
        best = { policy: p, eval_: ev };
      }
    }
  }
  if (!best) {
    return {
      matched: false,
      action: 'allow',
      reason: 'no matching policy; defaulting to allow',
      policyId: '',
    };
  }
  return best.eval_;
}
