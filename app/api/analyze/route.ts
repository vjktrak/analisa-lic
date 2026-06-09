import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildAnalysisPrompt } from '@/lib/prompt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 55

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let editalId: string | null = null

  try {
    const body = await req.json()
    editalId = body.edital_id
    let textoEdital: string = body.texto_edital || ''

    if (!editalId || !textoEdital) {
      return NextResponse.json(
        { error: 'edital_id e texto_edital são obrigatórios' },
        { status: 400 }
      )
    }

    const MAX_CHARS = 3000
    if (textoEdital.length > MAX_CHARS) {
      textoEdital = textoEdital.slice(0, MAX_CHARS) + '\n[TRUNCADO]'
    }

    await supabaseAdmin
      .from('editais')
      .update({ status: 'analisando' })
      .eq('id', editalId)

    const prompt = buildAnalysisPrompt(textoEdital)

    // Usar streaming para evitar timeout — o Vercel não corta streams
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    // Coletar texto completo do stream
    let fullText = ''
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        fullText += chunk.delta.text
      }
    }

    // Parse do JSON
    let analise
    try {
      let clean = fullText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      if (!clean.endsWith('}')) {
        let open = 0
        for (const c of clean) {
          if (c === '{') open++
          else if (c === '}') open--
        }
        clean = clean.replace(/,\s*$/, '')
        while (open > 0) { clean += '}'; open-- }
      }

      analise = JSON.parse(clean)
    } catch (parseErr) {
      console.error('[ANALYZE] Parse error:', parseErr)
      console.error('[ANALYZE] Raw (last 200):', fullText.slice(-200))
      throw new Error('Erro ao processar resposta da IA. Tente novamente.')
    }

    const dadosGerais = analise.dados_gerais || {}
    const recomendado = analise.resumo_executivo?.recomendado ?? null

    const { data, error } = await supabaseAdmin
      .from('editais')
      .update({
        status: 'concluido',
        recomendado,
        analise_raw: analise,
        numero_processo: dadosGerais.numero_processo || undefined,
        valor_estimado: dadosGerais.valor_estimado_global || undefined,
        data_sessao: dadosGerais.data_sessao || undefined,
      })
      .eq('id', editalId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })

  } catch (err) {
    console.error('[ANALYZE] Error:', err)
    if (editalId) {
      await supabaseAdmin
        .from('editais')
        .update({ status: 'erro' })
        .eq('id', editalId)
        .catch(() => {})
    }
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
