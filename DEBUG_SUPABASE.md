# 🔍 Debug do Supabase - Guia de Verificação

## Problema: Dados não estão sendo salvos no Supabase

Se os dados não estão sendo salvos, siga estes passos para identificar o problema:

## 1. Verificar Variáveis de Ambiente

### No Console do Navegador (F12)
Abra o console e verifique se aparecem estas mensagens:

```
✅ Supabase está configurado e disponível
🔵 Tentando inserir no Supabase...
📦 Payload: { ... }
🔗 Supabase URL: Configurado
```

**Se aparecer "Não configurado":**
- As variáveis de ambiente não estão configuradas
- Verifique se você tem um arquivo `.env` na raiz do projeto
- Verifique se as variáveis estão configuradas na Vercel (Settings > Environment Variables)

### Variáveis Necessárias:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

## 2. Verificar Erros no Console

### Erro: "Tabela first_access não encontrada"
**Solução:** Execute o script SQL no Supabase Dashboard:
1. Acesse https://app.supabase.com
2. Vá em SQL Editor
3. Cole o conteúdo de `supabase-schema.sql`
4. Execute o script

### Erro: "PGRST116" ou "Nenhuma linha retornada"
**Solução:** Verifique as políticas RLS (Row Level Security):
1. No Supabase Dashboard, vá em Authentication > Policies
2. Verifique se a tabela `first_access` tem políticas que permitem INSERT
3. Se não tiver, execute este SQL:

```sql
-- Permitir INSERT para todos (público)
CREATE POLICY "Allow public insert" ON first_access
FOR INSERT
TO public
WITH CHECK (true);

-- Permitir SELECT para todos (opcional)
CREATE POLICY "Allow public select" ON first_access
FOR SELECT
TO public
USING (true);
```

### Erro: "Invalid API key" ou "Unauthorized"
**Solução:** 
- Verifique se a `VITE_SUPABASE_ANON_KEY` está correta
- Verifique se não está usando a Service Role Key (nunca use no frontend!)

## 3. Verificar se a Tabela Existe

No Supabase Dashboard:
1. Vá em Table Editor
2. Procure pela tabela `first_access`
3. Se não existir, execute o script `supabase-schema.sql`

## 4. Testar Manualmente no Supabase

No SQL Editor do Supabase, teste inserir um registro:

```sql
INSERT INTO first_access (
  name, 
  is_adult, 
  ip_address, 
  user_agent
) VALUES (
  'Teste Manual',
  true,
  '127.0.0.1',
  'Test Browser'
) RETURNING id;
```

Se funcionar, o problema está no código. Se não funcionar, o problema está na configuração do banco.

## 5. Verificar Logs Detalhados

No console do navegador, você verá logs como:

```
🔵 Tentando inserir no Supabase...
📦 Payload: { name: "...", is_adult: true, ... }
📥 Resposta do Supabase: { data: {...}, error: null }
✅ Acesso registrado com sucesso no Supabase. ID: abc-123
```

**Se aparecer erro:**
- Copie a mensagem de erro completa
- Verifique o código de erro (ex: PGRST116, 42P01)
- Siga as soluções acima baseado no código de erro

## 6. Verificar Redirecionamento Automático

Se você já se registrou antes, ao acessar `/login` você deve ser redirecionado automaticamente para `/profile`.

**Para testar:**
1. Limpe o localStorage: `localStorage.clear()`
2. Faça um novo registro
3. Feche e abra a aba novamente
4. Acesse `/login` - deve redirecionar automaticamente

## 7. Checklist Rápido

- [ ] Variáveis de ambiente configuradas (`.env` ou Vercel)
- [ ] Tabela `first_access` existe no Supabase
- [ ] Políticas RLS permitem INSERT público
- [ ] Console mostra "Supabase está configurado"
- [ ] Não há erros no console do navegador
- [ ] Teste manual no SQL Editor funciona

## 8. Contato para Suporte

Se após seguir todos os passos o problema persistir:
1. Copie todos os logs do console
2. Verifique o Network tab (F12 > Network) para ver a requisição ao Supabase
3. Verifique se a requisição está sendo feita e qual a resposta

