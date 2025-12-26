-- 1) Create table public.access_links
CREATE TABLE IF NOT EXISTS public.access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  model_id UUID NULL REFERENCES public.models(id) ON DELETE CASCADE,
  product_id UUID NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  max_uses INT NULL,
  uses INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES auth.users(id), -- Referência ao admin que criou
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.access_links IS 'Links de acesso temporário ou limitado para conteúdo (ex: links de migração ou upsell).';

-- 2) CHECK constraints (coerência do escopo)
ALTER TABLE public.access_links DROP CONSTRAINT IF EXISTS access_links_scope_check;
ALTER TABLE public.access_links ADD CONSTRAINT access_links_scope_check
CHECK (
  (scope = 'global' AND model_id IS NULL AND product_id IS NULL) OR
  (scope = 'model' AND model_id IS NOT NULL AND product_id IS NULL) OR
  (scope = 'product' AND product_id IS NOT NULL AND model_id IS NULL)
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_access_links_active_expires ON public.access_links (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_access_links_scope_model ON public.access_links (scope, model_id);
CREATE INDEX IF NOT EXISTS idx_access_links_scope_product ON public.access_links (scope, product_id);

-- 4) Trigger updated_at
-- Drop existing trigger if it exists to ensure idempotency
DROP TRIGGER IF EXISTS update_access_links_updated_at ON public.access_links;

-- Create trigger
CREATE TRIGGER update_access_links_updated_at
BEFORE UPDATE ON public.access_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) RLS + Policies
ALTER TABLE public.access_links ENABLE ROW LEVEL SECURITY;

-- Policy helper: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

-- Policy: Admins can SELECT all
CREATE POLICY "Admin can view all access links" ON public.access_links
FOR SELECT TO authenticated
USING (is_admin());

-- Policy: Admins can INSERT
CREATE POLICY "Admin can insert access links" ON public.access_links
FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Policy: Admins can UPDATE all
CREATE POLICY "Admin can update access links" ON public.access_links
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Admins can DELETE all
CREATE POLICY "Admin can delete access links" ON public.access_links
FOR DELETE TO authenticated
USING (is_admin());