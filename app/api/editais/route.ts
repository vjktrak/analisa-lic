import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/editais - listar todos os editais
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q') || ''

    let query = supabaseAdmin
      .from('editais')
      .select('id,created_at,updated_at,numero_pregao,numero_processo,orgao,objeto,valor_estimado,data_sessao,status,recomendado,arquivo_nome,notas')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`orgao.ilike.%${search}%,objeto.ilike.%${search}%,numero_pregao.ilike.%${search}%,numero_processo.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    console.error('[EDITAIS] GET error:', err)
    return NextResponse.json({ error: 'Erro ao buscar editais' }, { status: 500 })
  }
}

// POST /api/editais - criar novo edital
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { numero_pregao, numero_processo, orgao, objeto, valor_estimado, data_sessao, arquivo_nome } = body
    // Limitar arquivo_texto a 50.000 chars para não exceder limites do banco/request
    const arquivo_texto = body.arquivo_texto ? String(body.arquivo_texto).slice(0, 50000) : null

    if (!numero_pregao || !orgao || !objeto) {
      return NextResponse.json({ error: 'Campos obrigatórios: numero_pregao, orgao, objeto' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('editais')
      .insert({
        numero_pregao, numero_processo, orgao, objeto,
        valor_estimado, data_sessao, arquivo_nome, arquivo_texto,
        status: arquivo_texto ? 'pendente' : 'pendente'
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[EDITAIS] POST error:', err)
    return NextResponse.json({ error: 'Erro ao criar edital' }, { status: 500 })
  }
}
