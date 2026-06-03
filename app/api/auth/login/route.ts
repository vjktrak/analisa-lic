import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createToken, SESSION_COOKIE } from '@/lib/auth'

// Hash pré-computado de @Licitacao2026 como fallback
const FALLBACK_HASH = '$2b$10$8crsSu5MkKM3o851qIi/s.Jg2mpGWfsepBi/.iWgfmx2XvxICt6L2'
const FALLBACK_EMAIL = 'licitamarcio@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim() || FALLBACK_EMAIL
    const adminPasswordHash = (process.env.ADMIN_PASSWORD || '').trim()

    // Log para debug (remover após confirmar funcionamento)
    console.log('[AUTH] email recebido:', JSON.stringify(email))
    console.log('[AUTH] adminEmail:', JSON.stringify(adminEmail))
    console.log('[AUTH] passwordHash length:', adminPasswordHash.length)

    if (email.trim() !== adminEmail) {
      console.log('[AUTH] email não confere')
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    let passwordValid = false

    if (adminPasswordHash.length > 10) {
      // Tem senha configurada no env
      if (adminPasswordHash.startsWith('$2b$') || adminPasswordHash.startsWith('$2a$')) {
        passwordValid = await bcrypt.compare(password.trim(), adminPasswordHash)
      } else {
        passwordValid = password.trim() === adminPasswordHash
      }
    }

    // Fallback: verificar contra o hash pré-computado
    if (!passwordValid) {
      passwordValid = await bcrypt.compare(password.trim(), FALLBACK_HASH)
    }

    console.log('[AUTH] passwordValid:', passwordValid)

    if (!passwordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = await createToken({ email: email.trim() })

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[AUTH] Login error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
