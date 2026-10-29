/**
 * @manya-os/anonymize — context-based detectors for person names, addresses,
 * health conditions, medications.
 *
 * These detectors use contextual cues (honorifics, labels, medical terms)
 * rather than external NER models. They are conservative and tuned for
 * precision over recall. Plug-in your own model-backed detector by
 * implementing the {@link Detector} interface.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Finding, PIICategory, PHICategory } from '../types.js';
import type { Detector, DetectorConfig } from './registry.js';
import { makeFinding } from './registry.js';

interface ContextConfig extends DetectorConfig {
  /** Custom name allowlist (lowercased). */
  nameAllowlist?: string[];
  /** Custom term dictionaries. */
  healthTerms?: string[];
  medicationTerms?: string[];
}

// ---- Person names (via honorifics) ----
const HONORIFICS = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev', 'Hon', 'Sir', 'Madam', 'Mx', 'Lady', 'Lord'];
const NAME_PART = /[A-Z][a-z]{1,}(?:[-'][A-Z][a-z]{1,})?/;

export const personNameDetector: Detector<ContextConfig> = {
  name: 'person_name',
  categories: ['person_name'],
  defaultConfig: { minConfidence: 0.65, enabled: true },
  detect(input: string, config?: Partial<ContextConfig>): Finding[] {
    const out: Finding[] = [];
    const allow = new Set((config?.nameAllowlist ?? []).map(s => s.toLowerCase()));
    // Pattern: "Mr. John Smith" / "Dr Sarah O'Connor"
    const re = new RegExp(`\\b(${HONORIFICS.join('|')})\\.?\\s+((?:${NAME_PART.source}\\s+){0,2}${NAME_PART.source})`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const nameText = m[2];
      if (allow.has(nameText.toLowerCase())) continue;
      const start = m.index + m[0].length - nameText.length;
      const f = makeFinding(input, start, start + nameText.length, 'person_name', 0.75, 'person_name');
      if (f) out.push(f);
    }
    return out;
  },
};

// ---- Physical addresses (street + number heuristic) ----
const STREET_SUFFIXES = ['Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Dr', 'Lane', 'Ln', 'Boulevard', 'Blvd', 'Court', 'Ct', 'Way', 'Place', 'Pl', 'Square', 'Sq'];
export const addressDetector: Detector<ContextConfig> = {
  name: 'physical_address',
  categories: ['physical_address'],
  defaultConfig: { minConfidence: 0.6, enabled: true },
  detect(input: string): Finding[] {
    const out: Finding[] = [];
    const re = new RegExp(`\\b\\d{1,6}[A-Z]?\\s+[A-Z][A-Za-z0-9.']+\\s+(?:${STREET_SUFFIXES.join('|')})\\b\\.?`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      const f = makeFinding(input, m.index, m.index + m[0].length, 'physical_address', 0.65, 'physical_address');
      if (f) out.push(f);
    }
    return out;
  },
};

// ---- Health conditions (dictionary-based PHI) ----
const DEFAULT_HEALTH_TERMS = [
  'HIV', 'AIDS', 'diabetes', 'hypertension', 'asthma', 'cancer', 'tumor', 'tumour',
  'depression', 'anxiety', 'bipolar', 'schizophrenia', 'epilepsy', 'stroke',
  'myocardial infarction', 'heart attack', 'arthritis', 'dementia', 'Alzheimer',
  'pregnancy', 'miscarriage', 'abortion', 'infertility', 'STD', 'STI',
  'hepatitis', 'tuberculosis', 'malaria', 'COVID', 'COVID-19',
];

export const healthConditionDetector: Detector<ContextConfig> = {
  name: 'health_condition',
  categories: ['health_condition', 'phi_diagnosis'],
  defaultConfig: { minConfidence: 0.7, enabled: true },
  detect(input: string, config?: Partial<ContextConfig>): Finding[] {
    const out: Finding[] = [];
    const terms = config?.healthTerms ?? DEFAULT_HEALTH_TERMS;
    for (const term of terms) {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(input)) !== null) {
        const f = makeFinding(input, m.index, m.index + m[0].length, 'health_condition', 0.78, 'health_condition');
        if (f) out.push(f);
      }
    }
    return out;
  },
};

// ---- Medications ----
const DEFAULT_MEDICATION_TERMS = [
  'paracetamol', 'ibuprofen', 'aspirin', 'amoxicillin', 'azithromycin',
  'metformin', 'insulin', 'atorvastatin', 'lisinopril', 'amlodipine',
  'omeprazole', 'citalopram', 'sertraline', 'fluoxetine', 'diazepam',
  'morphine', 'fentanyl', 'oxycodone', 'tramadol', 'warfarin',
];

export const medicationDetector: Detector<ContextConfig> = {
  name: 'medication',
  categories: ['medication', 'phi_medication'],
  defaultConfig: { minConfidence: 0.7, enabled: true },
  detect(input: string, config?: Partial<ContextConfig>): Finding[] {
    const out: Finding[] = [];
    const terms = config?.medicationTerms ?? DEFAULT_MEDICATION_TERMS;
    for (const term of terms) {
      const re = new RegExp(`\\b${term}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(input)) !== null) {
        const f = makeFinding(input, m.index, m.index + m[0].length, 'medication', 0.78, 'medication');
        if (f) out.push(f);
      }
    }
    return out;
  },
};

// ---- Provider / facility PHI ----
const DEFAULT_PROVIDER_TERMS = [
  'Dr.', 'Physician', 'Surgeon', 'Nurse', 'Clinic', 'Hospital',
  'Ward', 'Emergency Room', 'ICU', 'Pharmacy',
];
export const providerDetector: Detector<ContextConfig> = {
  name: 'phi_provider',
  categories: ['phi_provider', 'phi_facility'],
  defaultConfig: { minConfidence: 0.6, enabled: true },
  detect(input: string): Finding[] {
    const out: Finding[] = [];
    for (const term of DEFAULT_PROVIDER_TERMS) {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(input)) !== null) {
        const cat: PHICategory = term === 'Dr.' || term === 'Physician' || term === 'Surgeon' || term === 'Nurse' ? 'phi_provider' : 'phi_facility';
        const f = makeFinding(input, m.index, m.index + m[0].length, cat, 0.6, 'phi_provider');
        if (f) out.push(f);
      }
    }
    return out;
  },
};

export const ALL_CONTEXT_DETECTORS: Detector[] = [
  personNameDetector,
  addressDetector,
  healthConditionDetector,
  medicationDetector,
  providerDetector,
];
