/**
 * @manya/customs-shield — HS (Harmonized System) code catalog and validation.
 *
 * Implements a small built-in catalog of HS code prefixes (section + chapter
 * + heading) for validation. Production deployments should plug in a full
 * national tariff schedule via the `setCatalog` API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { HSCode } from '../types.js';
import { HSCodeError } from '../errors.js';

/** A catalog maps HS code (6-digit international) → HSCode entry. */
export type HSCatalog = Map<string, HSCode>;

/** Built-in mini-catalog: chapter → description (WCO standard). */
const CHAPTER_DESCRIPTIONS: Record<string, string> = {
  '01': 'Live animals',
  '02': 'Meat and edible meat offal',
  '03': 'Fish and aquatic invertebrates',
  '04': 'Dairy produce, birds eggs, natural honey',
  '05': 'Products of animal origin, n.e.s.',
  '06': 'Live trees and other plants',
  '07': 'Edible vegetables and certain roots/tubers',
  '08': 'Edible fruit and nuts',
  '09': 'Coffee, tea, mate and spices',
  '10': 'Cereals',
  '11': 'Products of the milling industry',
  '12': 'Oil seeds and oleaginous fruits',
  '13': 'Lac, gums, resins, vegetable saps',
  '14': 'Vegetable plaiting materials, vegetable products n.e.s.',
  '15': 'Animal or vegetable fats and oils',
  '16': 'Preparations of meat, fish, etc.',
  '17': 'Sugars and sugar confectionery',
  '18': 'Cocoa and cocoa preparations',
  '19': 'Preparations of cereals, flour, starch, milk',
  '20': 'Preparations of vegetables, fruit, etc.',
  '21': 'Miscellaneous edible preparations',
  '22': 'Beverages, spirits and vinegar',
  '23': 'Residues and waste of food industry, animal fodder',
  '24': 'Tobacco and manufactured tobacco substitutes',
  '25': 'Salt, sulfur, earths, stones, plasters, limes, cement',
  '26': 'Ores, slag and ash',
  '27': 'Mineral fuels, mineral oils and products',
  '28': 'Inorganic chemicals',
  '29': 'Organic chemicals',
  '30': 'Pharmaceutical products',
  '31': 'Fertilizers',
  '32': 'Tanning/dye extracts, tannins, pigments, paints',
  '33': 'Essential oils, cosmetics, toiletries',
  '34': 'Soap, organic surface-active agents, waxes',
  '35': 'Albuminoidal substances, modified starches, glues, enzymes',
  '36': 'Explosives, pyrotechnic products, matches',
  '37': 'Photographic or cinematographic goods',
  '38': 'Miscellaneous chemical products',
  '39': 'Plastics and articles thereof',
  '40': 'Rubber and articles thereof',
  '41': 'Raw hides and skins, leather',
  '42': 'Articles of leather, saddlery, handbags',
  '43': 'Furskins and artificial fur',
  '44': 'Wood and articles of wood',
  '45': 'Cork and articles of cork',
  '46': 'Manufactures of straw, esparto, plaiting materials',
  '47': 'Pulp of wood or other cellulosic material',
  '48': 'Paper and paperboard, articles thereof',
  '49': 'Printed books, newspapers, pictures',
  '50': 'Silk',
  '51': 'Wool, fine or coarse animal hair',
  '52': 'Cotton',
  '53': 'Other vegetable textile fibers, paper yarn',
  '54': 'Man-made filaments',
  '55': 'Man-made staple fibres',
  '56': 'Wadding, felt, nonwovens, special yarns, twine, cordage',
  '57': 'Carpets and other textile floor coverings',
  '58': 'Special woven fabrics, tufted textile fabrics, lace',
  '59': 'Impregnated, coated, covered or laminated textile fabrics',
  '60': 'Knitted or crocheted fabrics',
  '61': 'Articles of apparel, knitted or crocheted',
  '62': 'Articles of apparel, not knitted or crocheted',
  '63': 'Other made-up textile articles, sets, worn clothing',
  '64': 'Footwear, gaiters, parts thereof',
  '65': 'Headgear and parts thereof',
  '66': 'Umbrellas, sun umbrellas, walking-sticks, seat-sticks',
  '67': 'Prepared feathers, artificial flowers, articles of human hair',
  '68': 'Articles of stone, plaster, cement, asbestos, mica',
  '69': 'Ceramic products',
  '70': 'Glass and glassware',
  '71': 'Natural or cultured pearls, precious stones, metals',
  '72': 'Iron and steel',
  '73': 'Articles of iron or steel',
  '74': 'Copper and articles thereof',
  '75': 'Nickel and articles thereof',
  '76': 'Aluminium and articles thereof',
  '78': 'Lead and articles thereof',
  '79': 'Zinc and articles thereof',
  '80': 'Tin and articles thereof',
  '81': 'Other base metals, cermets, articles thereof',
  '82': 'Tools, implements, cutlery, spoons, forks, of base metal',
  '83': 'Miscellaneous articles of base metal',
  '84': 'Nuclear reactors, boilers, machinery and mechanical appliances',
  '85': 'Electrical machinery and equipment, sound recorders, TV',
  '86': 'Railway or tramway locomotives, rolling stock, track',
  '87': 'Vehicles other than railway or tramway rolling stock',
  '88': 'Aircraft, spacecraft, and parts thereof',
  '89': 'Ships, boats and floating structures',
  '90': 'Optical, photographic, cinematographic, measuring, medical instruments',
  '91': 'Clocks and watches and parts thereof',
  '92': 'Musical instruments, parts and accessories',
  '93': 'Arms and ammunition, parts and accessories',
  '94': 'Furniture, bedding, mattresses, lamps, signs, prefabricated buildings',
  '95': 'Toys, games, sports requisites',
  '96': 'Miscellaneous manufactured articles',
  '97': 'Works of art, collectors pieces and antiques',
  '98': 'Special classification provisions',
  '99': 'Special transaction certificates',
};

