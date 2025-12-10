-- 1. Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- 2. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: usuário autenticado consegue ler o próprio profile (SELECT)
CREATE POLICY "profiles_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING ( id = auth.uid() );

-- 4. Policy: admin pode fazer tudo em profiles (ALL)
CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);