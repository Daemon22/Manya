import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'
import type { Bootstrap, Community, ConnectionRequest, Device, Member, Outcome, Pairing, Post } from '@/lib/types'

function j<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

export async function GET() {
  await ensureSeed()

  const [memberCount, communityCount, postCount, deviceCount, member, communities, posts, requests, pairing, devices, rooms, outcomes] =
    await Promise.all([
      db.member.count(),
      db.community.count(),
      db.post.count(),
      db.device.count({ where: { status: 'LINKED' } }),
      db.member.findFirst({ orderBy: { createdAt: 'desc' } }),
      db.community.findMany({ orderBy: [{ aliveNow: 'desc' }] }),
      db.post.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
      db.connectionRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
      db.pairing.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
      db.device.findMany({ orderBy: { lastSeen: 'desc' } }),
      db.callRoom.findMany({ orderBy: { createdAt: 'asc' } }),
      db.outcome.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

  const body: Bootstrap = {
    stats: { members: memberCount, communities: communityCount, posts: postCount, linkedWeb: deviceCount },
    member: member
      ? ({
          ...member,
          roles: j<string[]>(member.roles, []),
          seeking: j<string[]>(member.seeking, []),
          domains: j<string[]>(member.domains, []),
          resonance: j<Member['resonance']>(member.resonance, {
            headline: 'Open signal', placement: '', placementName: '', matches: [], summary: '', score: 0,
          }),
        } as Member)
      : null,
    communities: communities as Community[],
    posts: posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })) as Post[],
    requests: requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    })) as ConnectionRequest[],
    pairing: pairing
      ? ({ ...pairing, expiresAt: pairing.expiresAt.toISOString(), createdAt: pairing.createdAt.toISOString() } as Pairing)
      : null,
    devices: devices.map((d) => ({ ...d, lastSeen: d.lastSeen.toISOString() })) as Device[],
    rooms: rooms.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) as unknown as Bootstrap['rooms'],
    outcomes: outcomes.map((o) => ({ ...o, points: j<string[]>(o.points, []), createdAt: o.createdAt.toISOString() })) as Outcome[],
  }

  return NextResponse.json(body)
}
