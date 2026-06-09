'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Edital, AnaliseCompleta, ChecklistItem, IrregularidadeItem, CronogramaItem } from '@/lib/supabase'

type Tab = 'resumo' | 'dados' | 'habilitacao' | 'checklist' | 'tecnicos' | 'precos' | 'cronograma' | 'irregularidades' | 'notas'

export default function EditalDetailClient({ id }: { id: string }) {
  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('resumo')
  const [notas, setNotas] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null)
  const router = useRouter()

  const fetchEdital = useCallback(async () => {
    try {
      const res = await fetch(`/api/editais/${id}`)
      const json = await res.json()
      if (json.data) {
        setEdital(json.data)
        setNotas(json.data.notas || '')
        setAnalise(json.data.analise_raw || null)
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchEdital() }, [fetchEdital])

  // Poll status se estiver analisando
  useEffect(() => {
    if (edital?.status !== 'analisando') return
    const interval = setInterval(fetchEdital, 4000)
    return () => clearInterval(interval)
  }, [edital?.status, fetchEdital])

  async function handleAnalyze() {
    if (!edital?.arquivo_texto) {
      alert('Este edital não possui texto extraído. Faça o upload do arquivo novamente.')
      return
    }
    setAnalyzing(true)
    try {
      // Marcar como analisando via API local (rápido, sem timeout)
      await fetch(`/api/editais/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'analisando' }),
      })
      await fetchEdital()

      // Chamar Anthropic API diretamente do browser (sem limite de 60s do Vercel)
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('Chave da API não configurada')

      const texto = edital.arquivo_texto.slice(0, 10000)
      const prompt = buildPrompt(texto)

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const anthropicJson = await anthropicRes.json()
      if (!anthropicRes.ok) {
        throw new Error(anthropicJson.error?.message || 'Erro na API da Anthropic')
      }

      const rawText = anthropicJson.content?.[0]?.text || ''
      let analise
      try {
        let clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
        if (!clean.endsWith('}')) {
          let open = 0
          for (const c of clean) { if (c === '{') open++; else if (c === '}') open-- }
          clean = clean.replace(/,\s*$/, '')
          while (open > 0) { clean += '}'; open-- }
        }
        analise = JSON.parse(clean)
      } catch {
        throw new Error('Erro ao processar resposta da IA. Tente novamente.')
      }

      // Salvar resultado via API local
      const saveRes = await fetch('/api/analyze/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edital_id: id, analise }),
      })
      const saveText = await saveRes.text()
      if (!saveRes.ok) throw new Error('Erro ao salvar análise')

      await fetchEdital()
      setActiveTab('resumo')
    } catch (err) {
      // Marcar como erro
      await fetch(`/api/editais/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'erro' }),
      }).catch(() => {})
      alert(err instanceof Error ? err.message : 'Erro na análise')
    } finally { setAnalyzing(false) }
  }

  function buildPrompt(texto: string): string {
    return `Você é especialista em licitações públicas brasileiras (Lei 14.133/2021).

Analise o edital e retorne SOMENTE JSON válido, sem markdown.

EDITAL:
===
${texto}
===

Retorne EXATAMENTE este JSON (sem texto antes/depois, sem markdown):
{
  "dados_gerais": {"numero_processo":"","numero_pregao":"","orgao_licitante":"","modalidade":"","objeto":"","valor_estimado_global":"","data_sessao":"","prazo_envio_propostas":"","plataforma":"","criterio_julgamento":"","modo_disputa":"","prazo_contratual":"","pagamento":"","garantia_contratual":"","beneficios_me_epp":"","visita_tecnica":""},
  "habilitacao": [{"categoria":"","documento":"","descricao":"","obrigatorio":"Sim","item_edital":"","observacoes":"","status":"Pendente"}],
  "checklist": [{"documento":"","exigido":"Sim","item_edital":"","possuimos":"","valido":"","precisa_atualizacao":"","responsavel":"","observacao":"","status_final":"Pendente"}],
  "requisitos_tecnicos": [{"categoria":"","descricao":"","origem":"","observacao":""}],
  "itens_lotes": [{"lote":"1","item":"1","unidade":"","especificacao":"","quantidade":"","valor_unitario_referencial":"","valor_total_estimado":""}],
  "formacao_precos": [{"componente":"","lote1":"","lote2":"","orientacao":""}],
  "cronograma": [{"evento":"","data_prazo":"","referencia":"","observacao":"","critico":true}],
  "irregularidades": [{"problema":"","fundamentacao":"","item_edital":"","grau_risco":"MÉDIO","prioridade":"","sugestao_acao":""}],
  "resumo_executivo": {"recomendado":true,"justificativa_recomendacao":"","principais_riscos":[""],"principais_oportunidades":[""],"documentos_criticos":[""],"probabilidade_sucesso":"MÉDIA","necessidade_esclarecimentos":[""],"necessidade_impugnacao":"","checklist_resumido":[{"acao":"","prazo":""}]}
}`
  }

  async function handleResetStatus() {
    try {
      await fetch(`/api/editais/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pendente' }),
      })
      await fetchEdital()
    } catch { /* ignore */ }
  }

  async function handleSaveNotas() {
    setSavingNotas(true)
    try {
      await fetch(`/api/editais/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas }),
      })
    } finally { setSavingNotas(false) }
  }

  async function handleSaveChecklist(updated: ChecklistItem[]) {
    if (!analise) return
    const updatedAnalise = { ...analise, checklist: updated }
    setAnalise(updatedAnalise)
    await fetch(`/api/editais/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analise_raw: updatedAnalise }),
    })
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'resumo', label: 'Resumo', icon: '📋' },
    { key: 'dados', label: 'Dados Gerais', icon: '📌' },
    { key: 'habilitacao', label: 'Habilitação', icon: '📄' },
    { key: 'checklist', label: 'Checklist', icon: '✅' },
    { key: 'tecnicos', label: 'Req. Técnicos', icon: '🔧' },
    { key: 'precos', label: 'Preços', icon: '💰' },
    { key: 'cronograma', label: 'Cronograma', icon: '📅' },
    { key: 'irregularidades', label: 'Irregularidades', icon: '⚠️' },
    { key: 'notas', label: 'Notas', icon: '📝' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="spinner w-10 h-10 mx-auto mb-3" />
        <p className="text-gray-500">Carregando edital…</p>
      </div>
    </div>
  )

  if (!edital) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Edital não encontrado.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-blue-700">{edital.numero_pregao}</span>
              <span className="text-gray-400 text-sm hidden sm:inline">•</span>
              <span className="text-gray-700 text-sm font-medium truncate hidden sm:inline">{edital.orgao}</span>
              <StatusBadge status={edital.status} />
              {edital.status === 'concluido' && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${edital.recomendado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {edital.recomendado ? '✓ Recomendado' : '✗ Não recomendado'}
                </span>
              )}
            </div>
          </div>
          {edital.arquivo_texto && edital.status !== 'concluido' && edital.status !== 'analisando' && edital.status !== 'erro' && (
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              {analyzing || edital.status === 'analisando' ? (
                <><span className="spinner w-4 h-4 inline-block" /> Analisando…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>Analisar com IA</>
              )}
            </button>
          )}
          {edital.status === 'concluido' && (
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1" title="Re-analisar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analisar
            </button>
          )}
        </div>
      </header>

      {/* Status analisando */}
      {edital.status === 'analisando' && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="spinner w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Análise em andamento…</p>
            <p className="text-xs text-blue-600">O Claude está processando o edital. Isso pode levar até 60 segundos. Esta página atualiza automaticamente.</p>
          </div>
          <button
            onClick={handleResetStatus}
            className="text-xs text-blue-700 border border-blue-300 rounded px-3 py-1 hover:bg-blue-100"
          >
            Cancelar / Tentar novamente
          </button>
        </div>
      )}

      {/* Status erro */}
      {edital.status === 'erro' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Erro na análise</p>
            <p className="text-xs text-red-600">Ocorreu um erro ao processar o edital. Clique em "Tentar novamente" para reiniciar.</p>
          </div>
          <button
            onClick={handleResetStatus}
            className="text-xs text-white bg-red-600 rounded px-3 py-1 hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Sem análise ainda */}
      {!analise && edital.status === 'pendente' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pronto para análise</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {edital.arquivo_texto
              ? 'O arquivo foi carregado. Clique em "Analisar com IA" para iniciar a análise completa do edital.'
              : 'Nenhum arquivo foi carregado. Faça o upload do edital para habilitar a análise com IA.'}
          </p>
          {edital.arquivo_texto && (
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary px-8 py-3 text-base">
              Analisar com IA agora
            </button>
          )}
        </div>
      )}

      {/* Conteúdo da análise */}
      {analise && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo por aba */}
          <div className="fade-in">
            {activeTab === 'resumo' && <TabResumo analise={analise} />}
            {activeTab === 'dados' && <TabDados analise={analise} />}
            {activeTab === 'habilitacao' && <TabHabilitacao analise={analise} />}
            {activeTab === 'checklist' && <TabChecklist analise={analise} onSave={handleSaveChecklist} />}
            {activeTab === 'tecnicos' && <TabTecnicos analise={analise} />}
            {activeTab === 'precos' && <TabPrecos analise={analise} />}
            {activeTab === 'cronograma' && <TabCronograma analise={analise} />}
            {activeTab === 'irregularidades' && <TabIrregularidades analise={analise} />}
            {activeTab === 'notas' && (
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-4">Notas e Observações Internas</h2>
                <textarea
                  className="input resize-none min-h-[300px] font-mono text-sm"
                  placeholder="Adicione suas notas, observações e estratégias para este edital…"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                />
                <div className="flex justify-end mt-3">
                  <button onClick={handleSaveNotas} disabled={savingNotas} className="btn-primary">
                    {savingNotas ? 'Salvando…' : 'Salvar Notas'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── STATUS BADGE ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-gray-100 text-gray-700',
    analisando: 'bg-blue-100 text-blue-700 animate-pulse',
    concluido: 'bg-green-100 text-green-700',
    erro: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = { pendente: 'Pendente', analisando: 'Analisando…', concluido: 'Concluído', erro: 'Erro' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`}>{label[status] || status}</span>
}

