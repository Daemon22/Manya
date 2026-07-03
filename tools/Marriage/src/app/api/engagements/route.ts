import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/engagements - List all engagements
export async function GET() {
  try {
    const engagements = await db.engagement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        deviceA: true,
        deviceB: true,
      }
    })
    return NextResponse.json({ engagements })
  } catch (error) {
    console.error('Failed to fetch engagements:', error)
    return NextResponse.json({ error: 'Failed to fetch engagements' }, { status: 500 })
  }
}

// POST /api/engagements - Create a new engagement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceAId, deviceBId, pin } = body

    if (!deviceAId || !deviceBId || !pin) {
      return NextResponse.json({ error: 'Both device IDs and PIN are required' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    const engagement = await db.engagement.create({
      data: {
        deviceAId,
        deviceBId,
        pin,
        status: 'active',
        expiresAt,
      }
    })

    // Log activity
    await db.activity.create({
      data: {
        deviceId: deviceAId,
        type: 'engagement',
        title: 'Engagement established!',
        description: `Devices connected via PIN ${pin}`,
        metadata: JSON.stringify({ engagementId: engagement.id, pin }),
      }
    })

    return NextResponse.json({ engagement, message: 'Engagement established!' })
  } catch (error) {
    console.error('Failed to create engagement:', error)
    return NextResponse.json({ error: 'Failed to create engagement' }, { status: 500 })
  }
}
