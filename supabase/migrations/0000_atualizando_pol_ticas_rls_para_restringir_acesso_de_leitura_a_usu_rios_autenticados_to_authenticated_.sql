-- 1. Restringir leitura da tabela models a usuários autenticados
DROP POLICY IF EXISTS "Public read access to models" ON public.models;
CREATE POLICY "Public read access to models" ON public.models 
FOR SELECT TO authenticated USING (true);

-- 2. Restringir leitura do global_feed a usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated read global feed" ON public.global_feed;
CREATE POLICY "Allow authenticated read global feed" ON public.global_feed 
FOR SELECT TO authenticated USING (true);

-- 3. Restringir leitura do model_feed a usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated read model feed" ON public.model_feed;
CREATE POLICY "Allow authenticated read model feed" ON public.model_feed 
FOR SELECT TO authenticated USING (true);

-- 4. Restringir leitura da tabela notifications a usuários autenticados
DROP POLICY IF EXISTS "authenticated_can_select_notifications" ON public.notifications;
CREATE POLICY "authenticated_can_select_notifications" ON public.notifications 
FOR SELECT TO authenticated USING (true);

-- 5. Adicionar política SELECT para payment_providers_config (necessário para o Admin Panel)
CREATE POLICY "Allow authenticated read payment configs" ON public.payment_providers_config 
FOR SELECT TO authenticated USING (true);