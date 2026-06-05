import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text = ''

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(buffer)
      text = result.text || ''
    } else {
      // TXT — decodificar como UTF-8
      text = new TextDecoder('utf-8').decode(buffer)
    }

    // Limpar espaços e limitar
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
