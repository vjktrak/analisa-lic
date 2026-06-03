import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/editais/[id] - buscar edital completo com análise
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from('editais')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[EDITAIS] GET single error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/editais/[id] - atualizar campos (notas, dados manuais, checklist)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    // Permite atualizar: notas, analise_raw (para salvar preenchimentos do checklist)
    const allowed = ['notas', 'analise_raw', 'numero_pregao', 'numero_processo', 'orgao', 'objeto', 'valor_estimado', 'data_sessao']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('editais')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[EDITAIS] PATCH error:', err)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// DELETE /api/editais/[id] - excluir edital
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { error } = await supabaseAdmin
      .from('editais')
      .delete()
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[EDITAIS] DELETE error:', err)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
