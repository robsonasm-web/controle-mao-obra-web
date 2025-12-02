-- Combined migrations for Controle Mão de Obra
-- Paste the whole file below into Supabase SQL Editor and run.
-- Files concatenated in this order:
-- 000_create_schema.sql
-- 001_add_metodo_status_pagamentos.sql
-- 002_add_missing_pagamentos_columns.sql
-- 003_convert_types_and_add_fks.sql
-- 004_clean_and_convert_valor.sql


-- --------------------------------------------------
-- BEGIN: 000_create_schema.sql
-- --------------------------------------------------

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
-- Ensure `local` column exists in case `obras` was created earlier without it
ALTER TABLE IF EXISTS public.obras ADD COLUMN IF NOT EXISTS local text;
INSERT INTO public.obras (nome, local, status)
  SELECT 'Obra Exemplo A', 'Av. Exemplo, 123', 'ativa'
  WHERE NOT EXISTS (SELECT 1 FROM public.obras WHERE nome = 'Obra Exemplo A');

-- Ensure `tipo` and `chave_pix` columns exist in case `colaboradores` was created earlier without them
ALTER TABLE IF EXISTS public.colaboradores ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE IF EXISTS public.colaboradores ADD COLUMN IF NOT EXISTS chave_pix text;
ALTER TABLE IF EXISTS public.colaboradores ADD COLUMN IF NOT EXISTS valor_diaria numeric(12,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.colaboradores ADD COLUMN IF NOT EXISTS valor_m2 numeric(12,2) DEFAULT 0.00;
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


-- --------------------------------------------------
-- END: 000_create_schema.sql
-- --------------------------------------------------


-- --------------------------------------------------
-- BEGIN: 001_add_metodo_status_pagamentos.sql
-- --------------------------------------------------

-- Migration: add metodo and status columns to pagamentos
-- Run this in Supabase SQL editor or via psql connected to your Supabase DB

ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS metodo TEXT DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';

-- Optional: ensure data_pagamento is date and valor is numeric
-- ALTER TABLE pagamentos ALTER COLUMN data_pagamento TYPE date USING (data_pagamento::date);
-- ALTER TABLE pagamentos ALTER COLUMN valor TYPE numeric USING (valor::numeric);

-- Verify
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pagamentos';


-- --------------------------------------------------
-- END: 001_add_metodo_status_pagamentos.sql
-- --------------------------------------------------


-- --------------------------------------------------
-- BEGIN: 002_add_missing_pagamentos_columns.sql
-- --------------------------------------------------

-- Migration: add missing columns to pagamentos
-- Use this in Supabase SQL editor or via psql connected to your DB

-- Add obra_id and colaborador_id as UUIDs (nullable to avoid failing existing inserts)
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS obra_id UUID;

ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS colaborador_id UUID;

-- Add valor as numeric with 2 decimals and default 0.00
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2) DEFAULT 0.00;

-- Add data_pagamento as date
ALTER TABLE IF EXISTS pagamentos
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;

-- Optionally, you can add foreign keys if your other tables exist and you want referential integrity:
-- ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;
-- ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL;

-- Verify columns
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'pagamentos';


-- --------------------------------------------------
-- END: 002_add_missing_pagamentos_columns.sql
-- --------------------------------------------------


-- --------------------------------------------------
-- BEGIN: 003_convert_types_and_add_fks.sql
-- --------------------------------------------------

-- Migration: convert tipos e adicionar chaves estrangeiras para pagamentos
-- Segurança: cada ação só é executada se a coluna/tabela existir

-- 1) Converter 'valor' para NUMERIC(12,2) se existir e não for NUMERIC
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'valor'
  ) THEN
    PERFORM (
      CASE WHEN (
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'pagamentos' AND column_name = 'valor'
      ) <> 'numeric' THEN
        -- Tenta converter com USING, ignorando erros de conversão
        EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN valor TYPE numeric(12,2) USING (NULLIF(regexp_replace(valor::text, ''[^0-9.,-''']'', '''',''g''), '''')::numeric)';
      END CASE
    );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Aviso: conversão de valor apresentou erro: %', SQLERRM;
END$$;

-- 2) Converter 'data_pagamento' para DATE se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'data_pagamento'
  ) THEN
    PERFORM (
      CASE WHEN (
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'pagamentos' AND column_name = 'data_pagamento'
      ) <> 'date' THEN
        EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN data_pagamento TYPE date USING (NULLIF(data_pagamento::text, '''')::date)';
      END CASE
    );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Aviso: conversão de data_pagamento apresentou erro: %', SQLERRM;
END$$;

-- 3) Adicionar chaves estrangeiras para obra_id e colaborador_id se colunas e tabelas existirem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'obra_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'obras'
  ) THEN
    -- adicionar constraint somente se ainda não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'pagamentos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'obra_id'
    ) THEN
      EXECUTE 'ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'colaborador_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'colaboradores'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'pagamentos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'colaborador_id'
    ) THEN
      EXECUTE 'ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL';
    END IF;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Aviso: falha ao adicionar FKs em pagamentos: %', SQLERRM;
