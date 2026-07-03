import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/devices - List all devices
export async function GET() {
  try {
    const devices = await db.device.findMany({
      orderBy: { lastSeen: 'desc' },
      include: {
        engagementsAsA: { where: { status: 'active' } },
        engagementsAsB: { where: { status: 'active' } },
        marriagesAsA: { where: { status: 'active' } },
        marriagesAsB: { where: { status: 'active' } },
      }
    })
    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Failed to fetch devices:', error)
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}

// POST /api/devices - Register a new device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, fingerprint, platform, ipAddress, avatar } = body

    if (!name || !fingerprint) {
      return NextResponse.json({ error: 'Name and fingerprint are required' }, { status: 400 })
    }

    // Upsert: update if fingerprint exists, create if not
    const device = await db.device.upsert({
      where: { fingerprint },
      update: {
        name,
        type: type || 'android',
        platform,
        ipAddress,
        avatar,
        status: 'online',
        lastSeen: new Date(),
      },
      create: {
        name,
        type: type || 'android',
        fingerprint,
        platform,
        ipAddress,
        avatar,
        status: 'online',
      }
    })

    // Log activity
    await db.activity.create({
      data: {
        deviceId: device.id,
        type: 'engagement',
        title: `${name} joined the ring`,
        description: `A ${type || 'android'} device has entered the Marriage Ring`,
        metadata: JSON.stringify({ fingerprint, platform }),
      }
    })

    return NextResponse.json({ device, message: `${name} has entered the Marriage Ring!` })
  } catch (error) {
    console.error('Failed to register device:', error)
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
  }
}
