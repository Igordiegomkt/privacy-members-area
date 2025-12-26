SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename='user_purchases'
  AND indexdef ILIKE '%(user_id, product_id)%';