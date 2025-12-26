-- Migration 0023: Access Links Debug and Diagnostics

-- 1. Instalar pgcrypto se não estiver instalado (necessário para digest/sha256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A) Ver últimos links criados:
SELECT id, scope, active, expires_at, max_uses, uses, created_at, token_hash, token_plain
FROM public.access_links
ORDER BY created_at DESC
LIMIT 10;

-- B) Testar a RPC usando o token_hash armazenado (deve retornar OK se link válido)
-- Substitua <HASH_DO_BANCO> por um token_hash válido da consulta A
-- SELECT * FROM public.consume_access_link('<HASH_DO_BANCO>');

-- C) Diagnóstico definitivo: conferir se token_hash do banco bate com sha256(token_plain)
SELECT
  id,
  token_hash AS saved_hash,
  encode(digest(token_plain, 'sha256'), 'hex') AS computed_hash,
  (token_hash = encode(digest(token_plain, 'sha256'), 'hex')) AS matches,
  created_at
FROM public.access_links
WHERE token_plain IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- D) Diagnóstico: procurar tokens com espaços/encoding suspeito:
SELECT id, token_plain
FROM public.access_links
WHERE token_plain ~ '\s'
ORDER BY created_at DESC
LIMIT 10;