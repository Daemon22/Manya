import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'
import type { EntityKind } from '@/lib/types'

interface Body {
  action: 'inquire' | 'redeem'
  fromName: string
  fromKind?: EntityKind
  owner?: string
  toName: string
  note?: string
  method?: 'INQUIRY' | 'QR' | 'CODE' | 'PASSKEY'
  code?: string
}

// POST /api/connections
// - action=inquire : you send a connection inquiry to a space / intelligence / person
// - action=redeem  : you present someone else's 7-character code → creates a
//                    PENDING request on their side (here: logged into the ledger)
export async function POST(req: NextRequest) {
  await ensureSeed()
  const b = (await req.json()) as Partial<Body>

  if (b.action === 'redeem') {
    const code = (b.code ?? '').trim().toUpperCase()
    if (code.length !== 7) return NextResponse.json({ error: 'A pairing code is exactly 7 characters.' }, { status: 400 })
    const pairing = await db.pairing.findFirst({ where: { code, active: true } })
    if (!pairing) return NextResponse.json({ error: 'No live pairing hears that code. Reach, then request.' }, { status: 404 })

    const request = await db.connectionRequest.create({
      data: {
        fromName: (b.fromName ?? '').trim() || 'An open signal',
        fromKind: b.fromKind ?? 'HUMAN',
        owner: (b.owner ?? '').trim() || 'Self',
        toName: pairing.target,
        note: (b.note ?? '').trim() || `Arrived via pairing code ${code}.`,
        method: 'CODE',
        code,
        status: 'PENDING',
      },
    })
    return NextResponse.json({ id: request.id, status: 'PENDING', target: pairing.target })
  }

  const toName = (b.toName ?? '').trim()
  if (!toName) return NextResponse.json({ error: 'Name who you are reaching toward.' }, { status: 400 })

  const request = await db.connectionRequest.create({
    data: {
      fromName: (b.fromName ?? '').trim() || 'An open signal',
      fromKind: b.fromKind ?? 'HUMAN',
      owner: (b.owner ?? 'You').trim(),
      toName,
      note: (b.note ?? '').trim() || 'Sent an inquiry from the Connect Center.',
      method: b.method ?? 'INQUIRY',
      status: 'PENDING',
    },
  })
  return NextResponse.json({ id: request.id, status: 'PENDING' })
}
