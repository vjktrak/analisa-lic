-- ============================================================
-- Execute este SQL no SQL Editor do Supabase
-- Acesse: https://supabase.com → seu projeto → SQL Editor
-- ============================================================

-- Tabela principal de editais
CREATE TABLE IF NOT EXISTS editais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Identificação
  numero_pregao TEXT NOT NULL,
  numero_processo TEXT,
  orgao TEXT NOT NULL,
  objeto TEXT NOT NULL,
  
  -- Valores e datas
  valor_estimado TEXT,
  data_sessao TEXT,
  
  -- Status da análise
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','analisando','concluido','erro')),
  recomendado BOOLEAN,
  
  -- Arquivo original
  arquivo_nome TEXT,
  arquivo_texto TEXT, -- texto extraído do PDF
  
  -- Resultado da análise (JSON completo)
  analise_raw JSONB,
  
  -- Notas manuais do usuário
  notas TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_editais_created_at ON editais(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_editais_status ON editais(status);
CREATE INDEX IF NOT EXISTS idx_editais_orgao ON editais(orgao);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_editais_updated_at
  BEFORE UPDATE ON editais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Desativar Row Level Security (sistema single-user com auth própria)
ALTER TABLE editais DISABLE ROW LEVEL SECURITY;

-- Confirmar criação
SELECT 'Tabelas criadas com sucesso!' as resultado;
