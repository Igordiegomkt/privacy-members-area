# 🚀 CONFIGURAR VARIÁVEIS NA VERCEL - GUIA RÁPIDO

## ⚡ Ação Rápida (5 minutos)

### 📍 Passo 1: Acesse o Dashboard
1. Abra: **https://vercel.com/dashboard**
2. Faça login (ou crie conta se necessário)

### 📍 Passo 2: Encontre seu Projeto
1. Procure por **`privacy-members-area`** na lista de projetos
2. **Clique no nome do projeto**

### 📍 Passo 3: Vá em Settings
1. No topo da página, clique em **"Settings"**
2. No menu lateral esquerdo, clique em **"Environment Variables"**

### 📍 Passo 4: Adicione a Primeira Variável

**Clique no botão "Add New"** e preencha:

```
Name: VITE_SUPABASE_URL
Value: https://atexvoxukvaqittpqkov.supabase.co
```

**Marque TODAS as opções:**
- ✅ Production
- ✅ Preview  
- ✅ Development

**Clique em "Save"**

### 📍 Passo 5: Adicione a Segunda Variável

**Clique novamente em "Add New"** e preencha:

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4
```

**Marque TODAS as opções:**
- ✅ Production
- ✅ Preview
- ✅ Development

**Clique em "Save"**

### 📍 Passo 6: Fazer Deploy

**Opção A - Deploy Automático:**
- Se o GitHub está conectado, a Vercel fará deploy automaticamente
- Aguarde 2-3 minutos

**Opção B - Deploy Manual:**
1. Vá na aba **"Deployments"** (no topo)
2. Clique nos **três pontos (...)** do último deployment
3. Selecione **"Redeploy"**
4. Aguarde concluir

---

## ✅ Verificação

Após o deploy:

1. Acesse a URL do seu projeto (ex: `privacy-members-area.vercel.app`)
2. Abra o console do navegador (F12)
3. Deve aparecer: **"✅ Supabase está configurado e disponível"**
4. Teste fazer um registro - deve funcionar!

---

## 📋 Resumo das Credenciais

**Variável 1:**
- Nome: `VITE_SUPABASE_URL`
- Valor: `https://atexvoxukvaqittpqkov.supabase.co`

**Variável 2:**
- Nome: `VITE_SUPABASE_ANON_KEY`
- Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4`

---

## 🆘 Precisa de Ajuda?

Se tiver dúvidas, consulte o arquivo **VERCEL_SETUP.md** para instruções mais detalhadas.

---

## ⚠️ IMPORTANTE

- **Copie e cole os valores exatamente como estão acima**
- **Marque TODAS as opções de ambiente** (Production, Preview, Development)
- **Faça um novo deploy após adicionar as variáveis**

