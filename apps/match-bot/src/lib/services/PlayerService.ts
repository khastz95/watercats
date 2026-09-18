import { getAdminClient } from "@/lib/supabase/admin";
import type { WcBotDiscordConfig, WcBotMonitoredPlayer, WcBotPlayer, WcBotProcessedMatch, WcBotPollingLog } from "@/lib/supabase/types";

export class PlayerService {
  async listPlayers(): Promise<WcBotPlayer[]> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_players")
      .select("*")
      .order("nickname", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as WcBotPlayer[];
  }

  async getBySteamId(steamId: string): Promise<WcBotPlayer | null> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_players")
      .select("*")
      .eq("steam_id", steamId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WcBotPlayer) || null;
  }

  async getById(id: string): Promise<WcBotPlayer | null> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WcBotPlayer) || null;
  }

  async getByDiscordUserId(discordUserId: string): Promise<WcBotPlayer | null> {
    const id = String(discordUserId || "").trim();
    if (!id) return null;
    const { data, error } = await getAdminClient()
      .from("wc_bot_players")
      .select("*")
      .eq("discord_user_id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WcBotPlayer) || null;
  }

  async isMonitored(playerId: string): Promise<boolean> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_monitored_players")
      .select("enabled")
      .eq("player_id", playerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data?.enabled);
  }

  /**
   * Link Discord user ↔ Steam and enable monitoring.
   * Rules: 1 Discord → 1 Steam; Steam already linked to another Discord → error.
   */
  async linkDiscordAccount(input: {
    discordUserId: string;
    steamId: string;
    nickname?: string;
  }): Promise<WcBotPlayer> {
    const discordUserId = String(input.discordUserId || "").trim();
    const steamId = String(input.steamId || "").trim();
    if (!discordUserId) throw new Error("discord_user_id required");
    if (!/^[0-9]{17}$/.test(steamId)) throw new Error("Invalid steam_id");

    const byDiscord = await this.getByDiscordUserId(discordUserId);
    const bySteam = await this.getBySteamId(steamId);

    if (bySteam && bySteam.discord_user_id && bySteam.discord_user_id !== discordUserId) {
      throw new Error("This SteamID is already linked to another Discord account.");
    }

    if (byDiscord && byDiscord.steam_id !== steamId) {
      // Discord already linked to a different Steam — re-link: clear old steam row discord, or update
      if (bySteam && bySteam.id !== byDiscord.id) {
        throw new Error(
          "Your Discord is linked to another SteamID. Use /unlink first, then /link again."
        );
      }
    }

    const nickname = (input.nickname || bySteam?.nickname || byDiscord?.nickname || "").trim();

    if (bySteam) {
      // Attach discord to existing steam player (or refresh)
      if (byDiscord && byDiscord.id !== bySteam.id) {
        // Clear discord from previous player row so unique index allows reassignment
        await this.updatePlayer(byDiscord.id, {
          discord_user_id: "",
          enabled: false,
          monitor: false,
        });
      }
      return this.updatePlayer(bySteam.id, {
        discord_user_id: discordUserId,
        nickname: nickname || bySteam.nickname,
        enabled: true,
        monitor: true,
      });
    }

    if (byDiscord) {
      // Same discord, change steam id — not allowed via update of unique steam_id easily;
      // require unlink first if steam differs
      if (byDiscord.steam_id !== steamId) {
        throw new Error(
          "Your Discord is already linked. Use /unlink first to change SteamID."
        );
      }
      return this.updatePlayer(byDiscord.id, {
        nickname: nickname || byDiscord.nickname,
        enabled: true,
        monitor: true,
      });
    }

    return this.createPlayer({
      steam_id: steamId,
      nickname,
      discord_user_id: discordUserId,
      enabled: true,
      monitor: true,
    });
  }

  /** Unlink Discord user and stop monitoring. */
  async unlinkDiscordAccount(discordUserId: string): Promise<WcBotPlayer | null> {
    const player = await this.getByDiscordUserId(discordUserId);
    if (!player) return null;
    return this.updatePlayer(player.id, {
      discord_user_id: "",
      enabled: false,
      monitor: false,
    });
  }

  async createPlayer(input: {
    steam_id: string;
    nickname?: string;
    discord_user_id?: string;
    enabled?: boolean;
    monitor?: boolean;
  }): Promise<WcBotPlayer> {
    const db = getAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("wc_bot_players")
      .insert({
        steam_id: input.steam_id,
        nickname: input.nickname || "",
        discord_user_id: input.discord_user_id || "",
        enabled: input.enabled ?? true,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const player = data as WcBotPlayer;
    if (input.monitor !== false) {
      await db.from("wc_bot_monitored_players").upsert(
        {
          player_id: player.id,
          enabled: true,
          updated_at: now,
        },
        { onConflict: "player_id" }
      );
    }
    return player;
  }

  async updatePlayer(
    id: string,
    input: {
      nickname?: string;
      discord_user_id?: string;
      enabled?: boolean;
      monitor?: boolean;
    }
  ): Promise<WcBotPlayer> {
    const db = getAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.nickname !== undefined) patch.nickname = input.nickname;
    if (input.discord_user_id !== undefined) patch.discord_user_id = input.discord_user_id;
    if (input.enabled !== undefined) patch.enabled = input.enabled;

    const { data, error } = await db.from("wc_bot_players").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    if (input.monitor !== undefined) {
      await db.from("wc_bot_monitored_players").upsert(
        {
          player_id: id,
          enabled: input.monitor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id" }
      );
    }
    return data as WcBotPlayer;
  }

  async deletePlayer(id: string): Promise<void> {
    const { error } = await getAdminClient().from("wc_bot_players").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listMonitored(): Promise<(WcBotMonitoredPlayer & { player: WcBotPlayer })[]> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_monitored_players")
      .select("*, player:wc_bot_players(*)")
      .eq("enabled", true);
    if (error) throw new Error(error.message);
    return (data || [])
      .filter((row) => row.player && (row.player as WcBotPlayer).enabled)
      .map((row) => ({
        ...(row as WcBotMonitoredPlayer),
        player: row.player as WcBotPlayer,
      }));
  }

  async touchChecked(monitoredId: string): Promise<void> {
    await getAdminClient()
      .from("wc_bot_monitored_players")
      .update({
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", monitoredId);
  }

  async isProcessed(externalMatchId: string, source = "leetify"): Promise<boolean> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_processed_matches")
      .select("id")
      .eq("external_match_id", externalMatchId)
      .eq("source", source)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async markProcessed(input: {
    externalMatchId: string;
    source?: string;
    discordMessageId?: string;
    channelId?: string;
  }): Promise<WcBotProcessedMatch | null> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_processed_matches")
      .insert({
        external_match_id: input.externalMatchId,
        source: input.source || "leetify",
        notified_at: new Date().toISOString(),
        discord_message_id: input.discordMessageId || "",
        channel_id: input.channelId || "",
      })
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return null;
      throw new Error(error.message);
    }
    return data as WcBotProcessedMatch;
  }

  async listProcessed(limit = 50): Promise<WcBotProcessedMatch[]> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_processed_matches")
      .select("*")
      .order("notified_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data || []) as WcBotProcessedMatch[];
  }

  async getLatestProcessed(): Promise<WcBotProcessedMatch | null> {
    const rows = await this.listProcessed(1);
    return rows[0] || null;
  }

  async getDiscordConfig(): Promise<WcBotDiscordConfig | null> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_discord_config")
      .select("*")
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WcBotDiscordConfig) || null;
  }

  async upsertDiscordConfig(input: {
    guild_id: string;
    match_channel_id: string;
    videos_channel_id?: string;
    logs_channel_id?: string;
    ranks_channel_id?: string;
    enabled?: boolean;
  }): Promise<WcBotDiscordConfig> {
    const now = new Date().toISOString();
    const row: Record<string, unknown> = {
      guild_id: input.guild_id,
      match_channel_id: input.match_channel_id,
      enabled: input.enabled ?? true,
      updated_at: now,
    };
    if (input.videos_channel_id !== undefined) row.videos_channel_id = input.videos_channel_id;
    if (input.logs_channel_id !== undefined) row.logs_channel_id = input.logs_channel_id;
    if (input.ranks_channel_id !== undefined) row.ranks_channel_id = input.ranks_channel_id;

    const { data, error } = await getAdminClient()
      .from("wc_bot_discord_config")
      .upsert(row, { onConflict: "guild_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as WcBotDiscordConfig;
  }

  async listLinkedPlayers(): Promise<WcBotPlayer[]> {
    const players = await this.listPlayers();
    return players.filter((p) => p.enabled && Boolean(p.discord_user_id));
  }

  async isClipProcessed(clipId: string): Promise<boolean> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_processed_clips")
      .select("id")
      .eq("clip_id", clipId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async markClipProcessed(input: {
    clipId: string;
    steamId?: string;
    discordMessageId?: string;
    channelId?: string;
  }): Promise<boolean> {
    const { error } = await getAdminClient().from("wc_bot_processed_clips").insert({
      clip_id: input.clipId,
      steam_id: input.steamId || "",
      notified_at: new Date().toISOString(),
      discord_message_id: input.discordMessageId || "",
      channel_id: input.channelId || "",
    });
    if (error) {
      if (error.code === "23505") return false;
      throw new Error(error.message);
    }
    return true;
  }

  async isRankEventProcessed(eventKey: string): Promise<boolean> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_processed_rank_events")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async markRankEventProcessed(input: {
    eventKey: string;
    steamId?: string;
    lane?: string;
    matchId?: string;
    discordMessageId?: string;
    channelId?: string;
  }): Promise<boolean> {
    const { error } = await getAdminClient().from("wc_bot_processed_rank_events").insert({
      event_key: input.eventKey,
      steam_id: input.steamId || "",
      lane: input.lane || "",
      match_id: input.matchId || "",
      notified_at: new Date().toISOString(),
      discord_message_id: input.discordMessageId || "",
      channel_id: input.channelId || "",
    });
    if (error) {
      if (error.code === "23505") return false;
      throw new Error(error.message);
    }
    return true;
  }

  async addPollingLog(input: {
    playerId?: string | null;
    status: string;
    matchesFound?: number;
    error?: string | null;
  }): Promise<void> {
    await getAdminClient().from("wc_bot_polling_logs").insert({
      player_id: input.playerId || null,
      status: input.status,
      matches_found: input.matchesFound ?? 0,
      error: input.error || null,
      checked_at: new Date().toISOString(),
    });
  }

  async listLogs(limit = 50): Promise<WcBotPollingLog[]> {
    const { data, error } = await getAdminClient()
      .from("wc_bot_polling_logs")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data || []) as WcBotPollingLog[];
  }
}

export const playerService = new PlayerService();
