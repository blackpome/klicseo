-- Fuzzy car search backing the booking wizard's type-ahead.
--
-- Plain ILIKE '%brand model%' fails because no single column holds both words,
-- and it can't tolerate typos. This function combines:
--   * substring ILIKE on brand, model and "brand model" (exact partials), and
--   * pg_trgm similarity / word_similarity (typo + word-order tolerance),
-- then ranks by the best trigram score. Trigram similarity is the text analog
-- of cosine similarity used here for ranking.

create extension if not exists "pg_trgm";

create or replace function public.search_cars(q text, max_results int default 8)
returns setof public.cars
language sql
stable
as $$
  with needle as (select lower(trim(coalesce(q, ''))) as t)
  select c.*
  from public.cars c, needle n
  where length(n.t) > 0
    and (
      c.brand ilike '%' || n.t || '%'
      or c.model ilike '%' || n.t || '%'
      or (c.brand || ' ' || c.model) ilike '%' || n.t || '%'
      or word_similarity(n.t, lower(c.brand || ' ' || c.model)) > 0.30
      or similarity(n.t, lower(c.model)) > 0.30
      or similarity(n.t, lower(c.brand)) > 0.30
    )
  order by
    greatest(
      word_similarity(n.t, lower(c.brand || ' ' || c.model)),
      similarity(n.t, lower(c.model)),
      similarity(n.t, lower(c.brand))
    ) desc,
    c.brand asc,
    c.model asc
  limit greatest(1, max_results);
$$;
