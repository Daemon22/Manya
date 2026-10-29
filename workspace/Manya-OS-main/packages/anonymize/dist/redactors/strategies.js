"use strict";
/**
 * @manya-os/anonymize — redaction strategies.
 *
 * A redactor transforms a finding into a replacement string. Strategies
 * differ in reversibility, determinism, and readability.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthesizeRedactor = exports.GeneralizeRedactor = exports.FullRedactor = exports.TokenRedactor = exports.HashRedactor = exports.MaskRedactor = void 0;
exports.applyRedactions = applyRedactions;
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
/** Mask: keep first/last char, replace middle with asterisks. */
class MaskRedactor {
    strategy = 'mask';
    redact(finding) {
        const t = finding.text;
        if (t.length <= 2)
            return '*'.repeat(t.length);
        if (t.length <= 6)
            return t[0] + '*'.repeat(t.length - 2) + t[t.length - 1];
        return t.slice(0, 2) + '*'.repeat(Math.min(t.length - 4, 8)) + t.slice(-2);
    }
}
exports.MaskRedactor = MaskRedactor;
/** Hash: deterministic SHA-256 of the finding text (truncated). */
class HashRedactor {
    prefix;
    length;
    strategy = 'hash';
    constructor(prefix = 'sha256', length = 12) {
        this.prefix = prefix;
        this.length = length;
        if (length < 4 || length > 64)
            throw new errors_js_1.RedactionError('HashRedactor.length must be in [4,64]');
    }
    redact(finding) {
        const h = (0, crypto_1.createHash)('sha256').update(finding.text).digest('hex');
        return `[${this.prefix}:${h.slice(0, this.length)}]`;
    }
}
exports.HashRedactor = HashRedactor;
/** Token: reversible pseudonym with a per-category counter. */
class TokenRedactor {
    prefixTemplate;
    strategy = 'token';
    counters = new Map();
    mapping = new Map();
    constructor(prefixTemplate = (c) => c.toUpperCase()) {
        this.prefixTemplate = prefixTemplate;
    }
    redact(finding) {
        const cached = this.mapping.get(finding.text);
        if (cached)
            return cached;
        const n = (this.counters.get(finding.category) ?? 0) + 1;
        this.counters.set(finding.category, n);
        const token = `[${this.prefixTemplate(finding.category)}_${String(n).padStart(3, '0')}]`;
        this.mapping.set(finding.text, token);
        return token;
    }
    /** Return the original→token map (for de-identification logs only). */
    getMapping() { return this.mapping; }
}
exports.TokenRedactor = TokenRedactor;
/** Redact: full replacement with `[REDACTED]`. */
class FullRedactor {
    replacement;
    strategy = 'redact';
    constructor(replacement = '[REDACTED]') {
        this.replacement = replacement;
    }
    redact() { return this.replacement; }
}
exports.FullRedactor = FullRedactor;
/** Generalize: coarse-grain numeric values (e.g. age → age band). */
class GeneralizeRedactor {
    strategy = 'generalize';
    redact(finding) {
        const num = parseInt(finding.text, 10);
        if (!Number.isNaN(num)) {
            if (finding.category === 'date_of_birth' || finding.category === 'phi_age') {
                const band = Math.floor(num / 10) * 10;
                return `[age:${band}-${band + 9}]`;
            }
            return `[num:${Math.floor(num / 10) * 10}+]`;
        }
        return '[generalized]';
    }
}
exports.GeneralizeRedactor = GeneralizeRedactor;
/** Synthesize: replace with a format-preserving fake. */
class SynthesizeRedactor {
    strategy = 'synthesize';
    redact(finding) {
        switch (finding.category) {
            case 'email_address':
                return `user${Math.floor(Math.random() * 9999)}@example.com`;
            case 'phone_number':
                return `+1-555-01${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
            case 'credit_card':
                return '4111-1111-1111-1111';
            case 'ip_address':
                return `10.0.0.${Math.floor(Math.random() * 254) + 1}`;
            case 'person_name':
                return ['Alex Sample', 'Sam Test', 'Pat Example', 'Jordan Demo'][Math.floor(Math.random() * 4)];
            default:
                return '[synthesized]';
        }
    }
}
exports.SynthesizeRedactor = SynthesizeRedactor;
/** Apply a sequence of redactions to the input. */
function applyRedactions(input, findings, redactorFor) {
    // Sort descending by start so we can patch the string from end→beginning
    // without invalidating later offsets.
    const ordered = [...findings].sort((a, b) => b.start - a.start);
    let out = input;
    const redactions = [];
    for (const f of ordered) {
        const r = redactorFor(f);
        const replacement = r.redact(f);
        out = out.slice(0, f.start) + replacement + out.slice(f.end);
        redactions.push({ finding: f, replacement, strategy: r.strategy });
    }
    redactions.reverse();
    return { output: out, redactions };
}
//# sourceMappingURL=strategies.js.map