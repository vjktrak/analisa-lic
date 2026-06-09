import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { edital_id, analise } = await req.json()
    if (!edital_id || !analise) {
      return NextResponse.json({ error: 'edital_id e analise são obrigatórios' }, { status: 400 })
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
      .eq('id', edital_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[SAVE] Error:', err)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
