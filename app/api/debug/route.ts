import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const email = process.env.ADMIN_EMAIL || 'NAO_DEFINIDO'
  const pass = process.env.ADMIN_PASSWORD || 'NAO_DEFINIDO'
  return NextResponse.json({
    emailLen: email.length,
    emailChars: Array.from(email).map(c => c.charCodeAt(0)),
    passLen: pass.length,
    passChars: Array.from(pass).map(c => c.charCodeAt(0)),
  })
}
