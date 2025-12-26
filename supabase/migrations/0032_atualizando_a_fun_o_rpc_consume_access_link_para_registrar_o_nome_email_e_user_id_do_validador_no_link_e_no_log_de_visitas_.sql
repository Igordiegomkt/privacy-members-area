CREATE OR REPLACE FUNCTION public.consume_access_link(p_token_hash text, p_visitor_name text DEFAULT NULL::text, p_visitor_email text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_user_agent text DEFAULT NULL::text, p_ip text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, code text, message text, scope text, model_id uuid, product_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.access_links%ROWTYPE;
  v_message text;
BEGIN
  -- 1. Busca o link
  SELECT *
  INTO v_link
  FROM public.access_links
  WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    v_message := 'Link de acesso não encontrado.';
    RETURN QUERY SELECT
      false,
      'INVALID_LINK',
      v_message,
      NULL::text,
      NULL::uuid,
      NULL::uuid,
      NULL::timestamptz;
    RETURN;
  END IF;

  -- 2. Validações de Access
  IF v_link.link_type != 'access' THEN
    v_message := 'Este link não é do tipo Access. Use a função grant_access_link.';
    RETURN QUERY SELECT
      false,
      'NOT_AN_ACCESS',
      v_message,
      v_link.scope::text,
      v_link.model_id,
      v_link.product_id,
      v_link.expires_at;
    RETURN;
  END IF;

  IF v_link.active IS FALSE THEN
    v_message := 'Link inativo.';
    RETURN QUERY SELECT
      false,
      'INACTIVE_LINK',
      v_message,
      v_link.scope::text,
      v_link.model_id,
      v_link.product_id,
      v_link.expires_at;
    RETURN;
  END IF;

  IF v_link.expires_at IS NOT NULL AND now() >= v_link.expires_at THEN
    v_message := 'Link expirado.';
    RETURN QUERY SELECT
      false,
      'EXPIRED_LINK',
      v_message,
      v_link.scope::text,
      v_link.model_id,
      v_link.product_id,
      v_link.expires_at;
    RETURN;
  END IF;

  IF v_link.max_uses IS NOT NULL AND v_link.uses >= v_link.max_uses THEN
    v_message := 'Limite de usos atingido.';
    RETURN QUERY SELECT
      false,
      'MAX_USES',
      v_message,
      v_link.scope::text,
      v_link.model_id,
      v_link.product_id,
      v_link.expires_at;
    RETURN;
  END IF;

  -- 3. Atualiza o registro do link (incrementa usos e registra último validador)
  UPDATE public.access_links
  SET
    uses = uses + 1,
    last_used_at = now(),
    first_used_at = COALESCE(first_used_at, now()),
    last_validator_name = p_visitor_name,
    last_validator_email = p_visitor_email,
    last_validator_user_id = p_user_id -- Adicionado user_id
  WHERE id = v_link.id;

  -- 4. Insere o registro de visita (log)
  INSERT INTO public.access_link_visits (
    access_link_id,
    visitor_name,
    visitor_email,
    user_id,
    user_agent,
    ip
  ) VALUES (
    v_link.id,
    p_visitor_name,
    p_visitor_email,
    p_user_id,
    p_user_agent,
    p_ip
  );

  v_message := 'OK';
  RETURN QUERY SELECT
    true,
    'OK',
    v_message,
    v_link.scope::text,
    v_link.model_id,
    v_link.product_id,
    v_link.expires_at;
END;
$function$;