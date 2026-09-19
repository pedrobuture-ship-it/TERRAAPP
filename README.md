# TERRA APP

O TERRA é um aplicativo (PWA) offline-first para gestão agropecuária e controle zootécnico.

Seu diferencial é funcionar 100% offline através do IndexedDB no navegador ou celular, permitindo o cadastro de animais, inseminações, partos e manejos mesmo sem internet no curral. Quando há conexão, o usuário pode sincronizar os dados com a nuvem (Supabase) para backup seguro e acesso em múltiplos dispositivos através do conceito de "Fazendas".

## 🚀 Principais Funcionalidades

- **Offline-First:** Cadastro e gestão completa sem internet.
- **PWA Instalável:** Pode ser instalado como aplicativo nativo em Android, iOS e Desktop (Windows/Mac/Linux).
- **Multi-Fazendas (B2B):** Crie fazendas e gerencie os dados de forma isolada na nuvem.
- **Genealogia e Acasalamento:** Simule cruzamentos e evite consanguinidade alta.
- **Gestão Reprodutiva:** Inseminações, diagnósticos de gestação e partos.
- **Controle de Rebanho:** Matrizes, bezerros, touros e sêmen.
- **Manejo Sanitário:** Vacinas, medicamentos, controle de estoque de doses.
- **Backup Local e Nuvem:** Exporte um JSON local ou sincronize em nuvem via Supabase.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Banco de Dados Local:** Dexie.js (IndexedDB)
- **Banco de Dados em Nuvem e Autenticação:** Supabase (PostgreSQL + Auth)
- **Roteamento:** React Router DOM
- **Ícones:** Lucide React

## 📦 Instalação e Execução

### Pré-requisitos
- Node.js (v18 ou superior)
- Conta no [Supabase](https://supabase.com) (se desejar configurar a nuvem)

### Rodando Localmente

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse no navegador: `http://localhost:5173`

*O app já funcionará localmente sem precisar configurar o Supabase. Os dados ficarão salvos no seu navegador.*

## ☁️ Configuração do Supabase (Opcional para Nuvem)

Para ativar a sincronização e login, configure um projeto no Supabase:

1. Crie um projeto no Supabase.
2. Acesse a aba **SQL Editor** no painel do Supabase.
3. Copie o conteúdo do arquivo `supabase/schema.sql` que está na raiz do projeto e execute no SQL Editor. (Isso criará todas as tabelas, RLS e gatilhos de segurança).
4. Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base):
   ```env
   VITE_SUPABASE_URL=sua-url-do-projeto
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   ```
   
**Atenção:** Nunca coloque a sua `service_role key` no frontend!

## 📱 Instalando no Celular (PWA)

Para instalar no celular, o app deve estar rodando sob **HTTPS** (em produção):
- **Android (Chrome):** Acesse o site, clique no menu de três pontos e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".
- **iOS (Safari):** Acesse o site, clique no ícone de Compartilhar e escolha "Adicionar à Tela de Início".

## 🏗️ Deploy em Produção

O projeto está configurado para deploy fácil na Vercel:
1. Conecte seu repositório no Vercel.
2. Defina o Framework Preset como **Vite**.
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
4. Faça o deploy!
