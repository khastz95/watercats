/**
 * Register guild slash commands.
 * Usage: npx tsx scripts/register-commands.ts
 * Requires DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID
 */

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !appId || !guildId) {
  console.error("Missing DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID / DISCORD_GUILD_ID");
  process.exit(1);
}

const commands = [
  {
    name: "link",
    description: "Link your Steam account and enable match notifications",
    type: 1,
    options: [
      {
        name: "steam",
        description: "SteamID64 or steamcommunity.com profile URL",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "unlink",
    description: "Unlink your Steam account and stop match notifications",
    type: 1,
  },
  {
    name: "me",
    description: "Show your linked Steam account status",
    type: 1,
  },
  {
    name: "link-user",
    description: "Link another member's Steam (admin, silent — no user notify)",
    type: 1,
    options: [
      {
        name: "user",
        description: "Discord member to attach",
        type: 6,
        required: true,
      },
      {
        name: "steam",
        description: "SteamID64 or steamcommunity.com profile URL",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "unlink-user",
    description: "Unlink another member's Steam account (admin)",
    type: 1,
    options: [
      {
        name: "user",
        description: "Discord member to unlink",
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: "links",
    description: "List Discord ↔ Steam links (admin)",
    type: 1,
  },
  {
    name: "platforms",
    description: "Check linked players activity on Premier, FACEIT and GC (admin)",
    type: 1,
    options: [
      {
        name: "days",
        description: "Lookback window in days (default 45, max 90)",
        type: 4,
        required: false,
        min_value: 7,
        max_value: 90,
      },
    ],
  },
  { name: "lastmatch", description: "Show the last notified match (live Leetify data)", type: 1 },
  {
    name: "player",
    description: "Show a player profile from Leetify",
    type: 1,
    options: [{ name: "query", description: "Nickname, @user, or SteamID64", type: 3, required: true }],
  },
  {
    name: "match",
    description: "Show match details from Leetify",
    type: 1,
    options: [{ name: "id", description: "Leetify match id", type: 3, required: true }],
  },
  { name: "players", description: "List monitored players", type: 1 },
  {
    name: "config",
    description: "View or set match notification channel (admin)",
    type: 1,
    options: [{ name: "channel", description: "Channel for match reports", type: 7, required: false }],
  },
  { name: "sync", description: "Sincronizar partidas, vídeos Allstar e pontuação agora", type: 1 },
];

async function main() {
  const url = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(res.status, text);
    process.exit(1);
  }
  console.log(
    "Commands registered:",
    JSON.parse(text)
      .map((c: { name: string }) => c.name)
      .join(", ")
  );
}

main();
