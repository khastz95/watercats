-- Pedidos para entrar no clube (página /join). Seguro rodar mais de uma vez.

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nick text not null,
  city text not null default '',
  discord text not null default '',
  steam_id text not null default '',
  steam_url text not null default '',
  era text not null default '',
  role text not null default '',
  message text not null default '',
  contact text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists join_requests_status_idx
  on public.join_requests (status, created_at desc);

create index if not exists join_requests_nick_idx
  on public.join_requests (lower(nick));

alter table public.join_requests enable row level security;
