ALTER TABLE public.access_links
ADD COLUMN link_type TEXT NOT NULL DEFAULT 'access';

-- Adicionando índice para link_type para otimização de consultas futuras
CREATE INDEX IF NOT EXISTS idx_access_links_link_type ON public.access_links (link_type);