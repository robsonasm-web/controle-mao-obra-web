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
