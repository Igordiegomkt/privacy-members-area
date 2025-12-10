-- 3.2. Upsert do profile admin
INSERT INTO public.profiles (id, first_name, role)
VALUES ('31e2d917-e07f-4d4a-9dc6-3e7e7a869c1d', 'Igor', 'admin')
ON CONFLICT (id) DO
  UPDATE SET role = 'admin';