import type { PostKind } from './types'

// ─── The Indexing taxonomy ───────────────────────────────────────────────
// "before you sign up, I will set some things that will put you … where
//  you resonate best" — every option below feeds the Resonance Index.

export const ROLES = [
  { id: 'founder', label: 'Founder / Entrepreneur', glyph: '▲', hint: 'Building something that needs others' },
  { id: 'funder', label: 'Funder / Investor', glyph: '◆', hint: 'Capital, grants, or support to give' },
  { id: 'inventor', label: 'Inventor / Engineer', glyph: '⬡', hint: 'Hands on the machine of things' },
  { id: 'researcher', label: 'Researcher / Scientist', glyph: '◉', hint: 'Hypotheses, papers, probes' },
  { id: 'mathematician', label: 'Mathematician', glyph: '∑', hint: 'Structures of pure thought' },
  { id: 'debater', label: 'Debater / Thinker', glyph: '⇄', hint: 'Ideas sharpened against other ideas' },
  { id: 'teacher', label: 'Teacher / Mentor', glyph: '✦', hint: 'Calling students, raising others' },
  { id: 'explorer', label: 'Explorer / Learner', glyph: '✧', hint: 'Curious, searching, listening' },
  { id: 'builder', label: 'Builder / Developer', glyph: '⌘', hint: 'Software, spaces, and systems' },
  { id: 'organizer', label: 'Organization / Enterprise', glyph: '▣', hint: 'Businesses, foundations, institutions' },
] as const

export const SEEKING = [
  { id: 'funding', label: 'Funding', hint: 'Capital to move' },
  { id: 'support', label: 'Support', hint: 'Hands, tools, services' },
  { id: 'partnership', label: 'Partnership', hint: 'People to build with' },
  { id: 'cofounder', label: 'A co-founder', hint: 'Someone to share the weight' },
  { id: 'debate', label: 'Debate & discussion', hint: 'Rooms where ideas clash' },
  { id: 'learning', label: 'Learning', hint: 'People to learn from' },
  { id: 'talent', label: 'Talent', hint: 'Minds to recruit' },
  { id: 'students', label: 'Students / mentees', hint: 'People to teach' },
  { id: 'aid', label: 'Offering aid', hint: 'Giving before being asked' },
] as const

export const DOMAINS = [
  { id: 'business', label: 'Business & Enterprise' },
  { id: 'engineering', label: 'Engineering & Invention' },
  { id: 'physics', label: 'Physics & Physical Science' },
  { id: 'math', label: 'Mathematics' },
  { id: 'software', label: 'Software & AI' },
  { id: 'health', label: 'Health & Bio' },
  { id: 'education', label: 'Education' },
  { id: 'arts', label: 'Arts & Design' },
  { id: 'governance', label: 'Law & Governance' },
  { id: 'agriculture', label: 'Agriculture & Land' },
] as const

export const STYLES = [
  { id: 'voice-first', label: 'Voice & video first', hint: 'I think out loud — text scatters my mind' },
  { id: 'text-first', label: 'Text first', hint: 'I write my way into clarity' },
  { id: 'both', label: 'Both, depending', hint: 'Talk to build, write to seal' },
] as const

export const STYLE_OTHER = 'other' // sentinel id for the write-in style choice

// ─── The open door ───────────────────────────────────────────────────────
// Every indexing question carries an "Other" — free text, in the person's
// own words. Stored inline as `custom:<text>` so the ledger stays
// schema-simple; anywhere it is shown, the prefix is stripped.

export const CUSTOM_PREFIX = 'custom:'

export function isCustom(v: string): boolean {
  return v.startsWith(CUSTOM_PREFIX)
}

export function customText(v: string): string {
  return isCustom(v) ? v.slice(CUSTOM_PREFIX.length) : v
}

export function asCustom(text: string): string {
  return CUSTOM_PREFIX + text.trim().slice(0, 120)
}

