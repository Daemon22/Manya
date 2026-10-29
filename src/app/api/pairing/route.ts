import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'
import { generateCode } from '@/lib/constants'

// POST /api/pairing — mint (or rotate) your 7-character pairing code.
export async function POST() {
  await ensureSeed()
  await db.pairing.updateMany({ where: { active: true }, data: { active: false } })

  const pairing = await db.pairing.create({
    data: {
      code: generateCode(),
      label: 'Your standing pairing — show the code, or let them scan',
      target: 'Your space',
      active: true,
      expiresAt: new Date(Date.now() + 20 * 3600_000),
    },
  })

  return NextResponse.json({
    id: pairing.id,
    code: pairing.code,
    expiresAt: pairing.expiresAt.toISOString(),
  })
}
