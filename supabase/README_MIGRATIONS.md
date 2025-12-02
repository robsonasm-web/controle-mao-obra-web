# Aplicando as migrações do Supabase

Este arquivo descreve como aplicar as migrações SQL geradas no projeto `supabase/migrations/` no seu projeto Supabase.

IMPORTANTE — Faça backup antes de rodar qualquer migração em produção.

## 1) Pré-requisitos
- Tenha as migrações no diretório `supabase/migrations/` do seu repositório.
- Tenha acesso ao projeto Supabase (Dashboard) ou às credenciais de conexão (host, user, password, db).
- Em ambiente local/macOS com `zsh`, tenha `psql` instalado (homebrew: `brew install libpq` e adicione `$(brew --prefix)/opt/libpq/bin` ao PATH se necessário).

## 2) Backup (recomendado)
Para criar um dump SQL completo use `pg_dump` (substitua valores):

```bash
PGPASSWORD='SUA_SENHA' pg_dump -h db.host.supabase.co -p 5432 -U db_user -d db_name > supabase_backup_$(date +%F).sql
```

Ou usando connection string (mais simples):

```bash
pg_dump "postgresql://user:password@host:5432/database" > supabase_backup.sql
```

## 3) Aplicar migrations — opção A: Supabase SQL Editor (Dashboard)
1. Abra o Supabase Project → SQL Editor → New query.
2. Abra o arquivo `supabase/migrations/000_create_schema.sql` no seu editor local, copie todo o conteúdo e cole no SQL Editor.
3. Clique em "Run". Verifique mensagens de sucesso/NOTICE.
4. Repita para as demais migrações na ordem desejada (por exemplo `001_add_metodo_status_pagamentos.sql`, `002_add_missing_pagamentos_columns.sql`, `003_convert_types_and_add_fks.sql`, `004_clean_and_convert_valor.sql`).

Observação: as migrations aqui são idempotentes e têm checagens IF EXISTS para evitar falhas quando aplicadas mais de uma vez.

## 4) Aplicar migrations — opção B: `psql` local usando connection string
Substitua a connection string pelo valor do seu projeto (encontrado em Project → Settings → Database → Connection string).

```bash
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME" -f supabase/migrations/000_create_schema.sql
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME" -f supabase/migrations/001_add_metodo_status_pagamentos.sql
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME" -f supabase/migrations/002_add_missing_pagamentos_columns.sql
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME" -f supabase/migrations/003_convert_types_and_add_fks.sql
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/DB_NAME" -f supabase/migrations/004_clean_and_convert_valor.sql
```

Dica: você pode rodar em lote com um pequeno loop:

```bash
for f in supabase/migrations/*.sql; do
  echo "Running $f"
  psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME" -f "$f"
done
```

## 5) Verificações pós-migração
Execute estas queries para verificar se as colunas e tipos estão corretos:

- Checar colunas da tabela `pagamentos`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pagamentos';
```

- Verificar tipo da coluna `valor`:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pagamentos' AND column_name = 'valor';
```

- Encontrar linhas com `valor` problemático (NULL ou com caracteres não numéricos):

```sql
SELECT id, valor
FROM public.pagamentos
WHERE valor IS NULL OR valor::text = '' OR valor::text ~ '[^0-9\.,-]'
LIMIT 100;
```

- Contar registros problemáticos:

```sql
SELECT
  COUNT(*) FILTER (WHERE valor IS NULL OR valor::text = '' OR valor::text ~ '[^0-9\.,-]') AS problemas_valor,
  COUNT(*) AS total
FROM public.pagamentos;
```

Se houver muitos problemas, analise as primeiras linhas e ajuste manualmente antes de rodar a migração de conversão.

## 6) Buckets / Storage
O `000_create_schema.sql` tenta inserir o bucket `pdf_pagamentos` no catálogo `storage.buckets`. Em alguns projetos o dashboard/Storage API é o caminho recomendado. Se preferir, crie o bucket pelo Dashboard → Storage → Create bucket.

## 7) RLS (Row-Level Security)
As políticas fornecidas são exemplos. Em desenvolvimento pode ser útil desabilitar RLS; em produção, **rever todas as políticas** e garantir que apenas operações autorizadas são permitidas.

## 8) Problemas comuns e soluções rápidas
- Erro "Could not find column 'metodo'" ou similar: execute `002` e `001` para adicionar a coluna; ou rode `000_create_schema.sql` se tiver schema de base faltando.
- Linhas com `valor` contendo texto: abra a query de verificação e corrija as linhas manualmente ou deixe a migração `004_clean_and_convert_valor.sql` tentar limpar/converter com segurança (execute em ambiente de teste primeiro).

## 9) Quero ajuda para rodar
Posso:
- Gerar um único arquivo SQL concatenando todas as migrações na ordem certa (pronto para colar no SQL Editor). Diga se quer isso.
- Gerar um script `run_migrations.sh` com prompts para preencher variáveis de conexão.
- Auxiliar a inspecionar as linhas problemáticas de `valor` (copie/cole 10 exemplos ou me diga como acessar os dados).

---
Arquivo criado automaticamente pelo assistente. Seguinte passo: quer que eu gere um único SQL combinado (`all_migrations.sql`) pronto para colar no SQL Editor? Caso sim, eu crio agora.