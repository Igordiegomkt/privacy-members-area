-- 1. Remover todas as policies de profiles para recriar
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- 2. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: usuário autenticado consegue ler o próprio profile (SELECT)
CREATE POLICY "profiles_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING ( id = auth.uid() );

-- 4. Policy: usuário autenticado consegue inserir o próprio profile (INSERT)
CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ( id = auth.uid() );

-- 5. Policy: usuário autenticado consegue atualizar o próprio profile (UPDATE)
CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );