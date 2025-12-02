# Usando a extensão Supabase no VS Code

Este guia mostra como conectar a extensão Supabase no VS Code ao seu projeto e executar uma migration SQL (ex.: `005_ensure_colaboradores_columns.sql`). Inclui o SQL mínimo que corrige o erro `Could not find the 'tipo' column of 'colaboradores'`.

---

IMPORTANTE: nunca compartilhe sua `service_role` key publicamente. Use-a apenas localmente em um ambiente seguro.

## Passo 1 — Obter credenciais do projeto

1. Abra o Supabase Dashboard → selecione seu projeto.
2. Vá em `Settings` → `API`.
3. Copie o `Project URL` (ex: `https://xyzcompany.supabase.co`).
4. Copie a `Service Role` Key (essa chave tem privilégios elevados e permite DDL). Guarde com segurança.

> Se você não quiser usar a `service_role`, pode executar o SQL pelo SQL Editor do Dashboard (não pela extensão), mas ainda precisará de um usuário com permissão para executar DDL.

## Passo 2 — Conectar a extensão Supabase no VS Code

1. Abra o painel da extensão Supabase no VS Code (ícone na barra lateral ou `Ctrl`+`Shift`+`P` → `Supabase: Open` dependendo da extensão).
2. Clique em **Add Connection** / **Connect to project** (o rótulo pode variar com a extensão que você instalou).
3. Escolha o modo de conexão por `Project URL` + `Service Role Key` (ou insira o `Project ref` + `service_role` se solicitado).
4. Cole os valores que você copiou no passo anterior.
5. A extensão deve mostrar o projeto conectado e exibir as tabelas (schema) e um editor SQL integrado.

Se a extensão pedir para salvar a connection em `settings.json`, confirme e salve. A entrada geralmente fica em algo como:

```json
"supabase.connections": [
  {
    "name": "meu-projeto",
    "url": "https://xyzcompany.supabase.co",
    "serviceRoleKey": "<SERVICE_ROLE_KEY>"
  }
]
```

> Novamente: não comite esse `settings.json` com chaves no repositório.

## Passo 3 — Executar a migration (via extensão ou Dashboard)

Você tem 2 opções:

### A) Executar pelo editor da extensão (no VS Code)

1. Abra o arquivo `supabase/migrations/005_ensure_colaboradores_columns.sql` no VS Code.
2. Se a extensão permitir, selecione o SQL e clique com o botão direito → `Run selection` ou use o botão `Run` no editor integrado da extensão.
3. Confirme a execução e aguarde a resposta. A extensão mostrará o resultado/erros.

### B) Executar pelo SQL Editor do Supabase Dashboard

1. Vá em Supabase Dashboard → SQL Editor → New query.
2. Cole o SQL abaixo (somente SQL) e clique em `Run`.

SQL a executar (cole exatamente):

```sql
ALTER TABLE IF EXISTS public.colaboradores
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'diarista',
  ADD COLUMN IF NOT EXISTS chave_pix text,
  ADD COLUMN IF NOT EXISTS valor_diaria numeric(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS valor_m2 numeric(12,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON public.colaboradores(cpf);
```

> Observação: não tente executar comandos de shell (`psql ...`) dentro do SQL Editor — ele só aceita SQL.

## Passo 4 — Verificar resultado e atualizar schema local

1. Após execução bem-sucedida, atualize (refresh) o schema no painel da extensão (há um botão refresh/recarregar no painel da extensão — procure por "Refresh schema" ou similar).
2. Reinicie o servidor de desenvolvimento local:

```bash
npm run dev
```

3. No Dashboard ou no painel da extensão, verifique que a tabela `colaboradores` agora tem as colunas:
- `tipo`
- `chave_pix`
- `valor_diaria`
- `valor_m2`

4. Volte ao app e tente criar um novo colaborador.

## Troubleshooting (erros comuns)

- Erro `syntax error at or near "psql"` → Você colou um comando de terminal no SQL Editor. Use apenas SQL no Editor.
- Erro de permissão → Se você não estiver usando `service_role`, seu usuário pode não ter permissão para DDL. Use o Dashboard (que executa com permissões) ou a `service_role` localmente.
- Dados estranhos em `valor` → veja `supabase/VERIFICATION.md` para queries de limpeza.

## Segurança

- Não inserir a `service_role` em commits. Adicione-a ao `.env.local` ou às `settings.json` locais que você não comita.
- Se precisar rodar migrations automaticamente, prefira executar em um pipeline CI com variáveis secretas e permissões controladas.

---

Se quiser, eu posso:
- Gerar um `supabase/USING_EXTENSION.md` (já criado) e também adicionar instruções para rodar via `psql` no Mac (com placeholders). Quer que eu acrescente a linha de `psql` com placeholders neste arquivo também?
- Guiar você passo-a-passo por chat enquanto você faz a conexão (você cola a saída/erros aqui e eu analiso).

Diga qual opção prefere: (A) eu te guio agora passo-a-passo, ou (B) prefere que eu adicione as instruções `psql` com placeholders no mesmo arquivo?