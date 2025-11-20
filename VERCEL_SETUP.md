# 🚀 Configuração na Vercel - Guia Completo

## 📋 Passo a Passo para Configurar Variáveis de Ambiente

### Método 1: Via Dashboard da Vercel (Recomendado)

#### 1. Acesse o Dashboard da Vercel
- Vá para: https://vercel.com/dashboard
- Faça login na sua conta
- Se não tiver conta, crie uma gratuita em: https://vercel.com/signup

#### 2. Selecione seu Projeto
- Encontre o projeto `privacy-members-area` na lista
- Clique no nome do projeto para abrir

#### 3. Acesse as Configurações
- No menu superior, clique em **Settings**
- No menu lateral esquerdo, clique em **Environment Variables**

#### 4. Adicione a Primeira Variável: `VITE_SUPABASE_URL`

1. Clique no botão **Add New** (ou **Add**)
2. Preencha os campos:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://atexvoxukvaqittpqkov.supabase.co`
   - **Environments:** Marque todas as opções:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. Clique em **Save**

#### 5. Adicione a Segunda Variável: `VITE_SUPABASE_ANON_KEY`

1. Clique novamente em **Add New**
2. Preencha os campos:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4`
   - **Environments:** Marque todas as opções:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
3. Clique em **Save**

#### 6. Verificar Variáveis Adicionadas

Você deve ver duas variáveis na lista:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

#### 7. Fazer Deploy

**Opção A: Deploy Automático**
- Se você já conectou o repositório GitHub, a Vercel fará deploy automaticamente
- Aguarde alguns minutos ou force um novo deploy

**Opção B: Deploy Manual**
1. Vá para a aba **Deployments**
2. Clique nos três pontos (...) do último deployment
3. Selecione **Redeploy**
4. Aguarde o deploy concluir

---

### Método 2: Via Vercel CLI (Alternativo)

Se você tem a Vercel CLI instalada, pode usar comandos:

#### 1. Instalar Vercel CLI (se não tiver)
```bash
npm install -g vercel
```

#### 2. Fazer Login
```bash
vercel login
```

#### 3. Adicionar Variáveis de Ambiente
```bash
# Adicionar VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL production preview development

# Quando pedir o valor, cole: https://atexvoxukvaqittpqkov.supabase.co

# Adicionar VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY production preview development

# Quando pedir o valor, cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4
```

#### 4. Fazer Deploy
```bash
vercel --prod
```

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique se está funcionando:

1. Acesse a URL do seu projeto na Vercel
2. Abra o console do navegador (F12)
3. Verifique se aparece:
   ```
   ✅ Supabase está configurado e disponível
   ```
4. Teste fazer um registro:
   - Preencha nome e sobrenome
   - Marque a confirmação de maioridade
   - Clique em "Entrar"
   - No console deve aparecer: `✅ Acesso registrado com sucesso no Supabase`

---

## 🔍 Troubleshooting

### Problema: Variáveis não estão sendo carregadas

**Solução:**
1. Verifique se selecionou todos os ambientes (Production, Preview, Development)
2. Faça um novo deploy após adicionar as variáveis
3. Verifique se os nomes das variáveis estão exatamente como:
   - `VITE_SUPABASE_URL` (com VITE_ no início)
   - `VITE_SUPABASE_ANON_KEY` (com VITE_ no início)

### Problema: Deploy falha

**Solução:**
1. Verifique os logs do deploy na Vercel
2. Certifique-se de que o build local funciona: `npm run build`
3. Verifique se todas as dependências estão no `package.json`

### Problema: Supabase não funciona em produção

**Solução:**
1. Verifique se as políticas RLS no Supabase permitem acesso público
2. Verifique se a tabela `first_access` existe no Supabase
3. Verifique os logs do console do navegador na versão de produção

---

## 📝 Checklist Final

Antes de considerar concluído, verifique:

- [ ] Variável `VITE_SUPABASE_URL` adicionada na Vercel
- [ ] Variável `VITE_SUPABASE_ANON_KEY` adicionada na Vercel
- [ ] Ambas as variáveis configuradas para Production, Preview e Development
- [ ] Novo deploy realizado após adicionar as variáveis
- [ ] Teste realizado na URL de produção
- [ ] Console do navegador mostra "Supabase está configurado"
- [ ] Registro de teste funcionando

---

## 🔗 Links Úteis

- [Dashboard Vercel](https://vercel.com/dashboard)
- [Documentação Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Dashboard](https://app.supabase.com)

---

## ⚠️ Importante

- As variáveis de ambiente na Vercel são **diferentes** do arquivo `.env` local
- Você precisa configurar em ambos os lugares:
  - **Local:** arquivo `.env` (já configurado)
  - **Produção:** Dashboard da Vercel (siga este guia)
- Nunca commite o arquivo `.env` no GitHub (já está no `.gitignore`)

