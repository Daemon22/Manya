import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/connections/decide — the permission moment.
// method here records HOW permission was proven: PASSKEY | QR | CODE.
export async function POST(req: NextRequest) {
  const { id, decision, method } = (await req.json()) as {
    id: string
    decision: 'APPROVED' | 'DECLINED'
    method: 'PASSKEY' | 'QR' | 'CODE'
  }
  if (!id || !decision) return NextResponse.json({ error: 'Missing id or decision.' }, { status: 400 })

  const request = await db.connectionRequest.update({
    where: { id },
    data: { status: decision, method: method ?? 'PASSKEY', decidedAt: new Date() },
  }).catch(() => null)

  if (!request) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })

  // An approved intelligence or device joins the owner's web.
  if (decision === 'APPROVED' && (request.fromKind === 'INTELLIGENCE' || request.fromKind === 'DEVICE' || request.fromKind === 'APPLICATION')) {
    const exists = await db.device.findFirst({ where: { name: request.fromName } })
    if (!exists) {
      await db.device.create({
        data: {
          name: request.fromName,
          kind: request.fromKind as 'INTELLIGENCE' | 'DEVICE' | 'APPLICATION',
          status: 'LINKED',
          detail: `Linked via ${method ?? 'passkey'} · ${request.owner}`,
        },
      })
    } else {
      await db.device.update({ where: { id: exists.id }, data: { status: 'LINKED', lastSeen: new Date() } })
    }
  }

  return NextResponse.json({ status: request.status, method: request.method })
}
