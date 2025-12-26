CREATE OR REPLACE FUNCTION public.consume_access_link(p_token_hash text, p_visitor_name text DEFAULT NULL::text, p_visitor_email text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_user_agent text DEFAULT NULL::text, p_ip text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, code text, message text, scope text, model_id uuid, product_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_link_id uuid;
    v_link_active boolean;
    v_link_expires_at timestamp with time zone;
    v_link_max_uses integer;
    v_link_uses integer;
    v_link_scope text;
    v_link_model_id uuid;
    v_link_product_id uuid;
    v_now timestamp with time zone := now();
BEGIN
    -- 1. Tenta buscar o link e bloquear a linha para UPDATE
    SELECT id, active, expires_at, max_uses, uses, scope, model_id, product_id
    INTO v_link_id, v_link_active, v_link_expires_at, v_link_max_uses, v_link_uses, v_link_scope, v_link_model_id, v_link_product_id
    FROM public.access_links
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    -- 2. Validação
    IF v_link_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'INVALID_LINK', 'Link de acesso não encontrado.', NULL, NULL, NULL, NULL;
        RETURN;
    END IF;

    IF v_link_active = FALSE THEN
        RETURN QUERY SELECT FALSE, 'INACTIVE_LINK', 'Link inativo.', v_link_scope, v_link_model_id, v_link_product_id, v_link_expires_at;
        RETURN;
    END IF;

    IF v_link_expires_at IS NOT NULL AND v_now >= v_link_expires_at THEN
        RETURN QUERY SELECT FALSE, 'EXPIRED_LINK', 'Link expirado.', v_link_scope, v_link_model_id, v_link_product_id, v_link_expires_at;
        RETURN;
    END IF;

    IF v_link_max_uses IS NOT NULL AND v_link_uses >= v_link_max_uses THEN
        RETURN QUERY SELECT FALSE, 'MAX_USES', 'Limite de usos atingido.', v_link_scope, v_link_model_id, v_link_product_id, v_link_expires_at;
        RETURN;
    END IF;

    -- 3. Consumo Atômico (UPDATE)
    UPDATE public.access_links
    SET 
        uses = v_link_uses + 1,
        last_used_at = v_now,
        first_used_at = COALESCE(first_used_at, v_now)
    WHERE id = v_link_id;

    -- 4. Registro da Visita (Best effort)
    BEGIN
        INSERT INTO public.access_link_visits (access_link_id, visitor_name, visitor_email, user_id, user_agent, ip)
        VALUES (v_link_id, p_visitor_name, p_visitor_email, p_user_id, p_user_agent, p_ip);
    EXCEPTION WHEN others THEN
        -- Ignora falha no log de visita para não quebrar o acesso
        NULL;
    END;

    -- 5. Retorno de Sucesso
    RETURN QUERY SELECT TRUE, 'OK', 'Acesso concedido.', v_link_scope, v_link_model_id, v_link_product_id, v_link_expires_at;
    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro inesperado (ex: deadlock), retorna erro
        RETURN QUERY SELECT FALSE, 'DB_ERROR', SQLERRM, NULL, NULL, NULL, NULL;
        RETURN;
END;
$function$;

-- Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';