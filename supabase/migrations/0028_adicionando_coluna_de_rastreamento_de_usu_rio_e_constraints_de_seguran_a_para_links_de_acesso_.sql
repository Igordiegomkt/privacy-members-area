-- FASE 1: PREPARAÇÃO DO BANCO DE DADOS PARA LINKS TIPO GRANT

-- 1. Adicionar coluna para rastrear o ID do usuário autenticado que validou o link.
-- Esta coluna é opcional e referencia auth.users.
ALTER TABLE public.access_links
ADD COLUMN IF NOT EXISTS last_validator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Criar CHECK constraint para garantir que link_type seja 'access' ou 'grant'.
-- Nota: A coluna link_type já existe com DEFAULT 'access', garantindo que links existentes funcionem.
ALTER TABLE public.access_links
ADD CONSTRAINT access_links_link_type_check
CHECK (link_type IN ('access', 'grant'));

-- 3. Criar índices para performance.

-- Índice para link_type
CREATE INDEX IF NOT EXISTS idx_access_links_link_type ON public.access_links (link_type);

-- Índice parcial para model_id (útil para buscas por escopo de modelo)
CREATE INDEX IF NOT EXISTS idx_access_links_model_id_not_null ON public.access_links (model_id)
WHERE model_id IS NOT NULL;