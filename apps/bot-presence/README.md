# Bot presence + server logs (Catbot)

Vercel cannot keep a Discord Gateway connection, so this Railway process:

1. Keeps the bot **Online** with a custom status
2. Posts **server logs** to `#logs` (joins, leaves, kicks, bans, voice)

Slash commands and match/video/rank posts still run on the Vercel match-bot.

## Env

| Var | Required | Notes |
|-----|----------|-------|
| `DISCORD_BOT_TOKEN` | yes | Same token as Vercel |
| `DISCORD_LOGS_CHANNEL_ID` | for logs | `1550249415145693264` |
| `DISCORD_GUILD_ID` | recommended | Only log that guild |
| `DISCORD_MEMBERS_INTENT` | for join/leave | Set `1` after enabling **Server Members Intent** in the Discord Developer Portal |
| `DISCORD_ACTIVITY` | no | Custom status text |

Without `DISCORD_MEMBERS_INTENT=1`, the process still logs **voice / ban / unban**. Join, leave and kick need the privileged Members intent.

## Discord setup (manual)

1. Developer Portal → Bot → enable **Server Members Intent**
2. Bot role on the server: **View Channel**, **Send Messages** on `#logs`, **View Audit Log** (kick vs leave)

## Run

```bash
cd apps/bot-presence
npm install
# set env vars
npm start
```

## Railway

Root directory `apps/bot-presence`, start `npm start`, set the env vars above, redeploy after enabling Members Intent.
