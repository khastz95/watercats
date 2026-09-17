# Deployment

## Vercel project

- Framework: Next.js
- Root Directory: `apps/match-bot`
- Install: `npm install`
- Build: `npm run build`

## Environment

Copy every key from `.env.example` into Vercel Project Settings → Environment Variables.

For Cron authentication, set `CRON_SECRET`. Callers must send:

`Authorization: Bearer <CRON_SECRET>`

Polling every 2 hours is done by GitHub Actions (`.github/workflows/match-bot-sync.yml`) because Vercel Hobby only allows daily crons. Set repo secrets `MATCH_BOT_CRON_SECRET` and optionally `MATCH_BOT_CRON_URL`.

## Database

Apply `supabase/migrations/001_wc_bot.sql` once on the shared Supabase project.

## Post-deploy

1. Point Discord Interactions URL to production
2. Register commands against production bot token
3. Add players in `/dashboard/players`
4. Trigger `/api/sync` or wait for cron
5. Confirm a test notification in Discord

## Limits

- Poll interval defaults to 15 minutes
- Players are checked sequentially to reduce Leetify 429s
- Private Leetify profiles are skipped with a polling log error
