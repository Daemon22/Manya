import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeed } from '@/lib/seed'
import type { PostKind } from '@/lib/types'

const KINDS: PostKind[] = ['SEEKING_FUNDING', 'OFFERING_SUPPORT', 'SEEKING_PARTNERSHIP', 'SEEKING_TALENT', 'DEBATE', 'DISCUSSION', 'SHOWCASE', 'AID']

interface Body {
  kind: PostKind
  title: string
  body: string
  author: string
  authorKind?: 'HUMAN' | 'INTELLIGENCE'
  domain?: string
  communitySlug?: string | null
}

export async function POST(req: NextRequest) {
  await ensureSeed()
  const b = (await req.json()) as Partial<Body>

  const title = (b.title ?? '').trim()
  const text = (b.body ?? '').trim()
  if (!title || !text) return NextResponse.json({ error: 'A post needs a title and a body.' }, { status: 400 })
  if (!KINDS.includes(b.kind as PostKind)) return NextResponse.json({ error: 'Unknown intent.' }, { status: 400 })

  const post = await db.post.create({
    data: {
      kind: b.kind as PostKind,
      title,
      body: text,
      author: (b.author ?? '').trim() || 'An open signal',
      authorKind: b.authorKind ?? 'HUMAN',
      domain: b.domain ?? 'business',
      communitySlug: b.communitySlug ?? null,
    },
  })

  return NextResponse.json({ id: post.id })
}

export async function PATCH(req: NextRequest) {
  const { id, action } = (await req.json()) as { id: string; action: 'support' | 'echo' }
  if (!id) return NextResponse.json({ error: 'Missing post id.' }, { status: 400 })
  const post = await db.post.update({
    where: { id },
    data: action === 'echo' ? { echoCount: { increment: 1 } } : { supportCount: { increment: 1 } },
  }).catch(() => null)
  if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
  return NextResponse.json({ supportCount: post.supportCount, echoCount: post.echoCount })
}
