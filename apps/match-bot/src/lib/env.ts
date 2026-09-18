import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  LEETIFY_API_KEY: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_APPLICATION_ID: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_MATCH_CHANNEL_ID: z.string().optional(),
  DISCORD_VIDEOS_CHANNEL_ID: z.string().optional(),
  DISCORD_LOGS_CHANNEL_ID: z.string().optional(),
  DISCORD_RANKS_CHANNEL_ID: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ADMIN_PIN: z.string().optional(),
  STEAM_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  ROAST_API_KEY: z.string().optional(),
  ROAST_API_BASE: z.string().optional(),
  ROAST_MODEL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LEETIFY_API_KEY: process.env.LEETIFY_API_KEY,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,
    DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    DISCORD_MATCH_CHANNEL_ID: process.env.DISCORD_MATCH_CHANNEL_ID,
    DISCORD_VIDEOS_CHANNEL_ID: process.env.DISCORD_VIDEOS_CHANNEL_ID,
    DISCORD_LOGS_CHANNEL_ID: process.env.DISCORD_LOGS_CHANNEL_ID,
    DISCORD_RANKS_CHANNEL_ID: process.env.DISCORD_RANKS_CHANNEL_ID,
    CRON_SECRET: process.env.CRON_SECRET,
    ADMIN_PIN: process.env.ADMIN_PIN,
    STEAM_API_KEY: process.env.STEAM_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    ROAST_API_KEY: process.env.ROAST_API_KEY,
    ROAST_API_BASE: process.env.ROAST_API_BASE,
    ROAST_MODEL: process.env.ROAST_MODEL,
  });
}

export function supabaseUrl(): string {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL missing");
  return url;
}

export function requireServiceRole(): string {
  const key = getEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return key;
}
