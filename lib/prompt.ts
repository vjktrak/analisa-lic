export function buildAnalysisPrompt(editalText: string): string {
  // Limitar a 10k chars — o Haiku processa em ~25s com esse tamanho
  const texto = editalText.slice(0, 10000)

  return `Você é especialista em licitações públicas brasileiras (Lei 14.133/2021).

Analise o edital abaixo e retorne SOMENTE um JSON válido, sem markdown, sem texto extra.

EDITAL:
===
${texto}
===

JSON obrigatório (preencha todos os campos com base no edital):

{
  "dados_gerais": {
    "numero_processo": "",
    "numero_pregao": "",
    "orgao_licitante": "",
    "modalidade": "",
    "objeto": "",
    "valor_estimado_global": "",
    "data_sessao": "",
    "prazo_envio_propostas": "",
    "plataforma": "",
    "criterio_julgamento": "",
    "modo_disputa": "",
    "prazo_contratual": "",
    "pagamento": "",
    "garantia_contratual": "",
    "beneficios_me_epp": "",
    "visita_tecnica": ""
  },
  "habilitacao": [
    { "categoria": "", "documento": "", "descricao": "", "obrigatorio": "Sim|Não|Condicional", "item_edital": "", "observacoes": "", "status": "Pendente" }
  ],
  "checklist": [
    { "documento": "", "exigido": "Sim|Não", "item_edital": "", "possuimos": "", "valido": "", "precisa_atualizacao": "", "responsavel": "", "observacao": "", "status_final": "Pendente" }
  ],
  "requisitos_tecnicos": [
    { "categoria": "", "descricao": "", "origem": "", "observacao": "" }
  ],
  "itens_lotes": [
    { "lote": "1", "item": "1", "unidade": "", "especificacao": "", "quantidade": "", "valor_unitario_referencial": "", "valor_total_estimado": "" }
  ],
  "formacao_precos": [
    { "componente": "", "lote1": "", "lote2": "", "orientacao": "" }
  ],
  "cronograma": [
    { "evento": "", "data_prazo": "", "referencia": "", "observacao": "", "critico": true }
  ],
  "irregularidades": [
    { "problema": "", "fundamentacao": "", "item_edital": "", "grau_risco": "ALTO|MÉDIO|BAIXO", "prioridade": "", "sugestao_acao": "" }
  ],
  "resumo_executivo": {
    "recomendado": true,
    "justificativa_recomendacao": "",
    "principais_riscos": [""],
    "principais_oportunidades": [""],
    "documentos_criticos": [""],
    "probabilidade_sucesso": "ALTA|MÉDIA-ALTA|MÉDIA|BAIXA",
    "necessidade_esclarecimentos": [""],
    "necessidade_impugnacao": "",
    "checklist_resumido": [{ "acao": "", "prazo": "" }]
  }
}

REGRAS: Retorne APENAS o JSON. Sem texto antes ou depois. Sem markdown.`
}
