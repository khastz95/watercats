import { syncService } from "./SyncService";
import { videoNotificationService } from "./VideoNotificationService";
import { rankNotificationService } from "./RankNotificationService";
import { logEvent } from "@/lib/log";

export type UniversalSyncResult = {
  matches: {
    checkedPlayers: number;
    matchesFound: number;
    notified: number;
    skipped: number;
    errors: number;
  };
  videos: {
    checkedPlayers: number;
    clipsFound: number;
    notified: number;
    skipped: number;
    errors: number;
  };
  ranks: {
    checked: number;
    notified: number;
    errors: number;
  };
};

/**
 * Full Catbot sync: new matches (+ rank deltas), new Allstar clips, rank snapshots.
 */
export class UniversalSyncService {
  async run(): Promise<UniversalSyncResult> {
    logEvent("UNIVERSAL_SYNC_STARTED");

    let matches: UniversalSyncResult["matches"] = {
      checkedPlayers: 0,
      matchesFound: 0,
      notified: 0,
      skipped: 0,
      errors: 0,
    };
    let videos: UniversalSyncResult["videos"] = {
      checkedPlayers: 0,
      clipsFound: 0,
      notified: 0,
      skipped: 0,
      errors: 0,
    };
    let ranks: UniversalSyncResult["ranks"] = {
      checked: 0,
      notified: 0,
      errors: 0,
    };

    try {
      const m = await syncService.run();
      matches = {
        checkedPlayers: m.checkedPlayers,
        matchesFound: m.matchesFound,
        notified: m.notified,
        skipped: m.skipped,
        errors: m.errors.length,
      };
    } catch (err) {
      logEvent("UNIVERSAL_SYNC_MATCHES_FAILED", {
        error: err instanceof Error ? err.message : String(err),
      });
      matches.errors = 1;
    }

    try {
      const v = await videoNotificationService.discoverAndNotify({ perPlayerLimit: 8 });
      videos = {
        checkedPlayers: v.checkedPlayers,
        clipsFound: v.clipsFound,
        notified: v.notified,
        skipped: v.skipped,
        errors: v.errors.length,
      };
    } catch (err) {
      logEvent("UNIVERSAL_SYNC_VIDEOS_FAILED", {
        error: err instanceof Error ? err.message : String(err),
      });
      videos.errors = 1;
    }

    try {
      const r = await rankNotificationService.postCurrentRanks();
      ranks = r;
    } catch (err) {
      logEvent("UNIVERSAL_SYNC_RANKS_FAILED", {
        error: err instanceof Error ? err.message : String(err),
      });
      ranks.errors = 1;
    }

    logEvent("UNIVERSAL_SYNC_COMPLETED", {
      matchesNotified: matches.notified,
      videosNotified: videos.notified,
      ranksNotified: ranks.notified,
    });

    return { matches, videos, ranks };
  }
}

export const universalSyncService = new UniversalSyncService();
