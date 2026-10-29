import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'
import { computeResonance } from '@/lib/resonance'
import { isCustom, customText, asCustom } from '@/lib/constants'
import type { Community } from '@/lib/types'

interface Body {
  name: string
  roles: string[]
  seeking: string[]
  domains: string[]
  style: string
  purpose: string
}

// Free-text "Other" answers are re-capped server-side; taxonomy ids pass through.
const cap = (arr: string[]) => arr.map((v) => (isCustom(v) ? asCustom(customText(v)) : v))

export async function POST(req: NextRequest) {
  await ensureSeed()
  const body = (await req.json()) as Partial<Body>

  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'A name is required to be indexed.' }, { status: 400 })

  const roles = cap((body.roles ?? []).slice(0, 6))
  const seeking = cap((body.seeking ?? []).slice(0, 9))
  const domains = cap((body.domains ?? []).slice(0, 10))
  const style = isCustom(body.style ?? '') ? asCustom(customText(body.style ?? '')) : (body.style ?? 'both')
  const purpose = (body.purpose ?? '').trim()

  const communities = (await db.community.findMany()) as Community[]
  const resonance = computeResonance({ name, roles, seeking, domains, style, purpose }, communities)

  const handleBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signal'
  const handle = `${handleBase}-${Math.random().toString(36).slice(2, 6)}`

  const member = await db.member.create({
    data: {
      name, handle, roles: JSON.stringify(roles), seeking: JSON.stringify(seeking),
      domains: JSON.stringify(domains), style, purpose: purpose || 'Seeking connection.',
      resonance: JSON.stringify(resonance),
    },
  })

  // Placement community gains a member — the place is alive.
  if (resonance.placement) {
    await db.community.update({ where: { slug: resonance.placement }, data: { memberCount: { increment: 1 } } }).catch(() => {})
  }

  return NextResponse.json({ id: member.id, handle, resonance })
}
