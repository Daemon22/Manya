import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

// POST /api/qr — renders a pairing payload as a scannable QR (PNG data URL).
export async function POST(req: NextRequest) {
  const { payload } = (await req.json()) as { payload?: string }
  if (!payload) return NextResponse.json({ error: 'Missing payload.' }, { status: 400 })

  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#0b0e14', light: '#f4f7f2' },
  })

  return NextResponse.json({ dataUrl })
}
