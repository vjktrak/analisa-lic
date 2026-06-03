'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Edital = {
  id: string
  created_at: string
  numero_pregao: string
  numero_processo: string
  orgao: string
  objeto: string
  valor_estimado: string | null
  data_sessao: string | null
  status: string
  recomendado: boolean | null
  arquivo_nome: string | null
  notas: string | null
}

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const fetchEditais = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/editais${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      const json = await res.json()
      setEditais(json.data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchEditais() }, [fetchEditais])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Excluir este edital permanentemente?')) return
    setDeleting(id)
    try {
      await fetch(`/api/editais/${id}`, { method: 'DELETE' })
      setEditais(prev => prev.filter(e => e.id !== id))
    } catch { alert('Erro ao excluir.') }
    finally { setDeleting(null) }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pendente: 'bg-gray-100 text-gray-700',
      analisando: 'bg-blue-100 text-blue-700 animate-pulse',
      concluido: 'bg-green-100 text-green-700',
      erro: 'bg-red-100 text-red-700',
    }
    const label: Record<string, string> = {
      pendente: 'Pendente', analisando: 'Analisando…', concluido: 'Concluído', erro: 'Erro'
    }
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`}>
        {label[status] || status}
      </span>
    )
  }

  const counts = {
    total: editais.length,
    concluidos: editais.filter(e => e.status === 'concluido').length,
    recomendados: editais.filter(e => e.recomendado === true).length,
    pendentes: editais.filter(e => e.status === 'pendente').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">AnalisaLic</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{userEmail}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de Editais', value: counts.total, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Analisados', value: counts.concluidos, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Recomendados', value: counts.recomendados, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pendentes', value: counts.pendentes, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por órgão, objeto, número…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Edital
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : editais.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhum edital encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo Edital" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {editais.map(edital => (
              <div
                key={edital.id}
                onClick={() => router.push(`/edital/${edital.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all duration-150 fade-in group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-blue-700 text-sm">{edital.numero_pregao}</span>
                      {edital.numero_processo && (
                        <span className="text-gray-400 text-xs">Proc. {edital.numero_processo}</span>
                      )}
                      {statusBadge(edital.status)}
                      {edital.status === 'concluido' && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${edital.recomendado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {edital.recomendado ? '✓ Recomendado' : '✗ Não recomendado'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{edital.orgao}</p>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{edital.objeto}</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {edital.valor_estimado && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Valor:</span> {edital.valor_estimado}
                        </span>
                      )}
                      {edital.data_sessao && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Sessão:</span> {edital.data_sessao}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Adicionado {format(new Date(edital.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => handleDelete(edital.id, e)}
                      disabled={deleting === edital.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Excluir edital"
                    >
                      {deleting === edital.id ? (
                        <span className="spinner w-4 h-4 inline-block" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Novo Edital */}
      {showModal && <NewEditalModal onClose={() => setShowModal(false)} onCreated={(id) => { setShowModal(false); router.push(`/edital/${id}`) }} />}
    </div>
  )
}

// =========================================
// Modal de criação de novo edital
// =========================================
function NewEditalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState<'form' | 'uploading' | 'saving'>('form')
  const [form, setForm] = useState({
    numero_pregao: '', numero_processo: '', orgao: '', objeto: '',
    valor_estimado: '', data_sessao: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [fileText, setFileText] = useState('')
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 20 * 1024 * 1024) { setError('Arquivo muito grande (máx 20MB)'); return }
    setFile(f)
    setError('')
    // Lê o arquivo como texto se for PDF ou TXT
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      // Para PDF binário, extraímos o texto legível
      if (f.type === 'application/pdf') {
        // Extração básica de texto de PDF (fallback - o ideal é usar pdf-parse no backend)
        const text = result.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
        setFileText(text.slice(0, 100000))
      } else {
        setFileText(result.slice(0, 100000))
      }
    }
    if (f.type === 'application/pdf') {
      reader.readAsBinaryString(f)
    } else {
      reader.readAsText(f, 'UTF-8')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.numero_pregao || !form.orgao || !form.objeto) {
      setError('Preencha os campos obrigatórios (*)'); return
    }
    setStep('saving')
    setError('')
    try {
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, arquivo_nome: file?.name || null, arquivo_texto: fileText || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar')
      onCreated(json.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
      setStep('form')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Novo Edital</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº do Pregão *</label>
              <input className="input" placeholder="Ex: PE 030/2026" value={form.numero_pregao}
                onChange={e => setForm(f => ({ ...f, numero_pregao: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nº do Processo</label>
              <input className="input" placeholder="Ex: 7.843/2026" value={form.numero_processo}
                onChange={e => setForm(f => ({ ...f, numero_processo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Órgão Licitante *</label>
            <input className="input" placeholder="Ex: Prefeitura Municipal de Arroio do Sal – RS" value={form.orgao}
              onChange={e => setForm(f => ({ ...f, orgao: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objeto *</label>
            <textarea className="input resize-none" rows={2} placeholder="Descreva o objeto da licitação" value={form.objeto}
              onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado</label>
              <input className="input" placeholder="Ex: R$ 2.382.165,20" value={form.valor_estimado}
                onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Sessão</label>
              <input className="input" placeholder="Ex: 18/06/2026 às 13h30" value={form.data_sessao}
                onChange={e => setForm(f => ({ ...f, data_sessao: e.target.value }))} />
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo do Edital (PDF ou TXT)</label>
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400'}`}>
              <input type="file" accept=".pdf,.txt" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-sm">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-500">Clique para fazer upload ou arraste o arquivo</p>
                    <p className="text-xs text-gray-400 mt-1">PDF ou TXT, máx. 20MB</p>
                  </>
                )}
              </label>
            </div>
            {file && !fileText && (
              <p className="text-xs text-amber-600 mt-1">⚠ Extração de texto do PDF pode ser limitada. Para melhor resultado, use o arquivo TXT do edital.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={step !== 'form'} className="btn-primary flex-1">
              {step === 'saving' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner w-4 h-4 inline-block" /> Salvando…
                </span>
              ) : 'Salvar e Abrir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
