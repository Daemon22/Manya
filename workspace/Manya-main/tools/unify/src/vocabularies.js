/**
 * Manya Unify — Vocabularies: cross-domain translation maps.
 *
 * Bridges the vocabularies of different Manya tools: HS codes (transport)
 * ↔ industries (pulse), UN/LOCODEs (transport) ↔ countries, industries ↔
 * primary sectors / research domains, and capability identifiers ↔ tool ids.
 */

import { capabilityOwners } from '@manya/toolkit';

/**
 * Maps HS code chapter (first 2 digits) to a Pulse industry identifier.
 * Based on WCO Harmonized System section-to-industry conventions.
 */
const HS_CHAPTER_TO_INDUSTRY = {
  '01': 'agriculture', '02': 'agriculture', '03': 'agriculture', '04': 'agriculture',
  '05': 'agriculture', '06': 'agriculture', '07': 'agriculture', '08': 'agriculture',
  '09': 'agriculture', '10': 'agriculture', '11': 'agriculture', '12': 'agriculture',
  '13': 'agriculture', '14': 'agriculture', '15': 'agriculture', '16': 'agriculture',
  '17': 'agriculture', '18': 'agriculture', '19': 'agriculture', '20': 'agriculture',
  '21': 'agriculture', '22': 'agriculture', '23': 'agriculture', '24': 'agriculture',
  '25': 'mining', '26': 'mining', '27': 'mining',
  '28': 'finance', '29': 'finance', '30': 'healthcare', '31': 'agriculture',
  '32': 'finance', '33': 'healthcare', '34': 'finance', '35': 'finance',
  '36': 'finance', '37': 'healthcare', '38': 'finance',
  '39': 'retail', '40': 'retail', '41': 'retail', '42': 'retail', '43': 'agriculture',
  '44': 'agriculture', '45': 'agriculture', '46': 'agriculture',
  '47': 'retail', '48': 'retail', '49': 'legal',
  '50': 'retail', '51': 'retail', '52': 'retail', '53': 'retail', '54': 'retail',
  '55': 'retail', '56': 'retail', '57': 'retail', '58': 'retail', '59': 'retail',
  '60': 'retail', '61': 'retail', '62': 'retail', '63': 'retail',
  '64': 'retail', '65': 'retail', '66': 'retail', '67': 'retail',
  '68': 'retail', '69': 'retail', '70': 'retail', '71': 'finance',
  '72': 'mining', '73': 'mining', '74': 'mining', '75': 'mining', '76': 'mining',
  '78': 'mining', '79': 'mining', '80': 'mining', '81': 'mining', '82': 'mining', '83': 'mining',
  '84': 'iot', '85': 'iot', '86': 'energy', '87': 'retail',
  '88': 'iot', '89': 'energy', '90': 'healthcare', '91': 'retail', '92': 'gaming',
  '93': 'government', '94': 'retail', '95': 'gaming', '96': 'retail', '97': 'gaming',
  '98': 'government', '99': 'government',
};

/**
 * Maps UN/LOCODE country prefix (first 2 chars) to ISO 3166-1 alpha-2 country code.
 * (Trivially the same in UN/LOCODE — but explicit mapping documents the convention.)
 */
const UNLOCODE_PREFIX_TO_COUNTRY = {
  // Sample of common prefixes; full UN/LOCODE list is 250+ entries
  ZA: 'ZA', US: 'US', GB: 'GB', DE: 'DE', FR: 'FR', NL: 'NL', CN: 'CN', JP: 'JP',
  IN: 'IN', BR: 'BR', AU: 'AU', CA: 'CA', IT: 'IT', ES: 'ES', SG: 'SG', AE: 'AE',
  RU: 'RU', KR: 'KR', MX: 'MX', SA: 'SA', EG: 'EG', NG: 'NG', KE: 'KE', GH: 'GH',
};

/**
 * Maps Pulse industry ids to one or more Primary Sector / Research Domain / Transport Mode equivalents.
 */
const INDUSTRY_TO_DOMAINS = {
  healthcare: { sector: null, research: 'life_sciences', mode: null },
  finance: { sector: null, research: null, mode: null },
  legal: { sector: null, research: 'social_sciences', mode: null },
  iot: { sector: null, research: 'computational_sciences', mode: null },
  government: { sector: null, research: 'social_sciences', mode: null },
  education: { sector: null, research: null, mode: null },
  retail: { sector: null, research: null, mode: null },
  energy: { sector: 'mining', research: 'physical_sciences', mode: null },
  telecom: { sector: null, research: 'computational_sciences', mode: null },
  gaming: { sector: null, research: 'computational_sciences', mode: null },
};

