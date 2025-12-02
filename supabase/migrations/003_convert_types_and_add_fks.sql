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
        EXECUTE 'ALTER TABLE pagamentos ALTER COLUMN valor TYPE numeric(12,2) USING (NULLIF(regexp_replace(valor::text, ''[^0-9.,-'']'', '''',''g''), '''')::numeric)';
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
