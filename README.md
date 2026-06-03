# AnalisaLic – Sistema de Análise de Editais com IA

Sistema profissional para análise automatizada de editais de licitação usando Claude (Anthropic).

---

## ✅ Funcionalidades

- Upload de edital (PDF ou TXT)
- Análise automática com Claude: dados gerais, habilitação, checklist, requisitos técnicos, formação de preços, cronograma, irregularidades, resumo executivo
- Checklist interativo e editável (salva automaticamente no banco)
- Notas internas por edital
- Lista de editais com busca e filtro
- Exclusão de editais
- Login com senha (sistema privado, usuário único)
- Acessível de qualquer lugar via URL do Vercel

---

## 🚀 Deploy em 15 minutos (passo a passo)

### PASSO 1 – Criar conta no Supabase (banco de dados)

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em **"New project"** → preencha nome e senha
3. Aguarde o projeto inicializar (~1 min)
4. Vá em **Settings → API** e copie:
   - `Project URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → será o `SUPABASE_SERVICE_ROLE_KEY`
5. Vá em **SQL Editor → New Query**, cole o conteúdo de `supabase-setup.sql` e clique em **Run**

### PASSO 2 – Obter a chave da API da Anthropic

1. Acesse https://console.anthropic.com
2. Vá em **API Keys → Create Key**
3. Copie a chave (começa com `sk-ant-api03-…`)

### PASSO 3 – Subir o código no GitHub

1. Crie uma conta em https://github.com
2. Crie um novo repositório (pode ser privado)
3. Faça upload de todos os arquivos desta pasta
   - Ou use: `git init && git add . && git commit -m "init" && git remote add origin URL_DO_SEU_REPO && git push`

### PASSO 4 – Deploy no Vercel

1. Acesse https://vercel.com e crie conta (pode usar o GitHub)
2. Clique em **"Add New Project"** → importe seu repositório do GitHub
3. Em **"Environment Variables"**, adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase (passo 1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `ANTHROPIC_API_KEY` | Sua chave da Anthropic |
| `JWT_SECRET` | Uma string aleatória longa (ex: `abc123xyz...` com 32+ chars) |
| `ADMIN_EMAIL` | Seu e-mail de acesso |
| `ADMIN_PASSWORD` | Sua senha de acesso |

4. Clique em **Deploy**
5. Após o deploy, acesse a URL gerada (ex: `https://analisa-lic.vercel.app`)

---

## 💡 Uso do sistema

### Adicionar edital
1. Clique em **"Novo Edital"** no dashboard
2. Preencha os campos básicos (pregão, órgão, objeto)
3. Faça upload do PDF ou TXT do edital completo (com TR, Minuta, Anexos)
4. Clique em **"Salvar e Abrir"**

### Analisar com IA
1. Na página do edital, clique em **"Analisar com IA"**
2. O Claude processa o edital (~30-60 segundos)
3. A análise completa é salva automaticamente

### Preencher checklist
1. Vá na aba **"Checklist"**
2. Preencha as colunas: Possuímos?, Válido?, Precisa Atualizar?
3. Clique em **"Salvar Alterações"**

### Re-analisar
- Clique em **"Re-analisar"** para refazer a análise com um edital corrigido ou novo upload

---

## ⚠️ Dicas importantes

### PDF vs TXT
O PDF lido diretamente tem limitações de extração de texto no browser. Para melhores resultados:
- **Opção 1**: Abra o PDF, selecione tudo (Ctrl+A), copie, cole num .txt e faça upload do .txt
- **Opção 2**: Use https://smallpdf.com/pdf-to-text para converter o PDF em texto antes do upload
- **Opção 3**: Se o edital veio por e-mail como texto, copie direto e faça upload como .txt

### Limite de tokens
O Claude analisa até ~60.000 caracteres do edital. Se o documento for muito grande (>100 páginas), combine: TR + Edital principal num único TXT. Os Anexos de contrato podem ser omitidos na análise inicial.

### Custo da API
Cada análise consome aproximadamente 70.000-100.000 tokens (~$0.30-0.50 por análise com Claude Sonnet). O plano gratuito da Anthropic tem limite; configure um método de pagamento em https://console.anthropic.com.

---

## 🔧 Desenvolvimento local

```bash
# Clone o repositório
git clone URL_DO_SEU_REPO
cd licitacao-app

# Instale as dependências
npm install

# Crie o arquivo de ambiente
cp .env.example .env.local
# Edite .env.local com seus valores

# Inicie o servidor de desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

---

## 📁 Estrutura do projeto

```
licitacao-app/
├── app/
│   ├── api/
│   │   ├── auth/login/     # Login
│   │   ├── auth/logout/    # Logout
│   │   ├── editais/        # CRUD de editais
│   │   └── analyze/        # Análise com Claude
│   ├── dashboard/          # Lista de editais
│   ├── edital/[id]/        # Detalhe do edital
│   └── login/              # Página de login
├── components/
│   ├── DashboardClient     # Dashboard interativo
│   └── EditalDetailClient  # Página de análise
├── lib/
│   ├── supabase.ts         # Cliente do banco
│   ├── auth.ts             # Autenticação JWT
│   └── prompt.ts           # Prompt para o Claude
└── supabase-setup.sql      # SQL para criar as tabelas
```
