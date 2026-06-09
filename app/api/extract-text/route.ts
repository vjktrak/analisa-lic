import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { base64, filename, fileType } = body

    if (!base64) {
      return NextResponse.json({ error: 'Dados do arquivo não enviados' }, { status: 400 })
    }

    const buffer = Buffer.from(base64, 'base64')
    let text = ''

    const isPDF = (filename?.toLowerCase().endsWith('.pdf')) || fileType === 'application/pdf'

    if (isPDF) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(buffer)
      text = result.text || ''
    } else {
      // TXT — decodificar como UTF-8
      text = new TextDecoder('utf-8').decode(buffer)
    }

    // Limpar espaços
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return NextResponse.json({ text: text.slice(0, 100000) })

  } catch (err) {
    console.error('[EXTRACT-TEXT] Error:', err)
    return NextResponse.json({ error: 'Erro ao extrair texto do arquivo' }, { status: 500 })
  }
}
