import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'

interface Body {
  name: string
  topic: string
  host: string
  kind: 'VIDEO' | 'AUDIO'
}

export async function POST(req: NextRequest) {
  await ensureSeed()
  const b = (await req.json()) as Partial<Body>
  const name = (b.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'A Conclave needs a name.' }, { status: 400 })

  const room = await db.callRoom.create({
    data: {
      name,
      topic: (b.topic ?? '').trim() || 'A table set for an honest conversation.',
      host: (b.host ?? '').trim() || 'You',
      kind: b.kind === 'AUDIO' ? 'AUDIO' : 'VIDEO',
      active: true,
    },
  })
  return NextResponse.json({ id: room.id })
}

// PATCH — close a room (ends the Conclave; its Solid Points remain).
export async function PATCH(req: NextRequest) {
  const { id, active } = (await req.json()) as { id: string; active: boolean }
  if (!id) return NextResponse.json({ error: 'Missing room id.' }, { status: 400 })
  const room = await db.callRoom.update({ where: { id }, data: { active } }).catch(() => null)
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  return NextResponse.json({ id: room.id, active: room.active })
}
