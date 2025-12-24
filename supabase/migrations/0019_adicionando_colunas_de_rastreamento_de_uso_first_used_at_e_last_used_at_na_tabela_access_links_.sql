-- Migration 0019: Adicionando colunas de rastreamento de uso em access_links

ALTER TABLE public.access_links
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS first_used_at TIMESTAMP WITH TIME ZONE NULL;

-- Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';