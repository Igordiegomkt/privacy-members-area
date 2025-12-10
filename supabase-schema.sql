-- ============================================
-- TABELA: first_access
-- Descrição: Armazena os primeiros acessos dos clientes VIP
-- ============================================

-- Criar a tabela para armazenar os primeiros acessos
CREATE TABLE IF NOT EXISTS first_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Informações do usuário
  name VARCHAR(255) NOT NULL,
  is_adult BOOLEAN NOT NULL DEFAULT false,
  
  -- Informações técnicas
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- UTMs (Urchin Tracking Module) - Parâmetros de rastreamento de marketing
  utm_source VARCHAR(255),        -- Origem do tráfego (ex: google, facebook, email)
  utm_medium VARCHAR(255),          -- Meio de marketing (ex: cpc, banner, email)
  utm_campaign VARCHAR(255),        -- Nome da campanha (ex: summer_sale, black_friday)
  utm_term VARCHAR(255),             -- Termo de busca (para anúncios pagos)
  utm_content VARCHAR(255),         -- Conteúdo específico (ex: logolink, textlink)
  
  -- Referrer (de onde veio o usuário)
  referrer TEXT,                    -- URL de referência completa
  referrer_domain VARCHAR(255),     -- Domínio de referência (ex: google.com)
  
  -- Informações da sessão
  landing_page TEXT,                -- Primeira página acessada
  device_type VARCHAR(50),          -- mobile, desktop, tablet
  browser VARCHAR(100),              -- Chrome, Firefox, Safari, etc.
  operating_system VARCHAR(100),    -- Windows, macOS, iOS, Android, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para melhor performance
-- ============================================

-- Índice para busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_first_access_name ON first_access(name);

-- Índice para busca por data de criação (ordem decrescente)
CREATE INDEX IF NOT EXISTS idx_first_access_created_at ON first_access(created_at DESC);

-- Índice para busca por UTM source
CREATE INDEX IF NOT EXISTS idx_first_access_utm_source ON first_access(utm_source);

-- Índice para busca por UTM campaign
CREATE INDEX IF NOT EXISTS idx_first_access_utm_campaign ON first_access(utm_campaign);

-- Índice para busca por referrer domain
CREATE INDEX IF NOT EXISTS idx_first_access_referrer_domain ON first_access(referrer_domain);

-- Índice composto para análises de campanha
CREATE INDEX IF NOT EXISTS idx_first_access_utm_combo ON first_access(utm_source, utm_medium, utm_campaign);

-- Índice para busca por device type
CREATE INDEX IF NOT EXISTS idx_first_access_device_type ON first_access(device_type);

-- ============================================
-- FUNÇÃO para atualizar updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER para atualizar updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_first_access_updated_at ON first_access;

CREATE TRIGGER update_first_access_updated_at
  BEFORE UPDATE ON first_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS na tabela
ALTER TABLE first_access ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON first_access;
DROP POLICY IF EXISTS "Allow read own records" ON first_access;
DROP POLICY IF EXISTS "Allow public insert" ON first_access;
DROP POLICY IF EXISTS "Allow public read" ON first_access;

-- Política para permitir inserção de dados (qualquer um pode inserir via API anônima)
CREATE POLICY "Allow public insert" ON first_access
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir leitura (ajuste conforme necessário)
-- Por padrão, permitimos leitura para todos (você pode restringir depois)
CREATE POLICY "Allow public read" ON first_access
  FOR SELECT
  USING (true);

-- ============================================
-- COMENTÁRIOS nas colunas (documentação)
-- ============================================

COMMENT ON TABLE first_access IS 'Armazena os primeiros acessos dos clientes VIP com informações de rastreamento UTM';
COMMENT ON COLUMN first_access.utm_source IS 'Origem do tráfego (ex: google, facebook, instagram, email)';
COMMENT ON COLUMN first_access.utm_medium IS 'Meio de marketing (ex: cpc, banner, email, social, organic)';
COMMENT ON COLUMN first_access.utm_campaign IS 'Nome da campanha de marketing (ex: summer_sale, black_friday, launch)';
COMMENT ON COLUMN first_access.utm_term IS 'Termo de busca usado (para anúncios pagos)';
COMMENT ON COLUMN first_access.utm_content IS 'Conteúdo específico que gerou o clique (ex: logolink, textlink, banner_1)';

-- ============================================
-- VIEW para análises rápidas
-- ============================================

CREATE OR REPLACE VIEW first_access_analytics AS
SELECT 
  DATE(created_at) as access_date,
  COUNT(*) as total_accesses,
  COUNT(DISTINCT name) as unique_users,
  COUNT(DISTINCT ip_address) as unique_ips,
  utm_source,
  utm_medium,
  utm_campaign,
  device_type,
  referrer_domain
FROM first_access
GROUP BY 
  DATE(created_at),
  utm_source,
  utm_medium,
  utm_campaign,
  device_type,
  referrer_domain
ORDER BY access_date DESC, total_accesses DESC;

COMMENT ON VIEW first_access_analytics IS 'View agregada para análises rápidas de acessos por data, UTM e dispositivo';

-- ============================================
-- FIM DO SCRIPT
-- ============================================
