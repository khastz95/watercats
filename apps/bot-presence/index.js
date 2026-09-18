/**
 * Keeps the Discord bot online via Gateway and posts server logs to #logs.
 * Match posts / slash commands still run on Vercel (REST + Interactions).
 *
 * Env:
 *   DISCORD_BOT_TOKEN (required)
 *   DISCORD_LOGS_CHANNEL_ID (required for logs)
 *   DISCORD_GUILD_ID (optional filter)
 *   DISCORD_ACTIVITY (optional status text)
 *
 * Portal: enable Server Members Intent on the bot application.
 * Server: bot needs View Channel + Send Messages on #logs + View Audit Log.
 */
import {
  ActivityType,
  AuditLogEvent,
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN");
  process.exit(1);
}

const logsChannelId = process.env.DISCORD_LOGS_CHANNEL_ID || "";
const guildFilter = process.env.DISCORD_GUILD_ID || "";
const activityName =
  process.env.DISCORD_ACTIVITY || "CATBOT — Partidas, clipes, logs e caos controlado.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mention(user) {
  return user?.id ? `<@${user.id}>` : "alguém";
}

function display(user) {
  if (!user) return "desconhecido";
  return user.globalName || user.username || user.tag || user.id;
}

async function sendLog(content) {
  if (!logsChannelId) return;
  try {
    const channel = await client.channels.fetch(logsChannelId);
    if (!channel || !channel.isTextBased?.() || !("send" in channel)) {
      console.error("Logs channel missing or not text-based:", logsChannelId);
      return;
    }
    await channel.send({
      content: content.slice(0, 1900),
      allowedMentions: { parse: [] },
    });
  } catch (err) {
    console.error("Failed to send log:", err?.message || err);
  }
}

function guildOk(guildId) {
  if (!guildFilter) return true;
  return guildId === guildFilter;
}

async function findAuditTarget(guild, type, targetId, maxAgeMs = 8000) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const entry = logs.entries.find((e) => {
      const tid = e.target?.id || e.targetId;
      if (tid !== targetId) return false;
      const age = Date.now() - (e.createdTimestamp || 0);
      return age >= 0 && age < maxAgeMs;
    });
    return entry || null;
  } catch {
    return null;
  }
}

client.once("clientReady", () => {
  console.log(`Online as ${client.user.tag}`);
  if (!logsChannelId) {
    console.warn("DISCORD_LOGS_CHANNEL_ID not set — presence only, no #logs posts");
  }
  client.user.setPresence({
    status: "online",
    activities: [
      {
        type: ActivityType.Custom,
        name: "Custom Status",
        state: activityName,
      },
    ],
  });
});

client.on("guildMemberAdd", async (member) => {
  if (!guildOk(member.guild.id)) return;
  const who = mention(member.user);
  const name = display(member.user);
  await sendLog(
    pick([
      `**ENTROU** · ${who} (${name}). Catbot já anotou a ficha. Bem-vindo(a) ao caos controlado.`,
      `**BOAS-VINDAS** · ${who} atravessou a porta. O servidor ganhou mais um personagem; o log ganhou mais uma linha.`,
      `**ENTRADA** · ${who} chegou. Estenda o tapete — ou o callout de A. Tanto faz, estamos de olho.`,
    ])
  );
});

