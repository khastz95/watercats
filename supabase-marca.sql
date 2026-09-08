-- Lista de avisos da marca (página /marca). Seguro rodar mais de uma vez.

create table if not exists public.marca_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  source text not null default 'marca',
  created_at timestamptz not null default now()
);

create unique index if not exists marca_waitlist_email_uidx
  on public.marca_waitlist (lower(email));

create index if not exists marca_waitlist_created_idx
  on public.marca_waitlist (created_at desc);

alter table public.marca_waitlist enable row level security;
