import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/marriages - List all marriages
export async function GET() {
  try {
    const marriages = await db.marriage.findMany({
      orderBy: { marriedAt: 'desc' },
      include: {
        deviceA: true,
        deviceB: true,
      }
    })
    return NextResponse.json({ marriages })
  } catch (error) {
    console.error('Failed to fetch marriages:', error)
    return NextResponse.json({ error: 'Failed to fetch marriages' }, { status: 500 })
  }
}

// POST /api/marriages - Create a new marriage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceAId, deviceBId, vows } = body

    if (!deviceAId || !deviceBId) {
      return NextResponse.json({ error: 'Both device IDs are required' }, { status: 400 })
    }

    // Check if already married
    const existingMarriage = await db.marriage.findFirst({
      where: {
        OR: [
          { deviceAId, deviceBId, status: 'active' },
          { deviceAId: deviceBId, deviceBId: deviceAId, status: 'active' },
        ]
      }
    })

    if (existingMarriage) {
      return NextResponse.json({ error: 'These devices are already married!' }, { status: 409 })
    }

    const marriage = await db.marriage.create({
      data: {
        deviceAId,
        deviceBId,
        vows: vows ? JSON.stringify(vows) : null,
        status: 'active',
      }
    })

    // Log activity
    await db.activity.create({
      data: {
        deviceId: deviceAId,
        type: 'marriage',
        title: 'Marriage established!',
        description: 'Two devices have been bound forever',
        metadata: JSON.stringify({ marriageId: marriage.id }),
      }
    })

    return NextResponse.json({ marriage, message: 'Marriage established! The bond is forever!' })
  } catch (error) {
    console.error('Failed to create marriage:', error)
    return NextResponse.json({ error: 'Failed to create marriage' }, { status: 500 })
  }
}

// PATCH /api/marriages - Divorce
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { marriageId } = body

    if (!marriageId) {
      return NextResponse.json({ error: 'Marriage ID is required' }, { status: 400 })
    }

    const marriage = await db.marriage.update({
      where: { id: marriageId },
      data: {
        status: 'divorced',
        divorcedAt: new Date(),
      }
    })

    // Log activity
    await db.activity.create({
      data: {
        deviceId: marriage.deviceAId,
        type: 'divorce',
        title: 'Marriage dissolved',
        description: 'A marriage bond has been broken',
        metadata: JSON.stringify({ marriageId }),
      }
    })

    return NextResponse.json({ marriage, message: 'Marriage dissolved.' })
  } catch (error) {
    console.error('Failed to update marriage:', error)
    return NextResponse.json({ error: 'Failed to update marriage' }, { status: 500 })
  }
}
