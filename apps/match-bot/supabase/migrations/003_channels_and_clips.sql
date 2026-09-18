-- Extra Discord channels + clip/rank notification idempotency

alter table public.wc_bot_discord_config
  add column if not exists videos_channel_id text not null default '',
  add column if not exists logs_channel_id text not null default '',
  add column if not exists ranks_channel_id text not null default '';

create table if not exists public.wc_bot_processed_clips (
  id uuid primary key default gen_random_uuid(),
  clip_id text not null unique,
  steam_id text not null default '',
  notified_at timestamptz not null default now(),
  discord_message_id text not null default '',
  channel_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wc_bot_processed_rank_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  steam_id text not null default '',
  lane text not null default '',
  match_id text not null default '',
  notified_at timestamptz not null default now(),
  discord_message_id text not null default '',
  channel_id text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wc_bot_processed_clips_notified_idx
  on public.wc_bot_processed_clips (notified_at desc);
create index if not exists wc_bot_processed_rank_events_notified_idx
  on public.wc_bot_processed_rank_events (notified_at desc);

alter table public.wc_bot_processed_clips enable row level security;
alter table public.wc_bot_processed_rank_events enable row level security;

drop policy if exists "wc_bot_processed_clips_deny_all" on public.wc_bot_processed_clips;
create policy "wc_bot_processed_clips_deny_all" on public.wc_bot_processed_clips
  for all using (false) with check (false);

drop policy if exists "wc_bot_processed_rank_events_deny_all" on public.wc_bot_processed_rank_events;
create policy "wc_bot_processed_rank_events_deny_all" on public.wc_bot_processed_rank_events
  for all using (false) with check (false);
