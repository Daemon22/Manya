"use strict";
/**
 * @manya-os/customs-shield — sanctions screening.
 *
 * Implements name-based fuzzy matching against a sanctions list. The list
 * is configurable via `setSanctionsList`. A small built-in list of
 * country-level sanctions is provided as a starting point.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COUNTRY_SANCTIONS = void 0;
exports.setSanctionsList = setSanctionsList;
exports.getSanctionsList = getSanctionsList;
exports.normalizeName = normalizeName;
exports.levenshtein = levenshtein;
exports.similarity = similarity;
exports.screenParty = screenParty;
exports.screenParties = screenParties;
const errors_js_1 = require("../errors.js");
/** Built-in country-level sanctions (subset — production deployments must load the full list). */
exports.DEFAULT_COUNTRY_SANCTIONS = [
    { list: 'OFAC', name: 'Cuba', sanctionedCountry: 'CU', program: 'Cuban Assets Control Regulations' },
    { list: 'OFAC', name: 'Iran', sanctionedCountry: 'IR', program: 'Iranian Transactions and Sanctions Regulations' },
    { list: 'OFAC', name: 'North Korea', sanctionedCountry: 'KP', program: 'North Korea Sanctions Policy' },
    { list: 'OFAC', name: 'Syria', sanctionedCountry: 'SY', program: 'Syrian Civilian Protection' },
    { list: 'EU', name: 'Russia', sanctionedCountry: 'RU', program: 'EU Sanctions Regulation 833/2014' },
    { list: 'EU', name: 'Belarus', sanctionedCountry: 'BY', program: 'EU Belarus Sanctions' },
    { list: 'UN', name: 'Sudan', sanctionedCountry: 'SD', program: 'UN Security Council Resolution 1591' },
    { list: 'UK', name: 'Myanmar', sanctionedCountry: 'MM', program: 'UK Myanmar Sanctions' },
];
let globalSanctionsList = [...exports.DEFAULT_COUNTRY_SANCTIONS];
/** Replace the global sanctions list. */
function setSanctionsList(list) {
    if (!Array.isArray(list))
        throw new errors_js_1.SanctionsError('Sanctions list must be an array');
    globalSanctionsList = list;
}
/** Get the global sanctions list. */
function getSanctionsList() {
    return globalSanctionsList;
}
/** Normalize a name for matching — uppercase, strip punctuation, collapse spaces. */
function normalizeName(name) {
    if (typeof name !== 'string')
        return '';
    return name.toUpperCase()
        .replace(/[''`-]/g, '') // remove apostrophes/hyphens (they're part of names)
        .replace(/[^A-Z0-9\s]/g, ' ') // replace other punctuation with space
        .replace(/\s+/g, ' ')
        .trim();
}
/** Levenshtein distance — for fuzzy matching. */
function levenshtein(a, b) {
    if (a === b)
        return 0;
    if (a.length === 0)
        return b.length;
    if (b.length === 0)
        return a.length;
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++)
        prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[b.length];
}
/** Similarity ratio in [0,1] based on Levenshtein. */
function similarity(a, b) {
    const na = normalizeName(a);
    const nb = normalizeName(b);
    if (na.length === 0 && nb.length === 0)
        return 1;
    const d = levenshtein(na, nb);
    return 1 - d / Math.max(na.length, nb.length);
}
/** Screen a single party against the sanctions list. */
function screenParty(party, threshold = 0.75) {
    if (!party)
        throw new errors_js_1.SanctionsError('screenParty: party is required');
    const hits = [];
    const namesToCheck = [party.name, ...(party.aliases ?? [])];
    for (const entry of globalSanctionsList) {
        // Country-level sanctions — direct country match.
        if (entry.sanctionedCountry && entry.sanctionedCountry === party.country) {
            hits.push({ entry, confidence: 1.0, matchType: 'exact', matchBasis: 'country' });
            continue;
        }
        // Name match (against entry.name + entry.aliases).
        const entryNames = [entry.name, ...(entry.aliases ?? [])];
        let bestSim = 0;
        let bestType = 'fuzzy';
        for (const candidate of namesToCheck) {
            for (const entryName of entryNames) {
                const sim = similarity(candidate, entryName);
                if (sim === 1) {
                    bestSim = 1;
                    bestType = 'exact';
                    break;
                }
                if (sim > bestSim) {
                    bestSim = sim;
                    bestType = sim >= 0.95 ? 'exact' : sim >= 0.85 ? 'partial' : 'fuzzy';
                }
            }
            if (bestSim === 1)
                break;
        }
        if (bestSim >= threshold) {
            hits.push({ entry, confidence: bestSim, matchType: bestType, matchBasis: 'name' });
        }
    }
    return { party, hits };
}
/** Screen multiple parties and return findings. */
function screenParties(parties, threshold = 0.75) {
    const findings = [];
    for (const p of parties) {
        const result = screenParty(p, threshold);
        for (const h of result.hits) {
            let category;
            let severity;
            if (h.matchBasis === 'country') {
                category = 'sanctions_country_hit';
                severity = 'critical';
            }
            else {
                category = 'sanctions_hit';
                severity = h.matchType === 'exact' ? 'critical' : h.matchType === 'partial' ? 'high' : 'medium';
            }
            findings.push({
                category,
                severity,
                message: `Potential sanctions match: party '${p.name}' (${p.country}) matches '${h.entry.name}' on ${h.entry.list} list (${h.entry.program ?? 'n/a'}) — basis: ${h.matchBasis}`,
                ref: p.name,
                remediation: 'Verify identity; if confirmed, halt transaction and file blocking report.',
                confidence: h.confidence,
            });
        }
    }
    return findings;
}
//# sourceMappingURL=screener.js.map