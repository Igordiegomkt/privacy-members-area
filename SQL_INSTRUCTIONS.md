# 📋 Instruções para Criar a Tabela no Supabase

## 🚀 Passo a Passo

### 1. Acesse o Supabase Dashboard
- Vá para: https://app.supabase.com
- Faça login na sua conta
- Selecione o projeto: `atexvoxukvaqittpqkov`

### 2. Abra o SQL Editor
- No menu lateral esquerdo, clique em **SQL Editor**
- Clique no botão **New Query** (ou use o atalho `Ctrl+K`)

### 3. Execute o Script SQL
- Abra o arquivo `supabase-schema.sql` do projeto
- **Copie TODO o conteúdo** do arquivo
- Cole no SQL Editor do Supabase
- Clique em **Run** (ou pressione `Ctrl+Enter`)

### 4. Verifique se Funcionou
- Vá em **Table Editor** no menu lateral
- Você deve ver a tabela `first_access` listada
- Clique nela para ver a estrutura com todos os campos

## 📊 Estrutura da Tabela

A tabela `first_access` armazena:

### Informações do Usuário
- `name` - Nome do cliente
- `is_adult` - Confirmação de maioridade

### Informações Técnicas
- `ip_address` - Endereço IP
- `user_agent` - Informações do navegador

### UTMs (Parâmetros de Rastreamento)
- `utm_source` - Origem do tráfego (ex: google, facebook, instagram)
- `utm_medium` - Meio de marketing (ex: cpc, banner, email, social)
- `utm_campaign` - Nome da campanha (ex: summer_sale, black_friday)
- `utm_term` - Termo de busca (para anúncios pagos)
- `utm_content` - Conteúdo específico (ex: logolink, textlink)

### Referrer
- `referrer` - URL completa de referência
- `referrer_domain` - Domínio de referência (ex: google.com)

### Informações da Sessão
- `landing_page` - Primeira página acessada
- `device_type` - Tipo de dispositivo (mobile, desktop, tablet)
- `browser` - Navegador (Chrome, Firefox, Safari, etc.)
- `operating_system` - Sistema operacional (Windows, macOS, iOS, Android)

### Timestamps
- `created_at` - Data e hora do primeiro acesso
- `updated_at` - Data e hora da última atualização

## 📈 View de Análises

O script também cria uma **View** chamada `first_access_analytics` que agrupa os dados para análises rápidas:

```sql
SELECT * FROM first_access_analytics 
ORDER BY access_date DESC;
```

Esta view mostra:
- Total de acessos por data
- Usuários únicos
- IPs únicos
- Agrupado por UTM, dispositivo e referrer

## 🔍 Exemplos de Consultas Úteis

### Ver todos os acessos
```sql
SELECT * FROM first_access 
ORDER BY created_at DESC;
```

### Acessos por campanha
```sql
SELECT 
  utm_campaign,
  COUNT(*) as total,
  COUNT(DISTINCT name) as usuarios_unicos
FROM first_access
WHERE utm_campaign IS NOT NULL
GROUP BY utm_campaign
ORDER BY total DESC;
```

### Acessos por origem (utm_source)
```sql
SELECT 
  utm_source,
  COUNT(*) as total
FROM first_access
WHERE utm_source IS NOT NULL
GROUP BY utm_source
ORDER BY total DESC;
```

### Acessos por dispositivo
```sql
SELECT 
  device_type,
  COUNT(*) as total
FROM first_access
GROUP BY device_type
ORDER BY total DESC;
```

### Acessos hoje
```sql
SELECT * FROM first_access 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

## 🎯 Como Usar UTMs nas URLs

Para rastrear de onde vêm os acessos, adicione parâmetros UTM nas URLs:

### Exemplo de URL com UTMs:
```
https://seusite.com/login?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=privacy&utm_content=ad1
```

### Parâmetros UTM:
- `utm_source` - De onde vem (google, facebook, instagram, email, etc.)
- `utm_medium` - Como vem (cpc, banner, email, social, organic, etc.)
- `utm_campaign` - Nome da campanha (summer_sale, black_friday, launch, etc.)
- `utm_term` - Termo de busca (para anúncios pagos)
- `utm_content` - Conteúdo específico (ad1, logolink, textlink, etc.)

### Exemplos Práticos:

**Google Ads:**
```
?utm_source=google&utm_medium=cpc&utm_campaign=privacy_promo&utm_term=privacy+app
```

**Facebook Ads:**
```
?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale&utm_content=video_ad
```

**Email Marketing:**
```
?utm_source=email&utm_medium=email&utm_campaign=newsletter_june&utm_content=cta_button
```

**Instagram:**
```
?utm_source=instagram&utm_medium=social&utm_campaign=influencer_promo
```

## ✅ Verificação

Após executar o script, verifique:

1. ✅ Tabela `first_access` criada
2. ✅ Índices criados (para performance)
3. ✅ Políticas RLS configuradas
4. ✅ View `first_access_analytics` criada
5. ✅ Trigger para `updated_at` funcionando

## 🔒 Segurança

As políticas RLS (Row Level Security) estão configuradas para:
- ✅ Permitir inserção de dados (qualquer um pode registrar acesso)
- ✅ Permitir leitura (você pode ajustar depois se necessário)

Para mais segurança, você pode restringir a leitura apenas para usuários autenticados.

