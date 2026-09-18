/**
 * Post the last N Allstar clips for every Discord-linked player.
 * Usage: npx tsx --env-file=.env.local scripts/post-last-videos.ts --n=2
 */
import { videoNotificationService } from "../src/lib/services/VideoNotificationService";

const nArg = process.argv.find((a) => a.startsWith("--n="));
const n = Math.max(1, Number(nArg?.slice(4) || 2) || 2);

async function main() {
  console.log(`Posting last ${n} Allstar clips per linked player…`);
  const result = await videoNotificationService.discoverAndNotify({ forceNewest: n });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