client.on("guildMemberRemove", async (member) => {
  if (!guildOk(member.guild.id)) return;
  const user = member.user;
  const who = mention(user);
  const name = display(user);

  await new Promise((r) => setTimeout(r, 1500));

  const kickEntry = await findAuditTarget(member.guild, AuditLogEvent.MemberKick, user.id);
  if (kickEntry) {
    const mod = kickEntry.executor ? display(kickEntry.executor) : "um mod";
    const reason = kickEntry.reason ? ` Motivo: ${kickEntry.reason}` : "";
    await sendLog(
      pick([
        `**EXPULSO** · ${who} (${name}) foi kickado por **${mod}**.${reason} Porta bateu; log não esquece.`,
        `**KICK** · ${who} saiu… empurrado por **${mod}**.${reason} Catbot registrou o empurrão.`,
      ])
    );
    return;
  }

  const banEntry = await findAuditTarget(member.guild, AuditLogEvent.MemberBanAdd, user.id);
  if (banEntry) {
    // guildBanAdd will also fire — skip duplicate leave noise
    return;
  }

  await sendLog(
    pick([
      `**SAIU** · ${who} (${name}) deixou o servidor. Vaga aberta no elenco emocional.`,
      `**SAÍDA** · ${who} foi embora. Catbot acenou no log; o Discord só removeu o avatar.`,
      `**LEFT** · ${name} sumiu da lista. Sem drama — só registro.`,
    ])
  );
});

client.on("guildBanAdd", async (ban) => {
  if (!guildOk(ban.guild.id)) return;
  const who = mention(ban.user);
  const name = display(ban.user);
  await new Promise((r) => setTimeout(r, 800));
  const entry = await findAuditTarget(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
  const mod = entry?.executor ? display(entry.executor) : "staff";
  const reason = entry?.reason || ban.reason || "";
  await sendLog(
    pick([
      `**BAN** · ${who} (${name}) banido por **${mod}**.${reason ? ` Motivo: ${reason}` : ""} Martelo desceu; log subiu.`,
      `**BANIDO** · ${who} virou história. Executor: **${mod}**.${reason ? ` (${reason})` : ""}`,
    ])
  );
});

client.on("guildBanRemove", async (ban) => {
  if (!guildOk(ban.guild.id)) return;
  const who = mention(ban.user);
  const name = display(ban.user);
  await new Promise((r) => setTimeout(r, 800));
  const entry = await findAuditTarget(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
  const mod = entry?.executor ? display(entry.executor) : "staff";
  await sendLog(
    pick([
      `**UNBAN** · ${who} (${name}) foi desbanido por **${mod}**. Segunda chance registrada.`,
      `**DESBANIDO** · ${name} voltou à elegibilidade. Catbot não apaga o histórico — só adiciona linha.`,
    ])
  );
});

client.on("voiceStateUpdate", async (before, after) => {
  const guildId = after.guild?.id || before.guild?.id;
  if (!guildOk(guildId)) return;

  const joined = !before.channelId && after.channelId;
  const left = before.channelId && !after.channelId;
  const moved =
    before.channelId && after.channelId && before.channelId !== after.channelId;

  // Ignore mute/deaf/self-stream-only changes
  if (!joined && !left && !moved) return;

  const user = after.member?.user || before.member?.user;
  const who = mention(user);
  const name = display(user);
  const from = before.channel?.name || before.channelId || "?";
  const to = after.channel?.name || after.channelId || "?";

  if (joined) {
    await sendLog(
      pick([
        `**VOICE IN** · ${who} (${name}) entrou em **${to}**. Microfone no jogo; Catbot no log.`,
        `**ENTROU NA VOZ** · ${who} → **${to}**. Sala ganhou presença; log ganhou timestamp.`,
      ])
    );
    return;
  }
  if (left) {
    await sendLog(
      pick([
        `**VOICE OUT** · ${who} (${name}) saiu de **${from}**. Silêncio relativo restaurado.`,
        `**SAIU DA VOZ** · ${who} deixou **${from}**. Catbot anotou a deserção acústica.`,
      ])
    );
    return;
  }
  if (moved) {
    await sendLog(
      pick([
        `**VOICE MOVE** · ${who} (${name}) **${from}** → **${to}**. Troca de sala registrada.`,
        `**MIGROU** · ${who} de **${from}** para **${to}**. GPS social atualizado.`,
      ])
    );
  }
});

client.on("error", (err) => {
  console.error("Discord client error:", err.message);
});

process.on("SIGINT", () => {
  client.destroy();
  process.exit(0);
});
process.on("SIGTERM", () => {
  client.destroy();
  process.exit(0);
});

await client.login(token);
