# Configuração de Variáveis de Ambiente

## Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# URL do seu projeto Supabase
VITE_SUPABASE_URL=https://atexvoxukvaqittpqkov.supabase.co

# Chave pública anônima do Supabase
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4
```

## ⚠️ IMPORTANTE

- O arquivo `.env` já está no `.gitignore` e **NÃO será commitado no GitHub**
- Para produção na Vercel, adicione essas variáveis nas configurações do projeto
- Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` no código do cliente

## Para Vercel

1. Acesse o dashboard da Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione:
   - `VITE_SUPABASE_URL` = `https://atexvoxukvaqittpqkov.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4`
4. Selecione os ambientes (Production, Preview, Development)
5. Faça o redeploy do projeto

