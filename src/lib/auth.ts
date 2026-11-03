import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { db } from '@/lib/db'
import { allowAuthAttempt } from '@/lib/auth-rate-limit'
import { verifyPassword } from '@/lib/password'

const WINDOW_MS = 15 * 60 * 1000

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: 'Manya account',
      credentials: {
        identifier: { label: 'Username or email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const forwarded = request.headers['x-forwarded-for'] ?? request.headers['x-real-ip']
        const address = Array.isArray(forwarded) ? forwarded[0] : forwarded
        const ip = address?.split(',')[0]?.trim() || 'unknown'
        if (!allowAuthAttempt(`signin:${ip}`, 10, WINDOW_MS)) return null

        const identifier = String(credentials?.identifier ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!identifier || identifier.length > 254 || !password || password.length > 128) return null

        const user = await db.appUser.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
        })
        if (!user || !(await verifyPassword(password, user.passwordHash))) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
}
