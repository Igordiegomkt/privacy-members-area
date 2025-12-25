CREATE OR REPLACE FUNCTION public.consume_access_link(p_token_hash text, p_visitor_name text DEFAULT NULL::text, p_visitor_email text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_user_agent text DEFAULT NULL::text, p_ip text DEFAULT NULL::text)
 RETURNS TABLE(ok boolean, code text, message text, scope text, model_id uuid, product_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.access_links%ROWTYPE;
  v_message text;
  v_product_id uuid;
  v_price_cents integer;
  v_product_name text;
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

  -- 2. Validações
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

  -- 3. Lógica de Grant (Tipo B)
  IF v_link.link_type = 'grant' THEN
    IF p_user_id IS NULL THEN
      v_message := 'Login é obrigatório para ativar o acesso permanente.';
      RETURN QUERY SELECT
        false,
        'LOGIN_REQUIRED',
        v_message,
        v_link.scope::text,
        v_link.model_id,
        v_link.product_id,
        v_link.expires_at;
      RETURN;
    END IF;

    -- 3a. Resolver product_id
    v_product_id := v_link.product_id;
    IF v_product_id IS NULL AND v_link.model_id IS NOT NULL THEN
      -- Se não tem produto, busca o base_membership da modelo
      SELECT id, price_cents, name
      INTO v_product_id, v_price_cents, v_product_name
      FROM public.products
      WHERE products.model_id = v_link.model_id -- QUALIFICADO
        AND is_base_membership = TRUE
        AND status = 'active'
      LIMIT 1;
    ELSIF v_product_id IS NOT NULL THEN
      -- Se tem produto, busca o preço
      SELECT price_cents, name
      INTO v_price_cents, v_product_name
      FROM public.products
      WHERE id = v_product_id
      LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN
      v_message := 'Produto base não encontrado para este link de acesso.';
      RETURN QUERY SELECT
        false,
        'PRODUCT_NOT_FOUND',
        v_message,
        v_link.scope::text,
        v_link.model_id,
        v_link.product_id,
        v_link.expires_at;
      RETURN;
    END IF;

    -- 3b. Inserir/Garantir user_purchase (idempotente)
    INSERT INTO public.user_purchases (user_id, product_id, status, price_paid_cents, amount_cents, paid_at, payment_provider, payment_data)
    VALUES (
      p_user_id,
      v_product_id,
      'paid',
      COALESCE(v_price_cents, 0), -- Usar preço do produto ou 0
      COALESCE(v_price_cents, 0),
      NOW(),
      'external_link', -- Marcando a origem
      jsonb_build_object('source', 'access_link_grant', 'link_id', v_link.id, 'product_name', v_product_name)
    )
    ON CONFLICT (user_id, product_id) DO UPDATE
    SET
      status = 'paid',
      paid_at = NOW(),
      payment_provider = 'external_link'
    WHERE user_purchases.status != 'paid'; -- Atualiza apenas se não estiver pago

  END IF; -- Fim da Lógica de Grant

  -- 4. Atualiza o registro do link (incrementa usos e registra último validador)
  UPDATE public.access_links
  SET
    uses = uses + 1,
    last_used_at = now(),
    first_used_at = COALESCE(first_used_at, now()),
    last_validator_name = p_visitor_name,
    last_validator_email = p_visitor_email
  WHERE id = v_link.id;

  -- 5. Insere o registro de visita (log)
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
$function$