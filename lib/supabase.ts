import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client para uso no browser (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client com service role para uso nas API Routes (server-side only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

export type Edital = {
  id: string
  created_at: string
  updated_at: string
  numero_pregao: string
  numero_processo: string
  orgao: string
  objeto: string
  valor_estimado: string | null
  data_sessao: string | null
  status: 'pendente' | 'analisando' | 'concluido' | 'erro'
  recomendado: boolean | null
  arquivo_nome: string | null
  analise_raw: AnaliseCompleta | null
}

export type AnaliseCompleta = {
  dados_gerais: Record<string, string>
  habilitacao: HabilitacaoItem[]
  checklist: ChecklistItem[]
  requisitos_tecnicos: RequisitoItem[]
  formacao_precos: FormacaoItem[]
  cronograma: CronogramaItem[]
  irregularidades: IrregularidadeItem[]
  resumo_executivo: ResumoExecutivo
}

export type HabilitacaoItem = {
  categoria: string
  documento: string
  descricao: string
  obrigatorio: string
  item_edital: string
  observacoes: string
  status: string
}

export type ChecklistItem = {
  documento: string
  exigido: string
  item_edital: string
  possuimos: string
  valido: string
  precisa_atualizacao: string
  responsavel: string
  observacao: string
  status_final: string
}

export type RequisitoItem = {
  categoria: string
  descricao: string
  origem: string
  observacao: string
}

export type FormacaoItem = {
  componente: string
  lote1: string
  lote2: string
  orientacao: string
}

export type CronogramaItem = {
  evento: string
  data_prazo: string
  referencia: string
  observacao: string
  critico: boolean
}

export type IrregularidadeItem = {
  problema: string
  fundamentacao: string
  item_edital: string
  grau_risco: 'ALTO' | 'MÉDIO' | 'BAIXO'
  prioridade: string
  sugestao_acao: string
}

export type ResumoExecutivo = {
  recomendado: boolean
  justificativa_recomendacao: string
  principais_riscos: string[]
  principais_oportunidades: string[]
  documentos_criticos: string[]
  exigencias_tecnicas_relevantes: string[]
  probabilidade_sucesso: string
  necessidade_esclarecimentos: string[]
  necessidade_impugnacao: string
  checklist_resumido: { acao: string; prazo: string }[]
}