// Display helpers — the taxonomy label first, the person's own words otherwise.
export function roleLabel(id: string): string {
  if (isCustom(id)) return customText(id)
  return ROLES.find((r) => r.id === id)?.label ?? id
}

export function domainLabel(id: string): string {
  if (isCustom(id)) return customText(id)
  return DOMAINS.find((d) => d.id === id)?.label ?? id
}

// ─── Intent metadata (Pulse feed) ────────────────────────────────────────
// Tones are the five metals of the emblem: gold, champagne, sapphire,
// ivory, rose.

export const INTENTS: Record<PostKind, { label: string; tone: string; glyph: string }> = {
  SEEKING_FUNDING: { label: 'Seeking funding', tone: 'champagne', glyph: '◆' },
  OFFERING_SUPPORT: { label: 'Offering support', tone: 'gold', glyph: '✦' },
  SEEKING_PARTNERSHIP: { label: 'Seeking partnership', tone: 'sapphire', glyph: '⇄' },
  SEEKING_TALENT: { label: 'Seeking talent', tone: 'ivory', glyph: '◈' },
  DEBATE: { label: 'Debate of the day', tone: 'rose', glyph: '⇌' },
  DISCUSSION: { label: 'Discussion', tone: 'gold', glyph: '◌' },
  SHOWCASE: { label: 'Showcase', tone: 'sapphire', glyph: '▲' },
  AID: { label: 'Seeking aid', tone: 'champagne', glyph: '♦' },
}

export const TONE_CLASSES: Record<string, { badge: string; dot: string; ring: string; text: string }> = {
  gold: {
    badge: 'bg-gold-500/12 text-gold-700 border-gold-600/30',
    dot: 'bg-gold-500',
    ring: 'ring-gold-500/40',
    text: 'text-gold-700',
  },
  champagne: {
    badge: 'bg-champagne-500/12 text-champagne-700 border-champagne-600/30',
    dot: 'bg-champagne-500',
    ring: 'ring-champagne-500/40',
    text: 'text-champagne-700',
  },
  sapphire: {
    badge: 'bg-sapphire-500/12 text-sapphire-700 border-sapphire-500/30',
    dot: 'bg-sapphire-500',
    ring: 'ring-sapphire-500/40',
    text: 'text-sapphire-700',
  },
  ivory: {
    badge: 'bg-ivory-600/12 text-ivory-800 border-ivory-600/30',
    dot: 'bg-ivory-600',
    ring: 'ring-ivory-600/40',
    text: 'text-ivory-800',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
    dot: 'bg-rose-500',
    ring: 'ring-rose-500/40',
    text: 'text-rose-700',
  },
  // Legacy accents (older rows in the ledger) — aliased to the mint
  emerald: undefined as never,
  amber: undefined as never,
  cyan: undefined as never,
  violet: undefined as never,
  fuchsia: undefined as never,
}
TONE_CLASSES.emerald = TONE_CLASSES.gold
TONE_CLASSES.amber = TONE_CLASSES.champagne
TONE_CLASSES.cyan = TONE_CLASSES.sapphire
TONE_CLASSES.violet = TONE_CLASSES.ivory
TONE_CLASSES.fuchsia = TONE_CLASSES.sapphire

// ─── 7-character pairing codes ───────────────────────────────────────────
// No ambiguous glyphs (0/O, 1/I/L, 5/S, 8/B, 2/Z kept out where possible).

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ34679'

export function generateCode(len = 7): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

export function accentHex(accent: string): string {
  switch (accent) {
    case 'gold':
    case 'emerald':
      return '#E3C56C'
    case 'champagne':
    case 'amber':
      return '#E8B84B'
    case 'sapphire':
    case 'cyan':
    case 'fuchsia':
      return '#6E9BEE'
    case 'ivory':
    case 'violet':
      return '#EDE5CE'
    case 'rose':
      return '#FB7185'
    default:
      return '#E3C56C'
  }
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
