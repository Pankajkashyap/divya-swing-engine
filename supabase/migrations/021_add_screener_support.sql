-- 021_add_screener_support.sql

alter table public.watchlist
  add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'watchlist_source_check'
  ) then
    alter table public.watchlist
      add constraint watchlist_source_check
      check (source in ('manual', 'automation'));
  end if;
end $$;

update public.watchlist
set source = 'manual'
where source is null;

alter table public.user_settings
  add column if not exists screener_enabled boolean not null default false;

alter table public.user_settings
  add column if not exists screener_min_price numeric not null default 10;

alter table public.user_settings
  add column if not exists screener_min_avg_volume integer not null default 500000;

alter table public.user_settings
  add column if not exists screener_min_eps_growth_pct numeric not null default 25;

alter table public.user_settings
  add column if not exists screener_min_revenue_growth_pct numeric not null default 20;

alter table public.user_settings
  add column if not exists screener_exchanges text not null default 'XNAS,XNYS';

alter table public.user_settings
  add column if not exists screener_max_candidates integer not null default 20;

update public.user_settings
set
  screener_enabled = coalesce(screener_enabled, false),
  screener_min_price = coalesce(screener_min_price, 10),
  screener_min_avg_volume = coalesce(screener_min_avg_volume, 500000),
  screener_min_eps_growth_pct = coalesce(screener_min_eps_growth_pct, 25),
  screener_min_revenue_growth_pct = coalesce(screener_min_revenue_growth_pct, 20),
  screener_exchanges = coalesce(screener_exchanges, 'XNAS,XNYS'),
  screener_max_candidates = coalesce(screener_max_candidates, 20)
where
  screener_enabled is null
  or screener_min_price is null
  or screener_min_avg_volume is null
  or screener_min_eps_growth_pct is null
  or screener_min_revenue_growth_pct is null
  or screener_exchanges is null
  or screener_max_candidates is null;