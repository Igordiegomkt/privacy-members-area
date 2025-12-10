-- 1. Garantir RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Usuário autenticado pode ler o próprio profile (SELECT)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING ( id = auth.uid() );

-- 3. Usuário autenticado pode inserir o próprio profile (INSERT)
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ( id = auth.uid() );

-- 4. Usuário autenticado pode atualizar o próprio profile (UPDATE)
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );

-- 5. Admin pode fazer TUDO em profiles (para fins de manutenção, se necessário)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
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