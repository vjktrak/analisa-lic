export function buildAnalysisPrompt(editalText: string): string {
  return `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021, jurisprudência do TCU e práticas de mercado.

Analise o edital abaixo e retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem texto antes ou depois) com a estrutura exata especificada.

TEXTO DO EDITAL:
===
${editalText.slice(0, 60000)}
===

Retorne o JSON com esta estrutura exata:

{
  "dados_gerais": {
    "numero_processo": "",
    "numero_pregao": "",
    "orgao_licitante": "",
    "modalidade": "",
    "criterio_julgamento": "",
    "modo_disputa": "",
    "objeto": "",
    "valor_estimado_global": "",
    "valor_referencial_unitario": "",
    "limite_exequibilidade": "",
    "prazo_contratual": "",
    "vigencia_prorrogacao": "",
    "data_sessao": "",
    "prazo_envio_propostas": "",
    "plataforma": "",
    "validade_proposta": "",
    "visita_tecnica": "",
    "amostras": "",
    "garantia_proposta": "",
    "garantia_contratual": "",
    "subcontratacao": "",
    "beneficios_me_epp": "",
    "regime_execucao": "",
    "pagamento": "",
    "criterio_aceitabilidade": "",
    "anexos": ""
  },
  "habilitacao": [
    {
      "categoria": "Habilitação Jurídica|Regularidade Fiscal|Regularidade Trabalhista|Qualificação Econômico-Financeira|Qualificação Técnica|Declarações",
      "documento": "nome do documento",
      "descricao": "descrição completa da exigência",
      "obrigatorio": "Sim|Não|Condicional",
      "item_edital": "ex: 12.1-a",
      "observacoes": "observações importantes",
      "status": "Pendente"
    }
  ],
  "checklist": [
    {
      "documento": "nome do documento ou ação",
      "exigido": "Sim|Não",
      "item_edital": "referência",
      "possuimos": "",
      "valido": "",
      "precisa_atualizacao": "",
      "responsavel": "",
      "observacao": "orientação importante",
      "status_final": "Pendente"
    }
  ],
  "requisitos_tecnicos": [
    {
      "categoria": "categoria do requisito",
      "descricao": "descrição completa",
      "origem": "item do edital ou TR",
      "observacao": "observação"
    }
  ],
  "itens_lotes": [
    {
      "lote": "1",
      "item": "1",
      "unidade": "unidade",
      "especificacao": "descrição",
      "quantidade": "quantidade",
      "valor_unitario_referencial": "R$ 0,00",
      "valor_total_estimado": "R$ 0,00"
    }
  ],
  "formacao_precos": [
    {
      "componente": "nome do componente de custo",
      "lote1": "",
      "lote2": "",
      "orientacao": "orientação para cálculo"
    }
  ],
  "cronograma": [
    {
      "evento": "nome do evento",
      "data_prazo": "data ou prazo",
      "referencia": "item do edital",
      "observacao": "observação",
      "critico": true
    }
  ],
  "irregularidades": [
    {
      "problema": "descrição do problema",
      "fundamentacao": "base legal ou técnica",
      "item_edital": "item(ns) afetado(s)",
      "grau_risco": "ALTO|MÉDIO|BAIXO",
      "prioridade": "IMPUGNAÇÃO URGENTE|ESCLARECIMENTO|ATENÇÃO OPERACIONAL|SEM AÇÃO",
      "sugestao_acao": "o que fazer"
    }
  ],
  "resumo_executivo": {
    "recomendado": true,
    "justificativa_recomendacao": "justificativa objetiva",
    "principais_riscos": ["risco 1", "risco 2"],
    "principais_oportunidades": ["oportunidade 1", "oportunidade 2"],
    "documentos_criticos": ["documento 1", "documento 2"],
    "exigencias_tecnicas_relevantes": ["exigência 1", "exigência 2"],
    "probabilidade_sucesso": "ALTA|MÉDIA-ALTA|MÉDIA|BAIXA",
    "necessidade_esclarecimentos": ["ponto 1", "ponto 2"],
    "necessidade_impugnacao": "Sim, pois... | Não há fundamentos para impugnação",
    "checklist_resumido": [
      { "acao": "ação prioritária", "prazo": "prazo" }
    ]
  }
}

INSTRUÇÕES CRÍTICAS:
1. Retorne APENAS o JSON, sem nenhum texto antes ou depois
2. Não use markdown (sem \`\`\`json)
3. Seja completo - não omita nenhum documento exigido
4. Identifique divergências entre edital e anexos
5. Grau de risco: ALTO = impede participação/execução, MÉDIO = risco relevante, BAIXO = observação
6. Para o checklist, inclua TODOS os documentos da habilitação mais ações operacionais
7. Para cronograma, marque critico:true para prazos que geram preclusão ou inabilitação`
}
