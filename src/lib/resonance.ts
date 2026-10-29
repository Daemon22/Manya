import type { Community, ResonanceResult } from './types'
import { ROLES, DOMAINS, isCustom, customText } from './constants'

interface IndexingInput {
  name: string
  roles: string[]
  seeking: string[]
  domains: string[]
  style: string
  purpose: string
}

// ─── The Resonance Index ─────────────────────────────────────────────────
// Maps what a person is and what they seek onto the living communities of
// Manya — so people sign into something that is already alive.

const SEEKing_TO_DOMAIN_PULL: Record<string, string[]> = {
  funding: ['business'],
  support: ['business', 'engineering'],
  partnership: ['business', 'software', 'engineering'],
  cofounder: ['business', 'software'],
  debate: ['governance', 'physics'],
  learning: ['education'],
  talent: ['business', 'software'],
  students: ['education'],
  aid: ['agriculture', 'health'],
}

const ROLE_HEADLINES: Record<string, string> = {
  founder: 'Founder in motion',
  funder: 'Keeper of capital',
  inventor: 'Maker of mechanisms',
  researcher: 'Prober of nature',
  mathematician: 'Cartographer of structure',
  debater: 'Sharpener of ideas',
  teacher: 'Minder of minds',
  explorer: 'Open signal',
  builder: 'Weaver of software',
  organizer: 'Assembly of purpose',
}

// ─── The open door ─────────────────────────────────────────────────────
// Free-text "Other" answers are heard by the index: the person's own
// words are tokenized and matched against a domain word-list and against
// the communities' names, taglines and purposes — so what they wrote
// actually moves their placement.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'was', 'who', 'what', 'that',
  'this', 'have', 'from', 'into', 'not', 'but', 'all', 'can', 'will', 'our', 'out',
  'one', 'two', 'she', 'him', 'her', 'his', 'they', 'them', 'their', 'how', 'why',
  'seek', 'seeking', 'want', 'need', 'looking', 'love', 'work', 'working', 'being',
  'doing', 'make', 'making', 'build', 'building', 'people', 'person', 'someone',
])

const DOMAIN_WORDS: Record<string, string[]> = {
  business: ['business', 'enterprise', 'commerce', 'startup', 'venture', 'ventures', 'entrepreneur', 'entrepreneurship', 'markets', 'trade', 'economy'],
  engineering: ['engineering', 'invention', 'inventions', 'machines', 'robotics', 'robots', 'hardware', 'electronics', 'infrastructure', 'manufacturing', 'sensors'],
  physics: ['physics', 'physical', 'science', 'sciences', 'astronomy', 'astrophysics', 'quantum', 'energy', 'space', 'cosmology', 'chemistry'],
  math: ['math', 'mathematics', 'mathematical', 'algebra', 'geometry', 'topology', 'statistics', 'probability', 'logic', 'proofs'],
  software: ['software', 'ai', 'code', 'coding', 'programming', 'computing', 'computers', 'developer', 'algorithms', 'data', 'internet', 'web', 'crypto', 'machine'],
  health: ['health', 'bio', 'biology', 'medicine', 'medical', 'clinical', 'psychology', 'neuroscience', 'genetics', 'wellbeing', 'healing'],
  education: ['education', 'teaching', 'teach', 'teacher', 'mentoring', 'mentorship', 'schools', 'school', 'pedagogy', 'learning', 'curriculum', 'students'],
  arts: ['arts', 'art', 'design', 'designer', 'music', 'poetry', 'poet', 'literature', 'writing', 'writer', 'film', 'cinema', 'photography', 'painting', 'sculpture', 'fashion', 'storytelling', 'creative'],
  governance: ['governance', 'law', 'legal', 'justice', 'policy', 'policies', 'civics', 'diplomacy', 'rights', 'democracy', 'regulation'],
  agriculture: ['agriculture', 'farming', 'farmer', 'crops', 'soil', 'food', 'climate', 'land', 'forestry', 'fisheries', 'ecology', 'sustainability'],
}

const WORD_TO_DOMAIN: Record<string, string> = {}
for (const [domain, words] of Object.entries(DOMAIN_WORDS)) {
  for (const w of words) WORD_TO_DOMAIN[w] = domain
}

