-- Migration 005: Garantir colunas em colaboradores (seguro)
-- Adiciona colunas que podem estar faltando em esquemas antigos.

ALTER TABLE IF EXISTS public.colaboradores
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'diarista',
  ADD COLUMN IF NOT EXISTS chave_pix text,
  ADD COLUMN IF NOT EXISTS valor_diaria numeric(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_m2 numeric(12,2) DEFAULT 0.00;

-- Garante índice útil (opcional)
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON public.colaboradores(cpf);

-- Fim migration 005
