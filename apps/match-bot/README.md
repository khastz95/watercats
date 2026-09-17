# WaterCats Match Bot

Next.js app that periodically syncs CS2 matches from the **Leetify Public API** and posts Discord embeds for WaterCats Alliance.

This app lives in `apps/match-bot` and does **not** replace the static club site at the repo root.

## Requirements

- Node 20+
- Supabase project (can share the club DB)
- Discord application (Interactions Endpoint URL)
- Leetify API key from https://leetify.com/app/developer

## Install

```bash
cd apps/match-bot
cp .env.example .env.local
npm install
```

## Environment

See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (unused for writes) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server writes (never expose) |
| `LEETIFY_API_KEY` | Bearer for Leetify |
| `DISCORD_BOT_TOKEN` | Bot token for REST messages |
| `DISCORD_PUBLIC_KEY` | Interactions signature verify |
| `DISCORD_APPLICATION_ID` | Slash command registration |
| `DISCORD_GUILD_ID` | Guild for commands / default config |
| `DISCORD_MATCH_CHANNEL_ID` | Fallback match channel |
| `CRON_SECRET` | Protect `/api/cron/leetify` |
| `ADMIN_PIN` | Dashboard login |

## Supabase

Run the migration SQL in the Supabase SQL editor:

`supabase/migrations/001_wc_bot.sql`

Creates `wc_bot_*` tables with RLS deny-by-default (service role only).

## Leetify API

Official docs: https://api-public-docs.cs-prod.leetify.com/

Client methods:

- `GET /v3/profile`
- `GET /v3/profile/matches`
- `GET /v2/matches/{gameId}`

Metrics are shown **as returned** by Leetify. Match stats are **not** stored in Supabase — only `processed_matches` IDs for idempotency.

## Discord

1. Create an application + bot at https://discord.com/developers
2. Set **Interactions Endpoint URL** to `https://<your-domain>/api/discord/interactions`
3. Invite the bot with `applications.commands` + `Send Messages` + `Embed Links`
4. Register slash commands:

```bash
# from apps/match-bot with env loaded
npx tsx --env-file=.env.local scripts/register-commands.ts
```

Commands: `/lastmatch` `/player` `/match` `/players` `/config` `/sync`

## Vercel

1. New Vercel project with Root Directory `apps/match-bot`
2. Set all env vars (including `CRON_SECRET`)
3. Deploy the app (Vercel Hobby cannot run bi-hourly crons)
4. Schedule every 2 hours via GitHub Actions: `.github/workflows/match-bot-sync.yml`
   - Repo secrets: `MATCH_BOT_CRON_SECRET` (= `CRON_SECRET`) and optional `MATCH_BOT_CRON_URL`
   - Hits `POST /api/cron/leetify` with `Authorization: Bearer …`

Detection is **periodic synchronization**, not real-time webhooks.

## Local

```bash
npm run dev
```

Manual sync (with dashboard cookie or cron secret):

```bash
curl -X POST http://localhost:3000/api/sync -H "Authorization: Bearer $CRON_SECRET"
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next dev |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run register-commands` | Register Discord slash commands |

## Docs

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [DISCORD.md](docs/DISCORD.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
