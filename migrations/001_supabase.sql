create table if not exists public.nan_users (
  id text primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  roles text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nan_graph_entities (
  id text primary key,
  labels text[] not null default '{}',
  name_th text not null,
  name_en text,
  description text,
  latitude double precision,
  longitude double precision,
  visibility text not null default 'public' check (visibility in ('public','community','restricted')),
  properties jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.nan_graph_relationships (
  source_id text not null references public.nan_graph_entities(id) on delete cascade,
  type text not null,
  target_id text not null references public.nan_graph_entities(id) on delete cascade,
  properties jsonb not null default '{}',
  primary key (source_id, type, target_id)
);

create table if not exists public.nan_community_posts (
  id text primary key,
  author_id text not null references public.nan_users(id),
  title text not null,
  body text not null,
  language text not null,
  visibility text not null check (visibility in ('public','community','restricted')),
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  related_entity_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nan_graph_entities_labels_idx on public.nan_graph_entities using gin(labels);
create index if not exists nan_graph_entities_properties_idx on public.nan_graph_entities using gin(properties);
create index if not exists nan_graph_relationships_source_idx on public.nan_graph_relationships(source_id);
create index if not exists nan_graph_relationships_target_idx on public.nan_graph_relationships(target_id);
create index if not exists nan_community_posts_status_idx on public.nan_community_posts(status, created_at desc);

alter table public.nan_users enable row level security;
alter table public.nan_graph_entities enable row level security;
alter table public.nan_graph_relationships enable row level security;
alter table public.nan_community_posts enable row level security;

drop policy if exists "public graph entities are readable" on public.nan_graph_entities;
create policy "public graph entities are readable" on public.nan_graph_entities
  for select to anon, authenticated using (visibility = 'public');

drop policy if exists "public graph relationships are readable" on public.nan_graph_relationships;
create policy "public graph relationships are readable" on public.nan_graph_relationships
  for select to anon, authenticated using (
    exists (select 1 from public.nan_graph_entities e where e.id = source_id and e.visibility = 'public')
    and exists (select 1 from public.nan_graph_entities e where e.id = target_id and e.visibility = 'public')
  );

drop policy if exists "approved public posts are readable" on public.nan_community_posts;
create policy "approved public posts are readable" on public.nan_community_posts
  for select to anon, authenticated using (visibility = 'public' and status = 'approved');
