export interface WcBotPlayer {
  id: string;
  steam_id: string;
  nickname: string;
  discord_user_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WcBotMonitoredPlayer {
  id: string;
  player_id: string;
  enabled: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  player?: WcBotPlayer;
}

export interface WcBotProcessedMatch {
  id: string;
  external_match_id: string;
  source: string;
  notified_at: string;
  discord_message_id: string;
  channel_id: string;
  created_at: string;
}

export interface WcBotDiscordConfig {
  id: string;
  guild_id: string;
  match_channel_id: string;
  videos_channel_id?: string;
  logs_channel_id?: string;
  ranks_channel_id?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WcBotProcessedClip {
  id: string;
  clip_id: string;
  steam_id: string;
  notified_at: string;
  discord_message_id: string;
  channel_id: string;
  created_at: string;
}

export interface WcBotProcessedRankEvent {
  id: string;
  event_key: string;
  steam_id: string;
  lane: string;
  match_id: string;
  notified_at: string;
  discord_message_id: string;
  channel_id: string;
  created_at: string;
}

export interface WcBotPollingLog {
  id: string;
  player_id: string | null;
  status: string;
  checked_at: string;
  matches_found: number;
  error: string | null;
  created_at: string;
}