/**
 * Maps Primary Sector ids to Pulse industries they fall under.
 */
const SECTOR_TO_INDUSTRY = {
  agriculture: 'agriculture',
  mining: 'energy',
  forestry: 'agriculture',
  fishing: 'agriculture',
};

/**
 * Maps Research Domain ids to Pulse industries they fall under (where applicable).
 */
const RESEARCH_TO_INDUSTRY = {
  life_sciences: 'healthcare',
  physical_sciences: 'iot',
  social_sciences: 'legal',
  computational_sciences: 'iot',
};

/**
 * Translates a value from one vocabulary to another.
 * @param {string} fromVocab - Source vocabulary ('hs_code' | 'unlocode' | 'industry' | 'sector' | 'research_domain' | 'capability').
 * @param {string} toVocab - Target vocabulary ('industry' | 'country' | 'sector' | 'research_domain' | 'mode' | 'tool_id').
 * @param {string} value - The value to translate.
 * @returns {{ translated: boolean, value: string|null, alternatives: string[] }}
 */
export function translate(fromVocab, toVocab, value) {
  if (!fromVocab || !toVocab || !value) {
    return { translated: false, value: null, alternatives: [] };
  }
  // HS code → industry
  if (fromVocab === 'hs_code' && toVocab === 'industry') {
    const chapter = String(value).replace(/\D/g, '').slice(0, 2).padStart(2, '0');
    const industry = HS_CHAPTER_TO_INDUSTRY[chapter];
    return industry
      ? { translated: true, value: industry, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  // UN/LOCODE → country
  if (fromVocab === 'unlocode' && toVocab === 'country') {
    const prefix = String(value).toUpperCase().slice(0, 2);
    const country = UNLOCODE_PREFIX_TO_COUNTRY[prefix];
    return country
      ? { translated: true, value: country, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  // Industry → sector/research/mode
  if (fromVocab === 'industry' && (toVocab === 'sector' || toVocab === 'research_domain' || toVocab === 'mode')) {
    const field = toVocab === 'research_domain' ? 'research' : toVocab === 'mode' ? 'mode' : 'sector';
    const mapping = INDUSTRY_TO_DOMAINS[value.toLowerCase()] || {};
    const result = mapping[field];
    return result
      ? { translated: true, value: result, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  // Sector → industry
  if (fromVocab === 'sector' && toVocab === 'industry') {
    const industry = SECTOR_TO_INDUSTRY[value.toLowerCase()];
    return industry
      ? { translated: true, value: industry, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  // Research domain → industry
  if (fromVocab === 'research_domain' && toVocab === 'industry') {
    const industry = RESEARCH_TO_INDUSTRY[value.toLowerCase()];
    return industry
      ? { translated: true, value: industry, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  // Capability → tool_id
  if (fromVocab === 'capability' && toVocab === 'tool_id') {
    const toolId = capabilityOwners[value];
    return toolId
      ? { translated: true, value: toolId, alternatives: [] }
      : { translated: false, value: null, alternatives: [] };
  }
  return { translated: false, value: null, alternatives: [] };
}

/**
 * Returns the full industry → domain mapping table (for inspection/UI).
 * @returns {Record<string, { sector: string|null, research: string|null, mode: string|null }>}
 */
export function getIndustryDomainMap() {
  return { ...INDUSTRY_TO_DOMAINS };
}

/**
 * Returns the HS chapter → industry mapping (for inspection).
 * @returns {Record<string, string>}
 */
export function getHsChapterMap() {
  return { ...HS_CHAPTER_TO_INDUSTRY };
}

/**
 * Lists all supported vocabulary translation pairs.
 * @returns {Array<{ from: string, to: string }>}
 */
export function listTranslations() {
  return [
    { from: 'hs_code', to: 'industry' },
    { from: 'unlocode', to: 'country' },
    { from: 'industry', to: 'sector' },
    { from: 'industry', to: 'research_domain' },
    { from: 'industry', to: 'mode' },
    { from: 'sector', to: 'industry' },
    { from: 'research_domain', to: 'industry' },
    { from: 'capability', to: 'tool_id' },
  ];
}