// ── ABA RESUMO ────────────────────────────────────────────
function TabResumo({ analise }: { analise: AnaliseCompleta }) {
  const r = analise.resumo_executivo
  if (!r) return <p className="text-gray-400">Resumo não disponível.</p>
  return (
    <div className="space-y-6">
      {/* Recomendação */}
      <div className={`rounded-xl p-6 border-2 ${r.recomendado ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{r.recomendado ? '✅' : '❌'}</span>
          <div>
            <p className="font-bold text-lg text-gray-900">
              Participação: <span className={r.recomendado ? 'text-green-700' : 'text-red-700'}>{r.recomendado ? 'RECOMENDADA' : 'NÃO RECOMENDADA'}</span>
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{r.justificativa_recomendacao}</p>
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-500">Probabilidade: </span>
            <span className="font-semibold text-gray-800">{r.probabilidade_sucesso}</span>
          </div>
          <div className="bg-white rounded-lg px-3 py-1.5 text-sm">
            <span className="text-gray-500">Impugnação: </span>
            <span className="font-semibold text-gray-800">{r.necessidade_impugnacao?.startsWith('Sim') ? '⚠ Sim' : '✓ Não necessária'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Riscos */}
        <div className="card">
          <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2"><span>⚠️</span> Principais Riscos</h3>
          <ul className="space-y-2">
            {r.principais_riscos?.map((risco, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-red-400 flex-shrink-0 mt-0.5">•</span> {risco}
              </li>
            ))}
          </ul>
        </div>

        {/* Oportunidades */}
        <div className="card">
          <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2"><span>💡</span> Oportunidades</h3>
          <ul className="space-y-2">
            {r.principais_oportunidades?.map((op, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-green-400 flex-shrink-0 mt-0.5">•</span> {op}
              </li>
            ))}
          </ul>
        </div>

        {/* Docs críticos */}
        <div className="card">
          <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2"><span>📄</span> Documentos Críticos</h3>
          <ul className="space-y-2">
            {r.documentos_criticos?.map((doc, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span> {doc}
              </li>
            ))}
          </ul>
        </div>

        {/* Esclarecimentos */}
        <div className="card">
          <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2"><span>❓</span> Pontos para Esclarecimento</h3>
          <ul className="space-y-2">
            {r.necessidade_esclarecimentos?.map((e, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span> {e}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Checklist resumido */}
      {r.checklist_resumido?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><span>✅</span> Checklist Resumido de Participação</h3>
          <div className="space-y-2">
            {r.checklist_resumido.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-sm text-gray-800 flex-1">{item.acao}</span>
                <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">{item.prazo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ABA DADOS GERAIS ─────────────────────────────────────
function TabDados({ analise }: { analise: AnaliseCompleta }) {
  const dados = analise.dados_gerais
  if (!dados) return <p className="text-gray-400">Dados não disponíveis.</p>
  const labels: Record<string, string> = {
    numero_processo: 'Processo Nº', numero_pregao: 'Pregão Nº', orgao_licitante: 'Órgão Licitante',
    modalidade: 'Modalidade', criterio_julgamento: 'Critério de Julgamento', modo_disputa: 'Modo de Disputa',
    objeto: 'Objeto', valor_estimado_global: 'Valor Estimado Global', valor_referencial_unitario: 'Valor Referencial Unit.',
    limite_exequibilidade: 'Limite de Exequibilidade', prazo_contratual: 'Prazo Contratual', vigencia_prorrogacao: 'Vigência/Reajuste',
    data_sessao: 'Data da Sessão', prazo_envio_propostas: 'Prazo Envio Propostas', plataforma: 'Plataforma',
    validade_proposta: 'Validade da Proposta', visita_tecnica: 'Visita Técnica', amostras: 'Amostras',
    garantia_proposta: 'Garantia de Proposta', garantia_contratual: 'Garantia Contratual', subcontratacao: 'Subcontratação',
    beneficios_me_epp: 'Benefícios ME/EPP', regime_execucao: 'Regime de Execução', pagamento: 'Pagamento',
    criterio_aceitabilidade: 'Critério de Aceitabilidade', anexos: 'Anexos',
  }
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-bold text-gray-800 mb-4">Dados Gerais do Edital</h2>
      <table className="w-full analysis-table">
        <tbody>
          {Object.entries(dados).filter(([, v]) => v).map(([k, v], i) => (
            <tr key={k}>
              <td className={`font-semibold text-blue-900 w-40 ${i % 2 === 0 ? 'bg-blue-50' : ''}`}>{labels[k] || k}</td>
              <td className={i % 2 === 0 ? '' : 'bg-gray-50'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ABA HABILITAÇÃO ───────────────────────────────────────
function TabHabilitacao({ analise }: { analise: AnaliseCompleta }) {
  const items = analise.habilitacao || []
  const categorias = [...new Set(items.map(i => i.categoria))]
  return (
    <div className="space-y-6">
      {categorias.map(cat => {
        const catItems = items.filter(i => i.categoria === cat)
        return (
          <div key={cat} className="card overflow-x-auto">
            <h3 className="font-bold text-blue-800 mb-3">{cat}</h3>
            <table className="w-full analysis-table">
              <thead>
                <tr>
                  <th>Documento</th><th>Descrição</th><th>Obrigatório</th><th>Item Edital</th><th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {catItems.map((item, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-gray-800 min-w-[140px]">{item.documento}</td>
                    <td className="min-w-[200px]">{item.descricao}</td>
                    <td>
                      <span className={`font-semibold ${item.obrigatorio === 'Sim' ? 'text-green-700' : item.obrigatorio === 'Condicional' ? 'text-amber-700' : 'text-gray-500'}`}>
                        {item.obrigatorio}
                      </span>
                    </td>
                    <td className="text-blue-700 font-mono text-xs whitespace-nowrap">{item.item_edital}</td>
                    <td className="text-gray-500 min-w-[160px]">{item.observacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ── ABA CHECKLIST ─────────────────────────────────────────
function TabChecklist({ analise, onSave }: { analise: AnaliseCompleta; onSave: (items: ChecklistItem[]) => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(analise.checklist || [])
  const [saving, setSaving] = useState(false)

  const statusOptions = ['Pendente', 'OK', 'Em Elaboração', 'Não Aplicável']
  const simNao = ['', 'Sim', 'Não']

  function updateItem(index: number, field: keyof ChecklistItem, value: string) {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    setItems(updated)
  }

  async function handleSave() {
    setSaving(true)
    await onSave(items)
    setSaving(false)
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">Checklist Operacional</h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-1.5 px-4">
          {saving ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
      <table className="w-full analysis-table min-w-[900px]">
        <thead>
          <tr>
            <th className="min-w-[200px]">Documento</th>
            <th>Item</th>
            <th>Possuímos?</th>
            <th>Válido?</th>
            <th>Precisa Atualiz.?</th>
            <th className="min-w-[120px]">Responsável</th>
            <th className="min-w-[160px]">Observação</th>
            <th>Status Final</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="font-medium text-gray-800">{item.documento}</td>
              <td className="text-blue-700 font-mono text-xs">{item.item_edital}</td>
              <td>
                <select value={item.possuimos} onChange={e => updateItem(i, 'possuimos', e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 w-full">
                  {simNao.map(o => <option key={o}>{o}</option>)}
                </select>
              </td>
              <td>
                <select value={item.valido} onChange={e => updateItem(i, 'valido', e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 w-full">
                  {simNao.map(o => <option key={o}>{o}</option>)}
                </select>
              </td>
              <td>
                <select value={item.precisa_atualizacao} onChange={e => updateItem(i, 'precisa_atualizacao', e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 w-full">
                  {simNao.map(o => <option key={o}>{o}</option>)}
                </select>
              </td>
              <td>
                <input value={item.responsavel} onChange={e => updateItem(i, 'responsavel', e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 w-full" placeholder="Nome" />
              </td>
              <td>
                <input value={item.observacao} onChange={e => updateItem(i, 'observacao', e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 w-full" placeholder="Obs." />
              </td>
              <td>
                <select value={item.status_final}
                  onChange={e => updateItem(i, 'status_final', e.target.value)}
                  className={`text-xs border rounded px-1 py-0.5 w-full font-semibold ${
                    item.status_final === 'OK' ? 'text-green-700 bg-green-50' :
                    item.status_final === 'Pendente' ? 'text-red-700 bg-red-50' :
                    item.status_final === 'Em Elaboração' ? 'text-blue-700 bg-blue-50' :
                    'text-gray-500'
                  }`}>
                  {statusOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ABA REQUISITOS TÉCNICOS ───────────────────────────────
function TabTecnicos({ analise }: { analise: AnaliseCompleta }) {
  const items = analise.requisitos_tecnicos || []
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-bold text-gray-800 mb-4">Requisitos Técnicos</h2>
      <table className="w-full analysis-table">
        <thead>
          <tr><th>Categoria</th><th>Descrição</th><th>Origem</th><th>Observação</th></tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="font-semibold text-blue-800 whitespace-nowrap">{item.categoria}</td>
              <td>{item.descricao}</td>
              <td className="text-blue-600 font-mono text-xs whitespace-nowrap">{item.origem}</td>
              <td className="text-gray-500">{item.observacao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ABA PREÇOS ────────────────────────────────────────────
function TabPrecos({ analise }: { analise: AnaliseCompleta }) {
  const lotes = (analise as any).itens_lotes || []
  const precos = analise.formacao_precos || []
  return (
    <div className="space-y-6">
      {lotes.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="font-bold text-gray-800 mb-4">Itens / Lotes</h2>
          <table className="w-full analysis-table">
            <thead>
              <tr><th>Lote</th><th>Item</th><th>Und.</th><th>Especificação</th><th>Qtd.</th><th>Valor Unit. Ref.</th><th>Total Estimado</th></tr>
            </thead>
            <tbody>
              {lotes.map((l: any, i: number) => (
                <tr key={i}>
                  <td className="font-bold text-blue-800">{l.lote}</td>
                  <td>{l.item}</td>
                  <td>{l.unidade}</td>
                  <td>{l.especificacao}</td>
                  <td className="font-semibold">{l.quantidade}</td>
                  <td className="text-green-700 font-semibold">{l.valor_unitario_referencial}</td>
                  <td className="text-green-700 font-bold">{l.valor_total_estimado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card overflow-x-auto">
        <h2 className="font-bold text-gray-800 mb-4">Planilha de Formação de Preços</h2>
        <table className="w-full analysis-table">
          <thead>
            <tr><th>Componente de Custo</th><th>Lote 1 (R$/unid)</th><th>Lote 2 (R$/unid)</th><th>Orientação</th></tr>
          </thead>
          <tbody>
            {precos.map((p, i) => (
              <tr key={i}>
                <td className="font-semibold text-gray-800">{p.componente}</td>
                <td><input className="text-xs border rounded px-1 py-0.5 w-24" placeholder="0,00" defaultValue={p.lote1} /></td>
                <td><input className="text-xs border rounded px-1 py-0.5 w-24" placeholder="0,00" defaultValue={p.lote2} /></td>
                <td className="text-gray-500 text-xs">{p.orientacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── ABA CRONOGRAMA ────────────────────────────────────────
function TabCronograma({ analise }: { analise: AnaliseCompleta }) {
  const items: CronogramaItem[] = analise.cronograma || []
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-bold text-gray-800 mb-4">Cronograma da Licitação</h2>
      <table className="w-full analysis-table">
        <thead>
          <tr><th>Evento</th><th>Data / Prazo</th><th>Referência</th><th>Observação</th></tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={item.critico ? '' : ''}>
              <td className={`font-semibold ${item.critico ? 'text-amber-800' : 'text-gray-800'}`}>
                {item.critico && <span className="mr-1">⚠</span>}{item.evento}
              </td>
              <td className={`font-bold whitespace-nowrap ${item.critico ? 'text-amber-700' : 'text-gray-700'}`}>{item.data_prazo}</td>
              <td className="text-blue-600 font-mono text-xs">{item.referencia}</td>
              <td className="text-gray-500">{item.observacao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ABA IRREGULARIDADES ───────────────────────────────────
function TabIrregularidades({ analise }: { analise: AnaliseCompleta }) {
  const items: IrregularidadeItem[] = analise.irregularidades || []
  const riscoColor = (r: string) => ({
    'ALTO': 'badge-alto', 'MÉDIO': 'badge-medio', 'BAIXO': 'badge-baixo'
  }[r] || 'badge-baixo')
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className={`card border-l-4 ${item.grau_risco === 'ALTO' ? 'border-l-red-500' : item.grau_risco === 'MÉDIO' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="font-bold text-gray-900">{item.problema}</h3>
            <div className="flex gap-2 flex-shrink-0">
              <span className={riscoColor(item.grau_risco)}>{item.grau_risco}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fundamentação</p>
              <p className="text-gray-700">{item.fundamentacao}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Sugestão de Ação</p>
              <p className="text-gray-700">{item.sugestao_acao}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            <span className="text-xs text-blue-700 font-mono bg-blue-50 px-2 py-0.5 rounded">Item: {item.item_edital}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              item.prioridade?.includes('URGENTE') ? 'bg-red-100 text-red-700' :
              item.prioridade?.includes('ESCLARECIMENTO') ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>{item.prioridade}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
