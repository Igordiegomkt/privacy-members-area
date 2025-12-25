-- 1) Define o valor padrão para 'access'
ALTER TABLE public.access_links 
ALTER COLUMN link_type SET DEFAULT 'access';

-- 2) Atualiza todos os registros existentes onde link_type é NULL para 'access'
UPDATE public.access_links 
SET link_type = 'access' 
WHERE link_type IS NULL;

-- 3) Define a coluna como NOT NULL (agora que todos os valores estão preenchidos)
ALTER TABLE public.access_links 
ALTER COLUMN link_type SET NOT NULL;