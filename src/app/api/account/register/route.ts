import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { allowAuthAttempt } from '@/lib/auth-rate-limit'
import { hashPassword } from '@/lib/password'

export const runtime = 'nodejs'

const WINDOW_MS = 15 * 60 * 1000

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
    }
  }

  const forwarded = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const ip = forwarded.split(',')[0]?.trim() || 'unknown'
  if (!allowAuthAttempt(`signup:${ip}`, 5, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 4096) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter your details and try again.' }, { status: 400 })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Enter your details and try again.' }, { status: 400 })
  }
  const body = parsed as Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'Enter a name between 2 and 80 characters.' }, { status: 400 })
  }
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: 'Choose a username with 3–24 letters, numbers, or underscores.' }, { status: 400 })
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: 'Use a password between 12 and 128 characters.' }, { status: 400 })
  }

  const existing = await db.appUser.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'An account with those details already exists. Try signing in.' }, { status: 409 })
  }

  try {
    await db.appUser.create({
      data: { name, username, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: 'An account with those details already exists. Try signing in.' }, { status: 409 })
    }
    throw error
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
