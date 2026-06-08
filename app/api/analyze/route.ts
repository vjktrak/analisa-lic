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

    // 10k chars → ~2.500 tokens input, deixa espaço para output
    const MAX_CHARS = 10000
    if (textoEdital.length > MAX_CHARS) {
      textoEdital = textoEdital.slice(0, MAX_CHARS) +
        '\n[TRUNCADO — primeiros 10.000 caracteres]'
    }

    await supabaseAdmin
      .from('editais')
      .update({ status: 'analisando' })
      .eq('id', editalId)

    const prompt = buildAnalysisPrompt(textoEdital)

    // max_tokens: 3500 — JSON completo com estrutura compacta cabe em ~3000 tokens
    // O Haiku gera ~100 tokens/s → 3500 tokens = ~35s, bem abaixo do limite de 55s
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Resposta inesperada do Claude')
    }

    let analise
    try {
      let cleanText = rawContent.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      // Tentar fechar JSON truncado automaticamente
      if (!cleanText.endsWith('}')) {
        // Contar chaves abertas e fechar
        let open = 0
        for (const c of cleanText) {
          if (c === '{') open++
          else if (c === '}') open--
        }
        // Remover trailing vírgulas e fechar
        cleanText = cleanText.replace(/,\s*$/, '')
        while (open > 0) {
          cleanText += '}'
          open--
        }
      }

      analise = JSON.parse(cleanText)
    } catch (parseErr) {
      console.error('[ANALYZE] JSON parse error:', parseErr)
      console.error('[ANALYZE] stop_reason:', message.stop_reason)
      console.error('[ANALYZE] usage:', JSON.stringify(message.usage))
      console.error('[ANALYZE] Raw últimos 200:', rawContent.text.slice(-200))
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
    const message = err instanceof Error ? err.message : 'Erro interno na análise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
