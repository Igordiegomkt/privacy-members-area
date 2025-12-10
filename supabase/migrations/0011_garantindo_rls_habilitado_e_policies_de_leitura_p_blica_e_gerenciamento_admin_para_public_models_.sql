-- 1. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Public read access to models" ON public.models;
DROP POLICY IF EXISTS "Admin can manage models" ON public.models;

-- 2. Habilitar RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- 3. Policy de leitura pública (SELECT)
CREATE POLICY "Public read access to models"
ON public.models
FOR SELECT
TO public
USING ( true );

-- 4. Policy de gerenciamento Admin (ALL)
CREATE POLICY "Admin can manage models"
ON public.models
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);