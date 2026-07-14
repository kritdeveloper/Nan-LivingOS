create table if not exists public.nan_sources (
  id text primary key,
  title text not null,
  url text not null unique,
  publisher text not null,
  source_type text not null,
  accessed_at timestamptz not null default now()
);

create table if not exists public.nan_entity_sources (
  entity_id text not null references public.nan_graph_entities(id) on delete cascade,
  source_id text not null references public.nan_sources(id) on delete cascade,
  role text not null default 'reference',
  primary key(entity_id, source_id, role)
);

alter table public.nan_sources enable row level security;
alter table public.nan_entity_sources enable row level security;

drop policy if exists "sources are publicly readable" on public.nan_sources;
create policy "sources are publicly readable" on public.nan_sources for select to anon, authenticated using (true);
drop policy if exists "entity citations are publicly readable" on public.nan_entity_sources;
create policy "entity citations are publicly readable" on public.nan_entity_sources for select to anon, authenticated using (true);
