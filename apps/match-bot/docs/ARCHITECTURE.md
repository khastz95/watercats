# Architecture

```text
UI / Discord Interactions / Cron
        ↓
     Services
        ↓
 LeetifyClient · Discord REST · Supabase admin
```

## Layers

| Layer | Role |
| --- | --- |
| `app/api/*` | HTTP entry (cron, sync, interactions, admin APIs) |
| `lib/services/*` | Business orchestration |
| `lib/leetify/*` | Only place that calls Leetify |
| `lib/discord/*` | Signature verify, embeds, REST |
| `lib/supabase/*` | Service-role client + row types |

## Data policy

Supabase stores:

- monitored players
- discord channel config
- processed match IDs (idempotency)
- polling logs

It does **not** store full Leetify profiles or match statistics.

## Sync flow

1. GitHub Actions (every 2h) hits `/api/cron/leetify` with `CRON_SECRET`
2. `SyncService` → `MatchDiscoveryService`
3. For each monitored Steam ID: `getPlayerMatches`
4. Skip if `wc_bot_processed_matches` already has the id
5. Map to `MatchReport`, post Discord embed, insert processed row

## Idempotency

Unique constraint `(external_match_id, source)` prevents duplicate notifications. If Discord send succeeds but insert races, the unique failure is logged and no second intentional send is scheduled.
