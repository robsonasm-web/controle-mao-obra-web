# 🏗️ Sistema de Controle de Mão de Obra

Sistema completo e moderno para gerenciar obras, colaboradores, diárias e pagamentos com integração Supabase.

## 🎯 Funcionalidades

✅ **Dashboard** - Visão geral com estatísticas  
✅ **Obras** - CRUD completo para gerenciar obras  
✅ **Colaboradores** - Cadastro e gestão de diaristas e empreiteiros  
✅ **Diárias** - Registro de diárias trabalhadas  
✅ **Pagamentos** - Gerenciamento de pagamentos com geração de PDF  
✅ **Interface Moderna** - Design responsivo com Tailwind CSS  
✅ **Notificações** - Feedback em tempo real com React Hot Toast  

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **PDF**: pdf-lib
- **Notificações**: React Hot Toast

## 📦 Instalação

### 1. Instalar dependências

```bash
npm install
# ou
yarn install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. Criar tabelas no Supabase

Execute os seguintes comandos SQL no seu Supabase:

```sql
-- Tabela de Obras
CREATE TABLE obras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  local VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de Colaboradores
CREATE TABLE colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  cpf VARCHAR UNIQUE NOT NULL,
  email VARCHAR,
  telefone VARCHAR,
  tipo VARCHAR (diarista, empreiteiro, supervisor),
  pix VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de Diárias
CREATE TABLE diarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  metodo VARCHAR (pix, dinheiro, deposito, transferencia),
  status VARCHAR (pendente, pago, cancelado) DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT now()
);

-- Criar storage para PDFs
CREATE BUCKET pdf_pagamentos;
```

## 🚀 Rodar o projeto

```bash
npm run dev
# ou
yarn dev
```

Acesse em: `http://localhost:3000`

## 📁 Estrutura do Projeto

```
app/
├── layout.tsx           # Layout principal
├── page.tsx            # Dashboard
├── obras/page.tsx      # Gerenciamento de obras
├── colaboradores/page.tsx  # Gerenciamento de colaboradores
├── diarias/page.tsx    # Registro de diárias
├── pagamentos/page.tsx # Gerenciamento de pagamentos
└── api/
    └── gerar-pdf/route.ts  # API para gerar PDFs

components/
├── Header.tsx          # Cabeçalho com menu
├── Sidebar.tsx         # Menu lateral responsivo
├── Layout.tsx          # Wrapper de layout
└── UI.tsx              # Componentes reutilizáveis

lib/
├── supabaseClient.ts   # Cliente Supabase
└── api.ts              # Funções de API
```

## 🎨 Componentes Disponíveis

### UI Components

- **Card** - Cartão com estatísticas
- **Table** - Tabela com dados
- **Button** - Botão customizado
- **Modal** - Modal para formulários
- **Input** - Input com label
- **Select** - Select com opções

## 🔧 Customizações

### Adicionar nova funcionalidade

1. **Criar função na API** (`lib/api.ts`)
2. **Criar página** (`app/novaFuncionalidade/page.tsx`)
3. **Usar componentes da UI** para consistência
4. **Adicionar rota no Sidebar** (`components/Sidebar.tsx`)

## 📝 Anotações

- Todos os formulários usam React Hot Toast para notificações
- Layout responsivo para mobile e desktop
- Integração completa com Supabase RLS recomendada
- PDFs gerados no endpoint `/api/gerar-pdf`

## 🤝 Próximos Passos

- [ ] Implementar autenticação
- [ ] Adicionar RLS no Supabase
- [ ] Criar relatórios mais detalhados
- [ ] Implementar filtros avançados
- [ ] Adicionar exportação em Excel
- [ ] Melhorar design gráfico

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue ou entre em contato.

---

**Desenvolvido com ❤️ para Tailored Engenharia**
