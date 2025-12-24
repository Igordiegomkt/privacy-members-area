-- Migration 0018: Garantindo a existência da tabela access_links e políticas RLS

-- 1. Criação da tabela (IF NOT EXISTS para idempotência)
CREATE TABLE IF NOT EXISTS public.access_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'model', 'product')),
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Habilitar RLS (se já estiver habilitado, não faz nada)
ALTER TABLE public.access_links ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS (Admin-only management)
-- Admin pode ver tudo
DROP POLICY IF EXISTS "admin_select_access_links" ON public.access_links;
CREATE POLICY "admin_select_access_links" ON public.access_links 
FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- Admin pode inserir
DROP POLICY IF EXISTS "admin_insert_access_links" ON public.access_links;
CREATE POLICY "admin_insert_access_links" ON public.access_links 
FOR INSERT TO authenticated WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- Admin pode atualizar
DROP POLICY IF EXISTS "admin_update_access_links" ON public.access_links;
CREATE POLICY "admin_update_access_links" ON public.access_links 
FOR UPDATE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- Admin pode deletar
DROP POLICY IF EXISTS "admin_delete_access_links" ON public.access_links;
CREATE POLICY "admin_delete_access_links" ON public.access_links 
FOR DELETE TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- 4. Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';