END$$;

-- 4) Opcional: garantir DEFAULTs para metodo/status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'metodo') THEN
    BEGIN
      EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN metodo SET DEFAULT ''pix''';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Aviso: não foi possível definir default para metodo: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'status') THEN
    BEGIN
      EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN status SET DEFAULT ''pendente''';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Aviso: não foi possível definir default para status: %', SQLERRM;
    END;
  END IF;
END$$;

-- Fim da migração


-- --------------------------------------------------
-- END: 003_convert_types_and_add_fks.sql
-- --------------------------------------------------


-- --------------------------------------------------
-- BEGIN: 004_clean_and_convert_valor.sql
-- --------------------------------------------------

-- Migration: limpar e converter coluna 'valor' para NUMERIC(12,2) de forma segura
-- Uso: cole no SQL Editor do Supabase e execute. Este script tenta limpar caracteres não numéricos,
-- substituir vírgulas por pontos e converter cada linha individualmente; registros que falharem ficam nulos em valor_tmp

DO $$
BEGIN
  -- Só prosseguir se a coluna 'valor' existir e não for numeric
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagamentos' AND column_name = 'valor' AND data_type <> 'numeric'
  ) THEN

    -- Adiciona coluna temporária para armazenar valores convertidos com segurança
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_tmp'
    ) THEN
      EXECUTE 'ALTER TABLE pagamentos ADD COLUMN valor_tmp numeric(12,2)';
    END IF;

    -- Para cada linha, limpar e tentar converter. Se falhar, grava NULL em valor_tmp.
    FOR rec IN SELECT id, valor::text AS raw_val FROM pagamentos LOOP
      BEGIN
        -- remove tudo que não seja dígito, ponto, vírgula ou sinal
        DECLARE cleaned TEXT := regexp_replace(rec.raw_val, '[^0-9,\.-]', '', 'g');
        cleaned := replace(cleaned, ',', '.');
        -- tenta converter
        EXECUTE format('UPDATE pagamentos SET valor_tmp = %L::numeric(12,2) WHERE id = %L', cleaned, rec.id);
      EXCEPTION WHEN others THEN
        -- se conversão falhar, marca NULL e continua
        EXECUTE format('UPDATE pagamentos SET valor_tmp = NULL WHERE id = %L', rec.id);
      END;
    END LOOP;

    -- Agora alteramos a coluna 'valor' para numeric usando valor_tmp
    -- Esse passo assume que a coluna pode ser convertida via USING valor_tmp
    BEGIN
      EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN valor TYPE numeric(12,2) USING NULLIF(valor_tmp, '''')';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Aviso: falha ao alterar tipo de valor para numeric: %', SQLERRM;
    END;

    -- Remove coluna temporária
    BEGIN
      EXECUTE 'ALTER TABLE pagamentos DROP COLUMN IF EXISTS valor_tmp';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Aviso: falha ao remover valor_tmp: %', SQLERRM;
    END;

  ELSE
    RAISE NOTICE 'Coluna valor não existe ou já é numeric; nada a fazer.';
  END IF;
END$$;

-- Fim da migração


-- --------------------------------------------------
-- END: 004_clean_and_convert_valor.sql
-- --------------------------------------------------


-- --------------------------------------------------
-- BEGIN: 005_ensure_colaboradores_columns.sql
-- --------------------------------------------------

ALTER TABLE IF EXISTS public.colaboradores
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'diarista',
  ADD COLUMN IF NOT EXISTS chave_pix text,
  ADD COLUMN IF NOT EXISTS valor_diaria numeric(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_m2 numeric(12,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON public.colaboradores(cpf);

-- --------------------------------------------------
-- END: 005_ensure_colaboradores_columns.sql
-- --------------------------------------------------
