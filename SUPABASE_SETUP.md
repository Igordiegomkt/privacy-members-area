# Configuração do Supabase

## Passo 1: Criar a Tabela no Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `supabase-schema.sql`
6. Clique em **Run** para executar o script

## Passo 2: Configurar Variáveis de Ambiente

### Localmente

1. Crie um arquivo `.env` na raiz do projeto (se ainda não existir)
2. Adicione as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://atexvoxukvaqittpqkov.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### Na Vercel

1. Acesse o dashboard da Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Faça o deploy novamente

## Passo 3: Verificar Row Level Security (RLS)

A tabela `first_access` já está configurada com RLS habilitado e políticas que permitem:
- **INSERT**: Qualquer usuário pode inserir registros
- **SELECT**: Qualquer usuário pode ler registros (ajuste conforme necessário)

Se precisar de mais segurança, ajuste as políticas no Supabase Dashboard em **Authentication** > **Policies**.

## Estrutura da Tabela

A tabela `first_access` possui os seguintes campos:

- `id` (UUID): Identificador único
- `name` (VARCHAR): Nome do usuário
- `is_adult` (BOOLEAN): Confirmação de maioridade
- `ip_address` (VARCHAR): Endereço IP do usuário
- `user_agent` (TEXT): Informações do navegador
- `created_at` (TIMESTAMP): Data de criação
- `updated_at` (TIMESTAMP): Data de atualização

## Consultar Dados

Para ver os acessos registrados:

1. No Supabase Dashboard, vá em **Table Editor**
2. Selecione a tabela `first_access`
3. Você verá todos os registros de primeiro acesso

Ou use o SQL Editor:

```sql
SELECT * FROM first_access ORDER BY created_at DESC;
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` no código do cliente
- Use apenas `VITE_SUPABASE_ANON_KEY` no frontend
- A `SERVICE_ROLE_KEY` deve ser usada apenas em funções server-side ou edge functions

