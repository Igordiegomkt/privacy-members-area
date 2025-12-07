# Configuração de Variáveis de Ambiente

## Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# URL do seu projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave pública anônima do Supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Onde encontrar essas informações:**
1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie a **URL** do projeto
5. Copie a **anon/public key**

## ⚠️ IMPORTANTE - SEGURANÇA

- O arquivo `.env` já está no `.gitignore` e **NÃO será commitado no GitHub**
- **NUNCA** commite credenciais no código ou em arquivos públicos
- Use sempre a **ANON KEY** (nunca a Service Role Key) no frontend
- Para produção na Vercel, adicione essas variáveis nas configurações do projeto

## Para Vercel

1. Acesse o dashboard da Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione as variáveis (use os valores do seu projeto Supabase):
   - `VITE_SUPABASE_URL` = `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sua_chave_anon_aqui`
4. Selecione os ambientes (Production, Preview, Development)
5. Faça o redeploy do projeto

