-- 1. Garantir que a tabela models está com RLS habilitado
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- 2. Remover a política ALL existente para recriar de forma mais clara (se necessário)
DROP POLICY IF EXISTS "Admin can manage models" ON public.models;

-- 3. Apenas ADMIN pode criar, editar e deletar modelos
CREATE POLICY "models_admin_manage"
ON public.models
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

-- 4. Garantir que qualquer usuário (público) pode ler modelos
DROP POLICY IF EXISTS "Public read access to models" ON public.models;
CREATE POLICY "models_select_public"
ON public.models
FOR SELECT
USING ( true );