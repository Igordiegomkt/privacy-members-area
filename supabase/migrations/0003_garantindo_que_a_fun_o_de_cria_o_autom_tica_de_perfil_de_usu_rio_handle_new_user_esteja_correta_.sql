CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Insere o novo usuário com a role padrão 'user'
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name',
    'user' -- Role padrão
  )
  ON CONFLICT (id) DO NOTHING; -- Adicionado ON CONFLICT para evitar erro se o trigger for disparado mais de uma vez
  RETURN new;
END;
$$;