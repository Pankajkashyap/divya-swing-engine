create table if not exists public.ticker_universe (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  company_name text null,
  index_membership text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticker_universe enable row level security;

create policy "Authenticated users can read ticker_universe"
  on public.ticker_universe for select
  to authenticated using (true);

create policy "Authenticated users can insert ticker_universe"
  on public.ticker_universe for insert
  to authenticated with check (true);

create policy "Authenticated users can update ticker_universe"
  on public.ticker_universe for update
  to authenticated using (true);

create policy "Authenticated users can delete ticker_universe"
  on public.ticker_universe for delete
  to authenticated using (true);