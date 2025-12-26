-- Migration 0020: Adicionando token_plain e tabela access_link_visits

-- 1. Adicionar token_plain na access_links (para exibição no Admin)
ALTER TABLE public.access_links
ADD COLUMN IF NOT EXISTS token_plain TEXT NULL;

-- 2. Criar tabela access_link_visits
CREATE TABLE IF NOT EXISTS public.access_link_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_link_id UUID NOT NULL REFERENCES public.access_links(id) ON DELETE CASCADE,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visitor_name TEXT NULL,
  visitor_email TEXT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT NULL,
  ip TEXT NULL
);

-- 3. Habilitar RLS e políticas admin-only para access_link_visits
ALTER TABLE public.access_link_visits ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
DROP POLICY IF EXISTS "admin_select_access_link_visits" ON public.access_link_visits;
CREATE POLICY "admin_select_access_link_visits" ON public.access_link_visits 
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- Admin pode inserir (opcional, mas útil para testes)
DROP POLICY IF EXISTS "admin_insert_access_link_visits" ON public.access_link_visits;
CREATE POLICY "admin_insert_access_link_visits" ON public.access_link_visits 
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- 4. Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';