function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9à-ÿ']+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
}

function domainNudges(text: string): string[] {
  const hits = new Set<string>()
  for (const tok of tokensOf(text)) {
    const d = WORD_TO_DOMAIN[tok]
    if (d) hits.add(d)
  }
  return [...hits]
}

function communityNudges(text: string, communities: Community[]): string[] {
  const toks = new Set(tokensOf(text))
  if (toks.size === 0) return []
  const hits = new Set<string>()
  for (const c of communities) {
    const bag = tokensOf(`${c.name} ${c.tagline} ${c.purpose} ${c.domain}`)
    if (bag.some((t) => toks.has(t))) {
      const domain = REVERSE_COMMUNITY[c.slug]
      if (domain) hits.add(domain)
    }
  }
  return [...hits]
}

const DOMAIN_COMMUNITY: Record<string, string> = {
  business: 'founders-forge',
  engineering: 'engineering-guild',
  physics: 'physics-parlor',
  math: 'mathematical-circle',
  software: 'signal-craft',
  health: 'vital-signs',
  education: 'the-mentors-bench',
  arts: 'form-and-color',
  governance: 'civic-forum',
  agriculture: 'field-and-table',
}

const REVERSE_COMMUNITY: Record<string, string> = Object.fromEntries(
  Object.entries(DOMAIN_COMMUNITY).map(([d, s]) => [s, d])
)

const MATCH_POOL: Record<string, { name: string; kind: string; why: string }[]> = {
  business: [
    { name: 'Nalini K.', kind: 'Funder · Capital Bridge', why: 'Reviews early-stage ventures every Conclave cycle' },
    { name: 'Tomas E.', kind: 'Founder · Field & Table', why: 'Scaled two agri-cooperatives, seeking partners' },
  ],
  engineering: [
    { name: 'Adaora M.', kind: 'Inventor · Engineering Guild', why: 'Prototyping low-cost water sensors' },
    { name: ' Workshop intelligence “Spanner”', kind: 'Intelligence · Guild-owned', why: 'Keeps the guild’s tool library indexed' },
  ],
  physics: [
    { name: 'Dr. Yunus F.', kind: 'Physicist · Physics Parlor', why: 'Hosts Friday hypothesis debates' },
  ],
  math: [
    { name: 'Prof. C. Adeyemi', kind: 'Mathematician · Mathematical Circle', why: 'Open to supervising explorers' },
  ],
  software: [
    { name: 'Keeper intelligence “Loom”', kind: 'Intelligence · Foundation-owned', why: 'Matches builders to open problems' },
    { name: 'Ines V.', kind: 'Builder · Signal Craft', why: 'Ships weekly, reviews kindly' },
  ],
  health: [
    { name: 'Dr. Amara O.', kind: 'Clinician · Vital Signs', why: 'Gathering engineers for diagnostics' },
  ],
  education: [
    { name: 'Samuel K.', kind: 'Teacher · Mentors’ Bench', why: 'Calls his students into Conclave twice a week' },
  ],
  arts: [
    { name: 'Mira J.', kind: 'Designer · Form & Color', why: 'Runs critique circles, voice-first' },
  ],
  governance: [
    { name: 'Adv. P. Mensah', kind: 'Jurist · Civic Forum', why: 'Moderates the debate of the day' },
  ],
  agriculture: [
    { name: 'Field intelligence “Sower”', kind: 'Intelligence · External platform', why: 'Tracks soil data for member cooperatives' },
  ],
}

