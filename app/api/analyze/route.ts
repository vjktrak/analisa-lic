import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { buildAnalysisPrompt } from '@/lib/prompt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const maxDuration = 120 // 2 minutos (Vercel Pro) — free: 60s

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let editalId: string | null = null

  try {
    const body = await req.json()
    editalId = body.edital_id
    const textoEdital: string = body.texto_edital

    if (!editalId || !textoEdital) {
      return NextResponse.json({ error: 'edital_id e texto_edital são obrigatórios' }, { status: 400 })
    }

    // Marcar como "analisando"
    await supabaseAdmin
      .from('editais')
      .update({ status: 'analisando' })
      .eq('id', editalId)

    // Chamar a API do Claude
    const prompt = buildAnalysisPrompt(textoEdital)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Resposta inesperada do Claude')
    }

    // Parse do JSON retornado
    let analise
    try {
      // Remove possíveis backticks se o modelo incluir
      const cleanText = rawContent.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      analise = JSON.parse(cleanText)
    } catch (parseErr) {
      console.error('[ANALYZE] JSON parse error:', parseErr)
      console.error('[ANALYZE] Raw response:', rawContent.text.slice(0, 500))
      throw new Error('Erro ao processar resposta da IA. Tente novamente.')
    }

    // Extrair campos principais do resultado
    const dadosGerais = analise.dados_gerais || {}
    const recomendado = analise.resumo_executivo?.recomendado ?? null

    // Salvar no banco
    const { data, error } = await supabaseAdmin
      .from('editais')
      .update({
        status: 'concluido',
        recomendado,
        analise_raw: analise,
        // Atualizar campos se vieram da análise
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

    // Marcar como erro se temos o ID
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
