// ─── Manya shared types ──────────────────────────────────────────────────

export type View =
  | 'landing'
  | 'onboarding'
  | 'pulse'
  | 'communities'
  | 'community'
  | 'conclave'
  | 'room'
  | 'connect'
  | 'myweb'

export interface ResonanceResult {
  headline: string
  placement: string // community slug
  placementName: string
  matches: { name: string; kind: string; why: string }[]
  summary: string
  score: number
}

export interface Member {
  id: string
  name: string
  handle: string
  roles: string[]
  seeking: string[]
  domains: string[]
  style: string
  purpose: string
  resonance: ResonanceResult
  createdAt: string
}

export interface Community {
  id: string
  slug: string
  name: string
  tagline: string
  purpose: string
  domain: string
  accent: string
  kind: string
  memberCount: number
  aliveNow: number
}

export type PostKind =
  | 'SEEKING_FUNDING'
  | 'OFFERING_SUPPORT'
  | 'SEEKING_PARTNERSHIP'
  | 'SEEKING_TALENT'
  | 'DEBATE'
  | 'DISCUSSION'
  | 'SHOWCASE'
  | 'AID'

export interface Post {
  id: string
  kind: PostKind
  title: string
  body: string
  author: string
  authorKind: 'HUMAN' | 'INTELLIGENCE'
  domain: string
  communitySlug: string | null
  supportCount: number
  echoCount: number
  createdAt: string
}

export type EntityKind = 'HUMAN' | 'INTELLIGENCE' | 'DEVICE' | 'APPLICATION' | 'SPACE' | 'ORGANIZATION'

export interface ConnectionRequest {
  id: string
  fromName: string
  fromKind: EntityKind
  owner: string
  toName: string
  note: string
  method: 'INQUIRY' | 'QR' | 'CODE' | 'PASSKEY'
  code: string | null
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  createdAt: string
  decidedAt: string | null
}

export interface Pairing {
  id: string
  code: string
  label: string
  target: string
  active: boolean
  expiresAt: string
  createdAt: string
}

export interface Device {
  id: string
  name: string
  kind: 'DEVICE' | 'APPLICATION' | 'SPACE' | 'INTELLIGENCE'
  status: 'LINKED' | 'PENDING' | 'OFFLINE'
  detail: string
  lastSeen: string
}

export interface CallRoom {
  id: string
  name: string
  topic: string
  host: string
  kind: 'VIDEO' | 'AUDIO'
  active: boolean
  capacity: number
  createdAt: string
}

export interface Outcome {
  id: string
  roomId: string
  title: string
  points: string[]
  by: string
  createdAt: string
}

export interface Bootstrap {
  stats: { members: number; communities: number; posts: number; linkedWeb: number }
  member: Member | null
  communities: Community[]
  posts: Post[]
  requests: ConnectionRequest[]
  pairing: Pairing | null
  devices: Device[]
  rooms: CallRoom[]
  outcomes: Outcome[]
}

export interface ChatMessage {
  id: string
  author: string
  body: string
  ts: number
  kind: 'user' | 'system'
}
