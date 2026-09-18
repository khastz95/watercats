/**
 * Post current Premier / FACEIT / GC snapshot for every Discord-linked player.
 * Usage: npx tsx --env-file=.env.local scripts/post-last-ranks.ts
 */
import { rankNotificationService } from "../src/lib/services/RankNotificationService";

async function main() {
  console.log("Posting current rank cards for linked players…");
  const result = await rankNotificationService.postCurrentRanks();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
