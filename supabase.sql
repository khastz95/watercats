-- WATERCATS — schema do zero (elenco, stats, clipes allstar.gg)
-- Não apaga tabelas da org WATERCATSGG (org_*).

drop table if exists public.week_player_stats cascade;
drop table if exists public.weeks cascade;
drop table if exists public.matches cascade;
drop table if exists public.camp_state cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.clips cascade;
drop table if exists public.player_stats cascade;
drop table if exists public.players cascade;
drop function if exists public.save_camp_state(jsonb);
drop function if exists public.load_camp_state();
drop function if exists public.parse_score(jsonb);
drop function if exists public.score_text(int);

create table public.players (
  id text primary key,
  name text not null,
  real_name text not null default '',
  role text not null default '',
  country text not null default '',
  city text not null default '',
  photo_url text not null default '',
  color text not null default '#006BFF',
  steam_id text not null default '',
  steam_url text not null default '',
  steam_avatar text not null default '',
  allstar_user text not null default '',
  allstar_username text not null default '',
  faceit_url text not null default '',
  faceit_nick text not null default '',
  faceit_elo int,
  discord text not null default '',
  twitch_url text not null default '',
  bio text not null default '',
  status text not null default 'active'
    check (status in ('active', 'inactive', 'alumni')),
  started_playing int,
  joined_at date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_stats (
  player_id text primary key references public.players(id) on delete cascade,
  rating numeric,
  kd numeric,
  adr numeric,
  hs_percent numeric,
  maps_played int,
  wins int,
  losses int,
  kills int,
  deaths int,
  assists int,
  first_kills int,
  clutches int,
  mvp int,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  player_id text references public.players(id) on delete cascade,
  title text not null,
  allstar_url text not null,
  clip_id text not null unique,
  map text not null default '',
  featured boolean not null default false,
  -- 'manual' quando o link foi colado no painel, 'allstar' quando veio da sincronização.
  source text not null default 'manual',
  thumb_url text not null default '',
  weapon text not null default '',
  kills int,
  views int,
  duration numeric(8,2),
  clipped_at timestamptz,
  created_at timestamptz not null default now()
);

create index clips_player_idx on public.clips (player_id, created_at desc);
create index clips_clipped_idx on public.clips (clipped_at desc nulls last);
create index clips_featured_idx on public.clips (featured, created_at desc);
create index players_sort_idx on public.players (sort_order, name);

alter table public.players enable row level security;
alter table public.player_stats enable row level security;
alter table public.clips enable row level security;

-- Elenco base. Os dados públicos (Steam, nome real, cidade) entram
-- pelo `npm run seed`; função, bio e números ficam vazios de propósito.
insert into public.players (id, name, color, sort_order, status) values
  ('s4mz', 's4mz', '#20B8FF', 1, 'active'),
  ('fury', 'fury', '#008CFF', 2, 'active'),
  ('bill', 'bill', '#006BFF', 3, 'active'),
  ('khastz', 'khastz', '#7AD7FF', 4, 'active'),
  ('cadu', 'cadu', '#FF1838', 5, 'active');

insert into public.player_stats (player_id)
select id from public.players;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "player photos public read" on storage.objects;
create policy "player photos public read"
  on storage.objects for select
  using (bucket_id = 'player-photos');
