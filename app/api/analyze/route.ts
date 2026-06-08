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

    // 20k chars de input → ~5k tokens → sobram ~7k tokens para o JSON de saída
    const MAX_CHARS = 10000
    if (textoEdital.length > MAX_CHARS) {
      textoEdital = textoEdital.slice(0, MAX_CHARS) +
        '\n\n[TEXTO TRUNCADO — análise baseada nos primeiros 20.000 caracteres]'
    }

    // Marcar como analisando
    await supabaseAdmin
      .from('editais')
      .update({ status: 'analisando' })
      .eq('id', editalId)

    const prompt = buildAnalysisPrompt(textoEdital)

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192, // máximo do Haiku — JSON completo sem truncar
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Resposta inesperada do Claude')
    }

    // Limpar e fazer parse do JSON
    let analise
    try {
      const cleanText = rawContent.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      // Verificar se o JSON foi truncado (não fecha com })
      if (!cleanText.endsWith('}')) {
        console.error('[ANALYZE] JSON truncado. stop_reason:', message.stop_reason)
        console.error('[ANALYZE] Últimos 200 chars:', cleanText.slice(-200))
        throw new Error('Resposta da IA incompleta (JSON truncado). Tente novamente com um edital menor.')
      }

      analise = JSON.parse(cleanText)
    } catch (parseErr) {
      console.error('[ANALYZE] JSON parse error:', parseErr)
      console.error('[ANALYZE] stop_reason:', message.stop_reason)
      console.error('[ANALYZE] Raw (primeiros 300):', rawContent.text.slice(0, 300))
      console.error('[ANALYZE] Raw (últimos 300):', rawContent.text.slice(-300))
      throw new Error(
        parseErr instanceof Error && parseErr.message.includes('truncado')
          ? parseErr.message
          : 'Erro ao processar resposta da IA. Tente novamente.'
      )
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
    const message = err instanceof Error ? err.message : 'Erro interno na análise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