export function computeResonance(input: IndexingInput, communities: Community[]): ResonanceResult {
  const domainScores = new Map<string, number>()
  for (const d of input.domains) domainScores.set(d, (domainScores.get(d) ?? 0) + 2)
  for (const s of input.seeking) {
    for (const d of SEEKing_TO_DOMAIN_PULL[s] ?? []) domainScores.set(d, (domainScores.get(d) ?? 0) + 1)
  }
  const role = input.roles[0] ?? 'explorer'

  // The open door — free-text "Other" answers move the placement too.
  // Their own words weigh as much as any category: what they wrote in the
  // domain slot pulls at full strength, roles/seeking at half.
  for (const entry of input.domains.filter(isCustom)) {
    for (const d of [...domainNudges(customText(entry)), ...communityNudges(customText(entry), communities)]) {
      domainScores.set(d, (domainScores.get(d) ?? 0) + 2)
    }
  }
  for (const entry of [...input.roles.filter(isCustom), ...input.seeking.filter(isCustom)]) {
    for (const d of [...domainNudges(customText(entry)), ...communityNudges(customText(entry), communities)]) {
      domainScores.set(d, (domainScores.get(d) ?? 0) + 1)
    }
  }

  // If the person's stated purpose names a domain, nudge it.
  const purposeLower = input.purpose.toLowerCase()
  for (const d of DOMAINS) {
    if (purposeLower.includes(d.label.split(' ')[0].toLowerCase())) {
      domainScores.set(d.id, (domainScores.get(d.id) ?? 0) + 2)
    }
  }
  // And the purpose line itself is free text — let it speak to the index.
  for (const d of domainNudges(input.purpose)) {
    domainScores.set(d, (domainScores.get(d) ?? 0) + 1)
  }

  const ranked = [...domainScores.entries()].sort((a, b) => b[1] - a[1])
  const topDomains = ranked.slice(0, 3).map(([d]) => d)

  // Place at the best-scoring mapped domain — a custom field in the lead
  // yields to the first taxonomy domain its words actually pulled.
  let placementSlug = 'founders-forge'
  for (const [d] of ranked) {
    if (DOMAIN_COMMUNITY[d]) {
      placementSlug = DOMAIN_COMMUNITY[d]
      break
    }
  }
  if (!communities.some((c) => c.slug === placementSlug)) {
    placementSlug = communities[0]?.slug ?? 'founders-forge'
  }
  const placement = communities.find((c) => c.slug === placementSlug)

  const matches: ResonanceResult['matches'] = []
  for (const d of topDomains) {
    for (const m of MATCH_POOL[d] ?? []) {
      if (matches.length < 3) matches.push(m)
    }
  }
  if (matches.length === 0) {
    matches.push({ name: 'Keeper intelligence “Loom”', kind: 'Intelligence · Foundation-owned', why: 'Will guide your first cycles' })
  }

  const roleLabels = input.roles
    .map((r) => (isCustom(r) ? `“${customText(r)}”` : ROLES.find((x) => x.id === r)?.label ?? r))
    .slice(0, 2)
    .join(' · ')

  const seekingLabels = input.seeking.length
    ? input.seeking.slice(0, 2).map((s) => customText(s).replace(/-/g, ' ')).join(' and ')
    : 'connection'

  const firstCustom = [...input.seeking, ...input.domains, ...input.roles.slice(1)].find(isCustom)
  const heardClause = firstCustom
    ? ` Your own words — “${customText(firstCustom).slice(0, 72)}” — were heard by the index.`
    : ''

  const summary =
    `${roleLabels || 'Explorer'} resonating in ${topDomains.slice(0, 2).map((d) => (isCustom(d) ? `“${customText(d)}”` : DOMAINS.find((x) => x.id === d)?.label ?? d)).join(' and ')}` +
    ` — placed at ${placement?.name ?? 'the Founders’ Forge'}, already alive with ${seekingLabels}.` +
    heardClause

  const maxScore = Math.max(2, (input.domains.length || 1) * 2 + (input.seeking.length || 1))
  const score = Math.min(99, 62 + ranked[0]?.[1] * 6 + input.roles.length * 3 + Math.round((maxScore ? (ranked[0]?.[1] ?? 0) / maxScore : 0) * 20))

  // When someone leads with their own words, their words are the headline.
  let headline = ROLE_HEADLINES[role] ?? 'Open signal'
  if (isCustom(role)) {
    const words = customText(role)
    headline = words.length > 48 ? `${words.slice(0, 45).trimEnd()}…` : words
    headline = headline.charAt(0).toUpperCase() + headline.slice(1)
  }

  return {
    headline,
    placement: placementSlug,
    placementName: placement?.name ?? 'The Founders’ Forge',
    matches,
    summary,
    score,
  }
}
