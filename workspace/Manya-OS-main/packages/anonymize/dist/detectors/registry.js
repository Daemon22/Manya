"use strict";
/**
 * @manya-os/anonymize — detector registry and base interfaces.
 *
 * A detector scans an input string and returns zero or more {@link Finding}
 * objects. Detectors are pure functions of (input, config) — no I/O, no
 * global state, no side effects.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectorRegistry = void 0;
exports.severityFor = severityFor;
exports.makeFinding = makeFinding;
exports.resolveOverlaps = resolveOverlaps;
const errors_js_1 = require("../errors.js");
/** Helper: assign a severity by category. */
function severityFor(category) {
    switch (category) {
        case 'national_id':
        case 'passport_number':
        case 'drivers_license':
        case 'credit_card':
        case 'bank_account':
        case 'password':
        case 'api_key':
        case 'jwt_token':
        case 'medical_record_number':
        case 'phi_diagnosis':
        case 'phi_medication':
        case 'phi_procedure':
            return 'critical';
        case 'person_name':
        case 'email_address':
        case 'phone_number':
        case 'physical_address':
        case 'date_of_birth':
        case 'health_condition':
        case 'medication':
        case 'religion':
        case 'ethnicity':
        case 'sexual_orientation':
        case 'political_affiliation':
        case 'phi_provider':
        case 'phi_facility':
            return 'high';
        case 'ip_address':
        case 'mac_address':
        case 'url':
        case 'username':
        case 'user_id':
        case 'device_id':
        case 'phi_dates':
        case 'phi_age':
        case 'phi_device':
            return 'medium';
        default:
            return 'low';
    }
}
/** Helper: produce a finding with normalized fields. */
function makeFinding(input, start, end, category, confidence, detectorName) {
    if (start < 0 || end <= start || end > input.length)
        return null;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
        return null;
    return {
        start,
        end,
        text: input.slice(start, end),
        category,
        confidence,
        severity: severityFor(category),
        detector: detectorName,
    };
}
/** Registry of all detectors. */
class DetectorRegistry {
    detectors = new Map();
    register(detector) {
        if (this.detectors.has(detector.name)) {
            throw new errors_js_1.DetectorError(`Detector '${detector.name}' already registered`);
        }
        this.detectors.set(detector.name, detector);
    }
    get(name) {
        return this.detectors.get(name);
    }
    list() {
        return Array.from(this.detectors.values());
    }
    /** Run all enabled detectors and merge their findings. */
    runAll(input, perDetectorConfig, minConfidence = 0.5) {
        const all = [];
        for (const det of this.detectors.values()) {
            const merged = { ...det.defaultConfig, ...(perDetectorConfig?.[det.name] ?? {}) };
            if (merged.enabled === false)
                continue;
            const findings = det.detect(input, merged);
            for (const f of findings) {
                if (f.confidence >= (merged.minConfidence ?? minConfidence))
                    all.push(f);
            }
        }
        return all;
    }
}
exports.DetectorRegistry = DetectorRegistry;
/** Resolve overlapping findings — keep highest-confidence, break ties by longest span. */
function resolveOverlaps(findings) {
    if (findings.length === 0)
        return [];
    const sorted = [...findings].sort((a, b) => a.start - b.start || b.confidence - a.confidence);
    const out = [];
    for (const f of sorted) {
        const last = out[out.length - 1];
        if (last && f.start < last.end) {
            // overlap — keep the higher confidence; on tie, keep the longer span.
            if (f.confidence > last.confidence ||
                (f.confidence === last.confidence && (f.end - f.start) > (last.end - last.start))) {
                out[out.length - 1] = f;
            }
        }
        else {
            out.push(f);
        }
    }
    return out;
}
//# sourceMappingURL=registry.js.map