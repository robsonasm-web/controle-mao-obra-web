-- Schema inicial para o projeto Controle Mão de Obra
-- Roda no Supabase SQL editor. Gera tabelas, constraints, índices, e alguns dados de exemplo.

-- 1) Extensões úteis
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Tabela: obras
CREATE TABLE IF NOT EXISTS public.obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  local text,
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Tabela: colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text UNIQUE,
  email text,
  telefone text,
  tipo text, -- diarista / empreiteiro / supervisor
  chave_pix text,
  valor_diaria numeric(12,2) DEFAULT 0.00,
  valor_m2 numeric(12,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4) Tabela: diarias
CREATE TABLE IF NOT EXISTS public.diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data date NOT NULL,
  horas_trabalhadas numeric(6,2),
  valor numeric(12,2) DEFAULT 0.00,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) Tabela: medicoes (para empreiteiros)
CREATE TABLE IF NOT EXISTS public.medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  quantidade numeric(12,2) DEFAULT 0,
  valor_unitario numeric(12,2) DEFAULT 0,
  valor_total numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6) Tabela: pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  valor numeric(12,2) DEFAULT 0.00,
  data_pagamento date,
  metodo text DEFAULT 'pix',
  status text DEFAULT 'pendente',
  descricao text,
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7) Índices úteis
CREATE INDEX IF NOT EXISTS idx_diarias_obra_id ON public.diarias(obra_id);
CREATE INDEX IF NOT EXISTS idx_diarias_colaborador_id ON public.diarias(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_obra_id ON public.pagamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_colaborador_id ON public.pagamentos(colaborador_id);

-- 8) Policies (modo DEV) - permissivo para facilitar desenvolvimento local
-- ATENÇÃO: Não usar em produção sem rever regras de RLS
--
-- Habilitar RLS (opcional) e criar políticas para uma aplicação simples
-- Se preferir desabilitar RLS, comente as linhas abaixo
-- ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.diarias ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- As políticas abaixo servem como exemplo para permitir operações autenticadas
-- (Requer que você use autenticação com Supabase Auth). Ajuste conforme necessário.
--
-- CREATE POLICY "Allow authenticated read" ON public.obras
--   FOR SELECT USING (auth.role() = 'authenticated');

-- 9) Exemplo de seed (opcional)
INSERT INTO public.obras (nome, local, status)
  SELECT 'Obra Exemplo A', 'Av. Exemplo, 123', 'ativa'
  WHERE NOT EXISTS (SELECT 1 FROM public.obras WHERE nome = 'Obra Exemplo A');

INSERT INTO public.colaboradores (nome, cpf, email, telefone, tipo, chave_pix)
  SELECT 'João da Silva', '000.000.000-00', 'joao@example.com', '+55 11 99999-0000', 'diarista', '11122233'
  WHERE NOT EXISTS (SELECT 1 FROM public.colaboradores WHERE cpf = '000.000.000-00');

-- 10) Criar bucket para PDFs (registro no catálogo de storage)
-- Observação: o método suportado oficialmente é via Storage API / Dashboard; o insert abaixo funciona no Supabase
INSERT INTO storage.buckets (id, name, public, updated_at)
  SELECT 'pdf_pagamentos', 'pdf_pagamentos', true, now()
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'pdf_pagamentos');

-- 11) Verificações finais (mostre as tabelas criadas)
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'pag%';

-- Fim do schema inicial
