# Verificação pós-migração (Supabase / Postgres)

Este arquivo reúne queries e procedimentos para validar a base após aplicar `supabase/all_migrations.sql`.

IMPORTANTE: sempre faça backup antes de modificar dados em produção:

```bash
# exporte um dump (substitua placeholders):
pg_dump "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>" -F c -b -v -f ./backup_before_migrations.dump
```

## 1) Verificações básicas

- Checar existência de tabelas principais:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('obras','colaboradores','diarias','medicoes','pagamentos');
```

- Checar colunas esperadas e tipos (exemplo para `colaboradores` e `pagamentos`):

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'colaboradores'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pagamentos'
ORDER BY ordinal_position;
```

## 2) Verificar tipos numéricos e valores sujos na coluna `valor`

Muitas migrações falham quando a coluna `valor` contém strings ou símbolos. Use estas queries para identificar linhas problemáticas.

- Linhas onde `valor` não é numérico (quando ainda é `text`):

```sql
-- encontra valores que não podem ser convertidos para numeric
SELECT id, valor
FROM pagamentos
WHERE valor !~ '^[0-9]+(\\.[0-9]{1,2})?$'
LIMIT 200;
```

- Linhas com valores nulos ou negativos (se isso for inválido no seu domínio):

```sql
SELECT id, valor
FROM pagamentos
WHERE valor IS NULL
   OR (valor::numeric < 0)
LIMIT 200;
```

- Contagem total e soma (ajuda a detectar anomalias):

```sql
SELECT COUNT(*) AS total, SUM(valor::numeric) AS soma_valores
FROM pagamentos;
```

> Observação: ao usar `valor::numeric` acima, certifique-se de que `valor` já é compatível com cast — caso contrário, use a query de `!~` para localizar linhas sujas primeiro.

## 3) Recomendações para limpar `valor` (caso cometas strings com `R$`, vírgulas, etc.)

1. Crie uma coluna temporária `valor_num` do tipo numeric:

```sql
ALTER TABLE pagamentos
ADD COLUMN IF NOT EXISTS valor_num numeric;
```

2. Preencha `valor_num` com conversão segura (removendo `R$`, espaços e trocando vírgula por ponto):

```sql
UPDATE pagamentos
SET valor_num = NULLIF(REGEXP_REPLACE(valor::text, '[^0-9,\.]', '', 'g'), '')::numeric
WHERE valor IS NOT NULL;
```

3. Verifique linhas que não converteram:

```sql
SELECT id, valor
FROM pagamentos
WHERE valor IS NOT NULL AND valor_num IS NULL
LIMIT 200;
```

4. Depois de validação manual, swap colunas:

```sql
BEGIN;
ALTER TABLE pagamentos DROP COLUMN valor;
ALTER TABLE pagamentos RENAME COLUMN valor_num TO valor;
COMMIT;
```

> Se a coluna `valor` já estiver como `numeric`, pule esses passos.

## 4) Verificar `valor_diaria` e `valor_m2` em `colaboradores`

```sql
SELECT id, nome, valor_diaria, valor_m2
FROM colaboradores
WHERE valor_diaria IS NULL AND valor_m2 IS NULL
LIMIT 200;

-- checar tipos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'colaboradores'
  AND column_name IN ('valor_diaria','valor_m2');
```

Se os tipos não forem `numeric`/`double precision`/`numeric(12,2)`, converta com `ALTER TABLE ... USING ...`.

## 5) Verificar chaves estrangeiras e índices

```sql
-- Ver FK definitions
SELECT con.conname AS constraint_name,
       rel.relname AS table_from,
       att.attname AS column_from,
       rele.relname AS table_to
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_class rele ON rele.oid = con.confrelid
JOIN unnest(con.conkey) WITH ORDINALITY AS cols(colid, ord) ON TRUE
JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.colid
WHERE con.contype = 'f';

-- Ver índices relevantes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('pagamentos','diarias','medicoes');
```

## 6) Verificar dados de `medicoes` e períodos

```sql
SELECT id, colaborador_id, periodo_inicio, periodo_fim, quantidade, valor_unitario, valor_total
FROM medicoes
ORDER BY periodo_inicio DESC
LIMIT 200;
```

Confirme que `periodo_inicio` e `periodo_fim` usem o formato `YYYY-MM-DD` e que não haja sobreposições inesperadas.

## 7) Verificação de RLS / Policies (Se aplicável)

Se você usa RLS no Supabase, verifique se existe uma policy permissiva de desenvolvimento para facilitar testes:

```sql
-- Exemplo: permitir leitura/escrita sem restrição (use APENAS em dev)
CREATE POLICY IF NOT EXISTS "dev_all" ON pagamentos
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 8) Como proceder se encontrar linhas problemáticas

- Faça backup.
- Exporte as linhas problemáticas para CSV, corrija localmente e reimporte.
- Em casos simples, use `UPDATE` com `REGEXP_REPLACE` para limpar `R$`, espaços e converter vírgulas para pontos.
- Se houver muitos problemas, extraia IDs, gere uma planilha, corrija e reimporte via `COPY`/`psql`.

## 9) Comandos úteis `psql` (macOS / zsh)

```bash
# conectar
psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>"

# rodar arquivo sql
psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>" -f supabase/all_migrations.sql

# exportar resultados de uma query para CSV
psql "postgresql://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>" -c "\copy (SELECT id, valor FROM pagamentos WHERE valor !~ '^[0-9]+(\\.[0-9]{1,2})?$') TO './pagamentos_invalidos.csv' CSV HEADER"
```

## 10) Checklist rápido após rodar migrações

- [ ] `obras`, `colaboradores`, `diarias`, `medicoes`, `pagamentos` existem
- [ ] `pagamentos.valor` está como `numeric` e sem linhas não-conversíveis
- [ ] `colaboradores.valor_diaria` e `valor_m2` existem e são numéricos
- [ ] FK constraints estão presentes e válidas
- [ ] Seeds foram inseridos sem erro (ou foram reexecutados após os ALTERs)

---

Se quiser, eu posso:

- Gerar um script SQL pronto que faz a limpeza automática (cria `valor_num`, tenta converter, lista falhas) — útil para rodar em dev.
- Executar pequenas correções no repositório, como adicionar esse guia ao `README_MIGRATIONS.md`.

Qual prefere: eu gero o script SQL de limpeza automática agora ou atualizo o README com um link para este guia?