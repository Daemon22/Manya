import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Body {
  roomId: string
  title: string
  points: string[]
  by: string
}

// POST /api/rooms/outcome — the Solid Point: what the Conclave concluded.
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Partial<Body>
  const roomId = b.roomId
  const points = (b.points ?? []).map((p) => p.trim()).filter(Boolean)
  if (!roomId || points.length === 0) {
    return NextResponse.json({ error: 'A solid point needs at least one concluded line.' }, { status: 400 })
  }

  const outcome = await db.outcome.create({
    data: {
      roomId,
      title: (b.title ?? '').trim() || 'Session conclusion',
      points: JSON.stringify(points.slice(0, 12)),
      by: (b.by ?? '').trim() || 'The table',
    },
  })

  return NextResponse.json({ id: outcome.id })
}
