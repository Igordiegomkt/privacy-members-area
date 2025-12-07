# ⚙️ Configuração de Variáveis de Ambiente

## ✅ Arquivo .env Local (Já Criado)

O arquivo `.env` já foi criado na raiz do projeto com as credenciais do Supabase.

## 🔄 Próximos Passos

### 1. Reiniciar o Servidor de Desenvolvimento

**IMPORTANTE:** Após criar/editar o arquivo `.env`, você precisa:

1. **Parar o servidor** (Ctrl+C no terminal onde está rodando)
2. **Iniciar novamente:**
   ```bash
   npm run dev
   ```

As variáveis de ambiente só são carregadas quando o servidor inicia!

### 2. Verificar se Funcionou

Após reiniciar, abra o console do navegador (F12) e verifique:

✅ **Deve aparecer:**
```
✅ Supabase está configurado e disponível
```

❌ **NÃO deve aparecer:**
```
Variáveis do Supabase não configuradas
```

### 3. Testar o Registro

1. Acesse a página de login
2. Preencha nome e sobrenome
3. Marque a confirmação de maioridade
4. Clique em "Entrar"
5. No console, deve aparecer:
   ```
   ✅ Acesso registrado com sucesso no Supabase. ID: ...
   ```

## 🌐 Configurar na Vercel (Produção)

Para que funcione na Vercel, você precisa adicionar as variáveis de ambiente:

### Passo a Passo:

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione seu projeto `privacy-members-area`
3. Vá em **Settings** > **Environment Variables**
4. Clique em **Add New**
5. Adicione as seguintes variáveis:

   **Variável 1:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://seu-projeto.supabase.co` (substitua pelo URL do seu projeto)
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

   **Variável 2:**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `sua_chave_anon_aqui` (substitua pela chave anon do seu projeto)
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
   
   **Onde encontrar:** Dashboard do Supabase > Settings > API

6. Clique em **Save**
7. **Faça um novo deploy** (ou aguarde o próximo deploy automático)

## 🔍 Verificar Variáveis no Código

Se quiser verificar se as variáveis estão sendo carregadas, adicione temporariamente no código:

```typescript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado');
```

## ⚠️ Importante

- O arquivo `.env` está no `.gitignore` e **NÃO será commitado** no GitHub
- **Nunca** commite credenciais no código
- Use sempre a **ANON KEY** (nunca a Service Role Key) no frontend
- As variáveis na Vercel são necessárias para produção

## 🐛 Problemas Comuns

### "Variáveis do Supabase não configuradas"
- ✅ Verifique se o arquivo `.env` existe na raiz do projeto
- ✅ Reinicie o servidor de desenvolvimento
- ✅ Verifique se as variáveis estão escritas corretamente (sem espaços extras)

### Funciona localmente mas não na Vercel
- ✅ Verifique se as variáveis estão configuradas na Vercel
- ✅ Faça um novo deploy após adicionar as variáveis
- ✅ Verifique se selecionou todos os ambientes (Production, Preview, Development)