/** Validate HS code format (6-10 digits, optional spaces/dots). */
export function isValidFormat(code: string): boolean {
  if (typeof code !== 'string') return false;
  const clean = code.replace(/[ .-]/g, '');
  return /^\d{6,10}$/.test(clean);
}

/** Normalize an HS code (strip separators). */
export function normalize(code: string): string {
  if (typeof code !== 'string') throw new HSCodeError('HS code must be string');
  const clean = code.replace(/[ .-]/g, '');
  if (!/^\d{6,10}$/.test(clean)) {
    throw new HSCodeError(`Invalid HS code format: '${code}'`);
  }
  return clean;
}

/** Get the chapter (first 2 digits). Returns '' for invalid input. */
export function chapter(code: string): string {
  if (!isValidFormat(code)) return '';
  return normalize(code).slice(0, 2);
}

/** Get the heading (first 4 digits). Returns '' for invalid input. */
export function heading(code: string): string {
  if (!isValidFormat(code)) return '';
  return normalize(code).slice(0, 4);
}

/** Get the international portion (first 6 digits). Returns '' for invalid input. */
export function international(code: string): string {
  if (!isValidFormat(code)) return '';
  return normalize(code).slice(0, 6);
}

/** Build a default catalog from the chapter descriptions. */
export function buildDefaultCatalog(): HSCatalog {
  const cat: HSCatalog = new Map();
  for (const [ch, desc] of Object.entries(CHAPTER_DESCRIPTIONS)) {
    cat.set(ch + '00' + '00', {
      issuingCountry: 'WCO',
      international: ch + '00' + '00',
      description: `${desc} (chapter-level placeholder)`,
    });
  }
  return cat;
}

let globalCatalog: HSCatalog = buildDefaultCatalog();

/** Replace the global catalog. */
export function setCatalog(cat: HSCatalog): void {
  globalCatalog = cat;
}

/** Get the global catalog (for read-only inspection). */
export function getCatalog(): HSCatalog {
  return globalCatalog;
}

/** Look up an HS code in the catalog. Returns exact match first, then chapter fallback. */
export function lookup(code: string): HSCode | undefined {
  const n = normalize(code);
  // Exact 6-digit.
  const exact = globalCatalog.get(n.slice(0, 6));
  if (exact) return exact;
  // Chapter fallback.
  return globalCatalog.get(chapter(n) + '0000');
}

/** Validate an HS code against the catalog. Returns { valid, reason }.
 * Note: a chapter-level match counts as 'partial'. */
export function validate(code: string): { valid: boolean; partial?: boolean; reason?: string; entry?: HSCode } {
  if (!isValidFormat(code)) {
    return { valid: false, reason: `Invalid format: '${code}' (expected 6-10 digits)` };
  }
  const n = normalize(code);
  if (n.length < 6) return { valid: false, reason: 'HS code must be at least 6 digits' };
  const ch = chapter(n);
  if (!CHAPTER_DESCRIPTIONS[ch]) {
    return { valid: false, reason: `Unknown chapter: '${ch}'` };
  }
  const entry = lookup(n);
  if (!entry) return { valid: false, reason: `No catalog entry for '${n}'` };
  const partial = entry.international.endsWith('0000');
  return { valid: true, partial, entry };
}

/** Suggest HS codes given a free-text description. Very simple keyword match. */
export function suggest(description: string, limit = 5): Array<{ code: string; description: string; score: number }> {
  if (typeof description !== 'string' || !description.trim()) return [];
  const lower = description.toLowerCase();
  const tokens = lower.split(/\W+/).filter(t => t.length > 2);
  const scored: Array<{ code: string; description: string; score: number }> = [];
  for (const [ch, desc] of Object.entries(CHAPTER_DESCRIPTIONS)) {
    const dLower = desc.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (dLower.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ code: ch + '00' + '00', description: desc, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Verify whether a declared HS code matches a description. */
export function verifyMatch(code: string, description: string): { match: boolean; confidence: number; reason: string } {
  const entry = lookup(code);
  if (!entry) return { match: false, confidence: 0, reason: 'HS code not in catalog' };
  const entryTokens = new Set(entry.description.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  const descTokens = description.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (descTokens.length === 0) return { match: false, confidence: 0, reason: 'Description has no usable tokens' };
  let hits = 0;
  for (const t of descTokens) if (entryTokens.has(t)) hits++;
  const confidence = hits / descTokens.length;
  return { match: confidence >= 0.3, confidence, reason: `${hits}/${descTokens.length} tokens matched` };
}
