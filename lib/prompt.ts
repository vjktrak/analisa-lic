export function buildAnalysisPrompt(editalText: string): string {
  const texto = editalText.slice(0, 5000)
  return `Analise este edital de licitação pública brasileira. Retorne APENAS JSON válido sem markdown.

EDITAL:
${texto}

JSON (preencha com dados do edital, máximo 3 itens por array):
{"dados_gerais":{"numero_processo":"","numero_pregao":"","orgao_licitante":"","modalidade":"","objeto":"","valor_estimado_global":"","data_sessao":"","prazo_envio_propostas":"","plataforma":"","criterio_julgamento":"","modo_disputa":"","prazo_contratual":"","pagamento":"","garantia_contratual":"","beneficios_me_epp":"","visita_tecnica":""},"habilitacao":[{"categoria":"","documento":"","descricao":"","obrigatorio":"Sim","item_edital":"","observacoes":"","status":"Pendente"}],"checklist":[{"documento":"","exigido":"Sim","item_edital":"","possuimos":"","valido":"","precisa_atualizacao":"","responsavel":"","observacao":"","status_final":"Pendente"}],"requisitos_tecnicos":[{"categoria":"","descricao":"","origem":"","observacao":""}],"itens_lotes":[{"lote":"1","item":"1","unidade":"","especificacao":"","quantidade":"","valor_unitario_referencial":"","valor_total_estimado":""}],"formacao_precos":[{"componente":"","lote1":"","orientacao":""}],"cronograma":[{"evento":"","data_prazo":"","referencia":"","critico":true}],"irregularidades":[{"problema":"","fundamentacao":"","grau_risco":"MÉDIO","sugestao_acao":""}],"resumo_executivo":{"recomendado":true,"justificativa_recomendacao":"","principais_riscos":[""],"principais_oportunidades":[""],"documentos_criticos":[""],"probabilidade_sucesso":"MÉDIA","necessidade_impugnacao":"","checklist_resumido":[{"acao":"","prazo":""}]}}`
}
