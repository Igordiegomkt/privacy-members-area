-- 1. Encontrar o ID da modelo 'carolina-andrade'
DO $$
DECLARE
    carolina_id UUID;
    media_id UUID;
BEGIN
    SELECT id INTO carolina_id FROM public.models WHERE username = 'carolina-andrade' LIMIT 1;

    IF carolina_id IS NOT NULL THEN
        -- 2. Inserir um item de mídia de teste (gratuito)
        INSERT INTO public.media_items (model_id, type, url, thumbnail, is_free, title, description)
        VALUES (
            carolina_id,
            'image',
            'https://conteudos.s3.us-east-005.backblazeb2.com/foto/foto1.png', -- Usando uma URL de foto existente
            'https://conteudos.s3.us-east-005.backblazeb2.com/foto/foto1.png',
            TRUE,
            'Bem-vinda ao Meu Privacy!',
            'Esta é a primeira postagem do feed global. Explore o perfil da Carolina para mais conteúdos.'
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO media_id;

        -- 3. Inserir no feed global (se a mídia foi inserida)
        IF media_id IS NOT NULL THEN
            INSERT INTO public.global_feed (model_id, media_id, title, subtitle, description, cta)
            VALUES (
                carolina_id,
                media_id,
                'Bem-vinda ao Meu Privacy!',
                'Confira o novo conteúdo gratuito!',
                'Esta é a primeira postagem do feed global. Explore o perfil da Carolina para mais conteúdos.',
                'Ver perfil'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;