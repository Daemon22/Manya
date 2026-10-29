"use strict";
/**
 * @manya-os/anonymize — pattern-based detectors (regex-backed).
 *
 * Each detector is intentionally narrow and conservative. False positives
 * are minimized by requiring word boundaries and contextual cues.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PATTERN_DETECTORS = exports.zaIdDetector = exports.usSsnDetector = exports.postalCodeDetector = exports.isoDateDetector = exports.apiKeyDetector = exports.jwtDetector = exports.ibanDetector = exports.creditCardDetector = exports.urlDetector = exports.macDetector = exports.ipv6Detector = exports.ipv4Detector = exports.phoneDetector = exports.emailDetector = void 0;
exports.luhnValid = luhnValid;
exports.zaIdChecksumValid = zaIdChecksumValid;
const registry_js_1 = require("./registry.js");
/** Build a regex detector. */
function regexDetector(name, category, pattern, confidence) {
    return {
        name,
        categories: [category],
        defaultConfig: { minConfidence: 0.5, enabled: true },
        detect(input, config) {
            const out = [];
            const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
            let m;
            while ((m = re.exec(input)) !== null) {
                if (m.index === m.index + m[0].length) {
                    re.lastIndex++;
                    continue;
                }
                const f = (0, registry_js_1.makeFinding)(input, m.index, m.index + m[0].length, category, confidence, name);
                if (f)
                    out.push(f);
            }
            return out;
        },
    };
}
// ---- Email ----
exports.emailDetector = regexDetector('email', 'email_address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 0.95);
// ---- Phone numbers (international, conservative) ----
exports.phoneDetector = regexDetector('phone', 'phone_number', /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}(?:[\s.-]?\d{1,4})?\b/g, 0.7);
// ---- IPv4 ----
exports.ipv4Detector = regexDetector('ipv4', 'ip_address', /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, 0.95);
// ---- IPv6 (simplified) ----
exports.ipv6Detector = regexDetector('ipv6', 'ip_address', /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi, 0.6);
// ---- MAC address ----
exports.macDetector = regexDetector('mac', 'mac_address', /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi, 0.95);
// ---- URL ----
exports.urlDetector = regexDetector('url', 'url', /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.;,!?)]/gi, 0.9);
// ---- Credit card (Luhn-validated) ----
exports.creditCardDetector = {
    name: 'credit_card',
    categories: ['credit_card'],
    defaultConfig: { minConfidence: 0.8, enabled: true },
    detect(input) {
        const out = [];
        const re = /\b(?:\d[ -]*?){13,19}\b/g;
        let m;
        while ((m = re.exec(input)) !== null) {
            // Strip non-digit chars (spaces, dashes) before Luhn check.
            const digits = m[0].replace(/[^\d]/g, '');
            if (digits.length < 13 || digits.length > 19)
                continue;
            if (!luhnValid(digits))
                continue;
            const f = (0, registry_js_1.makeFinding)(input, m.index, m.index + m[0].length, 'credit_card', 0.92, 'credit_card');
            if (f)
                out.push(f);
        }
        return out;
    },
};
/** Luhn checksum. */
function luhnValid(digits) {
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = digits.charCodeAt(i) - 48;
        if (alt) {
            n *= 2;
            if (n > 9)
                n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum > 0 && sum % 10 === 0;
}
// ---- IBAN (simplified) ----
exports.ibanDetector = regexDetector('iban', 'bank_account', /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{1,4}){4,8}\b/g, 0.85);
// ---- JWT ----
exports.jwtDetector = regexDetector('jwt', 'jwt_token', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 0.95);
// ---- API key (generic 32+ char base64-ish) ----
exports.apiKeyDetector = regexDetector('api_key', 'api_key', /\b(?:sk|pk|api[_-]?key|key)[_:-][A-Za-z0-9]{24,}\b/gi, 0.75);
// ---- ISO dates (YYYY-MM-DD) ----
exports.isoDateDetector = regexDetector('iso_date', 'date', /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g, 0.7);
// ---- Postal codes (US ZIP, UK, CA) ----
exports.postalCodeDetector = regexDetector('postal_code', 'postal_code', /\b(?:\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/g, 0.6);
// ---- SSN (US) — flagged as national_id ----
exports.usSsnDetector = regexDetector('us_ssn', 'national_id', /\b\d{3}-\d{2}-\d{4}\b/g, 0.9);
// ---- South African ID (13 digits, includes DOB) ----
exports.zaIdDetector = {
    name: 'za_id',
    categories: ['national_id'],
    defaultConfig: { minConfidence: 0.9, enabled: true },
    detect(input) {
        const out = [];
        const re = /\b(\d{2})(\d{2})(\d{2})(\d{4})(\d)(\d{2})\b/g;
        let m;
        while ((m = re.exec(input)) !== null) {
            const yy = parseInt(m[1], 10);
            const mm = parseInt(m[2], 10);
            const dd = parseInt(m[3], 10);
            if (mm < 1 || mm > 12)
                continue;
            if (dd < 1 || dd > 31)
                continue;
            // Validate SA-ID checksum
            if (!zaIdChecksumValid(m[0]))
                continue;
            const f = (0, registry_js_1.makeFinding)(input, m.index, m.index + m[0].length, 'national_id', 0.95, 'za_id');
            if (f)
                out.push(f);
        }
        return out;
    },
};
/** South African ID number checksum (Luhn-like over 13 digits). */
function zaIdChecksumValid(id) {
    if (!/^\d{13}$/.test(id))
        return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const n = parseInt(id[i], 10);
        sum += (i % 2 === 0) ? n : (n * 2 > 9 ? n * 2 - 9 : n * 2);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(id[12], 10);
}
exports.ALL_PATTERN_DETECTORS = [
    exports.emailDetector,
    exports.phoneDetector,
    exports.ipv4Detector,
    exports.ipv6Detector,
    exports.macDetector,
    exports.urlDetector,
    exports.creditCardDetector,
    exports.ibanDetector,
    exports.jwtDetector,
    exports.apiKeyDetector,
    exports.isoDateDetector,
    exports.postalCodeDetector,
    exports.usSsnDetector,
    exports.zaIdDetector,
];
//# sourceMappingURL=patterns.js.map