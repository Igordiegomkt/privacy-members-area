# 🚀 Deploy na Vercel - Comandos

## Opção 1: Via CLI (Terminal)

### Passo 1: Login
```bash
vercel login
```
Isso abrirá o navegador para você fazer login na Vercel.

### Passo 2: Deploy para Produção
```bash
vercel --prod
```

Ou se já estiver conectado ao projeto:
```bash
vercel deploy --prod
```

---

## Opção 2: Via Dashboard (Mais Fácil)

### Passo 1: Acesse o Dashboard
1. Vá para: **https://vercel.com/dashboard**
2. Faça login

### Passo 2: Encontre seu Projeto
1. Procure por **`privacy-members-area`**
2. Clique no nome do projeto

### Passo 3: Faça Redeploy
1. Vá na aba **"Deployments"** (no topo)
2. Clique nos **três pontos (...)** do último deployment
3. Selecione **"Redeploy"**
4. Aguarde concluir (2-3 minutos)

---

## ⚠️ Importante Antes do Deploy

Certifique-se de que as variáveis de ambiente estão configuradas:

1. Vá em **Settings** > **Environment Variables**
2. Verifique se existem:
   - ✅ `VITE_SUPABASE_URL`
   - ✅ `VITE_SUPABASE_ANON_KEY`
3. Se não existirem, adicione seguindo o guia em `CONFIGURAR_VERCEL_AGORA.md`

---

## ✅ Verificação Pós-Deploy

Após o deploy:

1. Acesse a URL do seu projeto (ex: `privacy-members-area.vercel.app`)
2. Abra o console do navegador (F12)
3. Deve aparecer: **"✅ Supabase está configurado e disponível"**
4. Teste fazer um registro - deve funcionar!

---

## 🔄 Deploy Automático

Se você conectou o repositório GitHub à Vercel:

- ✅ Cada push no GitHub faz deploy automático
- ✅ Você acabou de fazer push, então o deploy deve estar acontecendo agora
- ✅ Verifique em: https://vercel.com/dashboard > Seu projeto > Deployments

---

## 📝 Comandos Úteis

```bash
# Ver status do projeto
vercel ls

# Ver informações do projeto
vercel inspect

# Ver logs do último deploy
vercel logs

# Remover projeto (cuidado!)
vercel remove
```

