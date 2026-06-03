import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPasswordHash = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPasswordHash) {
      return NextResponse.json({ error: 'Servidor não configurado' }, { status: 500 })
    }

    if (email !== adminEmail) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Verifica se é hash bcrypt ou senha plaintext (primeira vez)
    let passwordValid = false
    if (adminPasswordHash.startsWith('$2b$') || adminPasswordHash.startsWith('$2a$')) {
      passwordValid = await bcrypt.compare(password, adminPasswordHash)
    } else {
      // Senha em texto puro no .env (configuração inicial)
      passwordValid = password === adminPasswordHash
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = await createToken({ email })

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[AUTH] Login error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
