import { waitUntil } from "@vercel/functions";
import { getEnv } from "@/lib/env";
import { LeetifyError } from "@/lib/leetify/errors";
import { leetifyClient } from "@/lib/leetify/client";
import { mapLeetifyMatchToMatchReport, mapLeetifyProfileToSummary } from "@/lib/leetify/mapper";
import { buildMatchEmbeds, buildProfileEmbed } from "@/lib/discord/embeds";
import { matchActionRows } from "@/lib/discord/buttons";
import { editInteractionResponse, createInteractionFollowup } from "@/lib/discord/rest";
import { playerService } from "@/lib/services/PlayerService";
import { universalSyncService } from "@/lib/services/UniversalSyncService";
import {
  checkPlayerPlatforms,
  buildPlatformStatusEmbeds,
} from "@/lib/services/PlatformStatusService";
import { resolveSteamId64, SteamResolveError } from "@/lib/steam/resolve";

type Interaction = {
  id: string;
  token: string;
  type: number;
  guild_id?: string;
  member?: {
    permissions?: string;
    user?: { id: string; username?: string };
  };
  user?: { id: string; username?: string };
  data?: {
    name?: string;
    options?: {
      name: string;
      type: number;
      value?: string | number | boolean;
      options?: { name: string; type: number; value?: string | number | boolean }[];
    }[];
  };
};

const ADMIN_BIT = BigInt(0x8);

function isAdmin(interaction: Interaction): boolean {
  const perms = interaction.member?.permissions;
  if (!perms) return false;
  try {
    return (BigInt(perms) & ADMIN_BIT) === ADMIN_BIT;
  } catch {
    return false;
  }
}

function opt(interaction: Interaction, name: string): string | undefined {
  const v = interaction.data?.options?.find((o) => o.name === name)?.value;
  return v === undefined || v === null ? undefined : String(v);
}

function userId(interaction: Interaction): string | undefined {
  return interaction.member?.user?.id || interaction.user?.id;
}

function deferred(ephemeral = true): Response {
  return Response.json({
    type: 5,
    data: ephemeral ? { flags: 64 } : {},
  });
}

function ephemeral(content: string): Response {
  return Response.json({
    type: 4,
    data: { content, flags: 64 },
  });
}

function clipDiscord(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

async function finish(interaction: Interaction, body: Record<string, unknown>): Promise<void> {
  const appId = getEnv().DISCORD_APPLICATION_ID;
  if (!appId) throw new Error("DISCORD_APPLICATION_ID missing");
  await editInteractionResponse(appId, interaction.token, body);
}

export async function handleInteraction(interaction: Interaction): Promise<Response> {
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  if (interaction.type !== 2) {
    return ephemeral("Unsupported interaction.");
  }

  const name = interaction.data?.name || "";

  if (
    (name === "config" ||
      name === "unlink-user" ||
      name === "link-user" ||
      name === "links" ||
      name === "platforms") &&
    !isAdmin(interaction)
  ) {
    return ephemeral("Administrator permission required.");
  }

  if (name === "platforms") {
    const daysRaw = opt(interaction, "days");
    const days = Math.min(90, Math.max(7, Number(daysRaw || 45) || 45));

    waitUntil(
      (async () => {
        try {
          const players = (await playerService.listPlayers()).filter((p) => p.discord_user_id);
          if (!players.length) {
            await finish(interaction, {
              content: "No linked Discord Steam accounts. Use `/link-user` first.",
            });
            return;
          }

          const rows = [];
          for (const player of players) {
            rows.push(await checkPlayerPlatforms(player, days));
            await new Promise((r) => setTimeout(r, 350));
          }

          const embeds = buildPlatformStatusEmbeds(rows, days);
          // Discord: max 10 embeds / message; keep first message within limits
          const first = embeds.slice(0, 10);
          await finish(interaction, {
            content: `Platform check for **${players.length}** linked player(s).`,
            embeds: first,
          });

          // If somehow more than 10, send follow-ups (rare)
          const appId = getEnv().DISCORD_APPLICATION_ID;
          if (appId && embeds.length > 10) {
            for (let i = 10; i < embeds.length; i += 10) {
              await createInteractionFollowup(appId, interaction.token, {
                embeds: embeds.slice(i, i + 10),
                flags: 64,
              });
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Platform check failed";
          try {
            await finish(interaction, { content: clipDiscord(message, 1900) });
          } catch {
            /* ignore secondary failure */
          }
        }
      })()
    );
    return deferred(true);
  }

  if (name === "sync") {
    waitUntil(
      (async () => {
        try {
          const logs = await playerService.listLogs(8);
          const last = logs.find((l) => l.status === "universal_sync");
          if (last) {
            const age = Date.now() - Date.parse(last.checked_at);
            if (Number.isFinite(age) && age < 5 * 60 * 1000) {
              const waitSec = Math.ceil((5 * 60 * 1000 - age) / 1000);
              await finish(interaction, {
                content: `Sync já foi executado há pouco. Aguarde ~${waitSec}s e tente de novo.`,
              });
              return;
            }
          }

          const result = await universalSyncService.run();
          await playerService.addPollingLog({
            status: "universal_sync",
            matchesFound:
              result.matches.notified + result.videos.notified + result.ranks.notified,
          });

          await finish(interaction, {
            content: [
              "**Sync concluído**",
              `Partidas: ${result.matches.notified} novas · ${result.matches.skipped} ignoradas · ${result.matches.checkedPlayers} jogadores`,
              `Vídeos: ${result.videos.notified} novos · ${result.videos.skipped} ignorados`,
              `Pontuação: ${result.ranks.notified} atualizações · ${result.ranks.errors} erros`,
            ].join("\n"),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Sync failed";
          await finish(interaction, { content: `Sync falhou: ${message}` });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "link") {
    const steamInput = opt(interaction, "steam");
    const discordId = userId(interaction);
    if (!steamInput) return ephemeral("Missing steam option.");
    if (!discordId) return ephemeral("Could not resolve your Discord user id.");

    waitUntil(
      (async () => {
        try {
          const steamId = await resolveSteamId64(steamInput);
          const profile = await leetifyClient.getPlayerProfile({ steam64Id: steamId });
          const summary = mapLeetifyProfileToSummary(profile);
          const nickname = summary.name || steamId;
          const player = await playerService.linkDiscordAccount({
            discordUserId: discordId,
            steamId,
            nickname,
          });
          await finish(interaction, {
            content: [
              `Linked as **${player.nickname || nickname}** (\`${player.steam_id}\`).`,
              "Your Premier / Faceit / GC matches will post in the configured bots channel.",
              "Use `/me` to check status or `/unlink` to disconnect.",
            ].join("\n"),
          });
        } catch (err) {
          let message = "Link failed";
          if (err instanceof SteamResolveError || err instanceof LeetifyError) {
            message = err.message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "link-user") {
    const target = opt(interaction, "user");
    const steamInput = opt(interaction, "steam");
    if (!target) return ephemeral("Missing user.");
    if (!steamInput) return ephemeral("Missing steam option.");
    const targetId = target.replace(/[<@!>]/g, "");

    waitUntil(
      (async () => {
        try {
          const steamId = await resolveSteamId64(steamInput);
          const profile = await leetifyClient.getPlayerProfile({ steam64Id: steamId });
          const summary = mapLeetifyProfileToSummary(profile);
          const nickname = summary.name || steamId;
          const player = await playerService.linkDiscordAccount({
            discordUserId: targetId,
            steamId,
            nickname,
          });
          // Ephemeral reply to admin only — target user is not notified/DM'd.
          await finish(interaction, {
            content: [
              `Linked <@${targetId}> → **${player.nickname || nickname}** (\`${player.steam_id}\`).`,
              "Monitoring enabled. The member was **not** notified.",
            ].join("\n"),
          });
        } catch (err) {
          let message = "Link failed";
          if (err instanceof SteamResolveError || err instanceof LeetifyError) {
            message = err.message;
          } else if (err instanceof Error) {
            message = err.message;
          }
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "links") {
    waitUntil(
      (async () => {
        try {
          const players = await playerService.listPlayers();
          const linked = players.filter((p) => p.discord_user_id);
          const lines = linked.length
            ? linked
                .map(
                  (p) =>
                    `• <@${p.discord_user_id}> → **${p.nickname || "—"}** (\`${p.steam_id}\`) ${p.enabled ? "ON" : "OFF"}`
                )
                .join("\n")
            : "No Discord ↔ Steam links yet.";
          await finish(interaction, {
            content: `**Linked accounts** (${linked.length})\n${lines}`,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed";
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "unlink") {
    const discordId = userId(interaction);
    if (!discordId) return ephemeral("Could not resolve your Discord user id.");
    waitUntil(
      (async () => {
        try {
          const player = await playerService.unlinkDiscordAccount(discordId);
          await finish(interaction, {
            content: player
              ? `Unlinked Steam \`${player.steam_id}\`. Monitoring stopped.`
              : "You have no linked Steam account.",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unlink failed";
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "unlink-user") {
    const target = opt(interaction, "user");
    if (!target) return ephemeral("Missing user.");
    const targetId = target.replace(/[<@!>]/g, "");
    waitUntil(
      (async () => {
        try {
          const player = await playerService.unlinkDiscordAccount(targetId);
          await finish(interaction, {
            content: player
              ? `Unlinked <@${targetId}> from Steam \`${player.steam_id}\`.`
              : `No linked account for <@${targetId}>.`,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unlink failed";
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  if (name === "me") {
    const discordId = userId(interaction);
    if (!discordId) return ephemeral("Could not resolve your Discord user id.");
    waitUntil(
      (async () => {
        try {
          const player = await playerService.getByDiscordUserId(discordId);
          if (!player) {
            await finish(interaction, {
              content:
                "No Steam linked. Use `/link steam:<SteamID64 or profile URL>` to activate match notifications.",
            });
            return;
          }
          const monitored = await playerService.isMonitored(player.id);
          await finish(interaction, {
            content: [
              "**Your link**",
              `• Discord: <@${discordId}>`,
              `• Steam: \`${player.steam_id}\``,
              `• Nickname: ${player.nickname || "—"}`,
              `• Player enabled: ${player.enabled ? "yes" : "no"}`,
              `• Monitoring: ${monitored ? "yes" : "no"}`,
            ].join("\n"),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed";
          await finish(interaction, { content: message });
        }
      })()
    );
    return deferred(true);
  }

  try {
    if (name === "players") {
      const players = await playerService.listPlayers();
      const lines = players.length
        ? players
            .map((p) => {
              const discord = p.discord_user_id ? ` · <@${p.discord_user_id}>` : "";
              return `• ${p.nickname || p.steam_id} (\`${p.steam_id}\`)${discord} ${p.enabled ? "ACTIVE" : "OFF"}`;
            })
            .join("\n")
        : "No monitored players.";
      return Response.json({
        type: 4,
        data: { content: `**Monitored players**\n${lines}`, flags: 64 },
      });
    }

    if (name === "config") {
      const channel = opt(interaction, "channel");
      const guildId = interaction.guild_id || getEnv().DISCORD_GUILD_ID || "";
      if (channel) {
        const channelId = channel.replace(/[<#>]/g, "");
        await playerService.upsertDiscordConfig({
          guild_id: guildId,
          match_channel_id: channelId,
          enabled: true,
        });
        return Response.json({
          type: 4,
          data: { content: `Match channel set to <#${channelId}>`, flags: 64 },
        });
      }
      const cfg = await playerService.getDiscordConfig();
      return Response.json({
        type: 4,
        data: {
          content: cfg
            ? `guild=\`${cfg.guild_id}\` channel=<#${cfg.match_channel_id}> enabled=${cfg.enabled}`
            : "No discord config yet. Use `/config channel:#matches`",
          flags: 64,
        },
      });
    }

    if (name === "lastmatch") {
      const latest = await playerService.getLatestProcessed();
      if (!latest) {
        return Response.json({
          type: 4,
          data: { content: "No notified matches yet.", flags: 64 },
        });
      }
      const raw = await leetifyClient.getMatchDetails(latest.external_match_id);
      const report = mapLeetifyMatchToMatchReport(raw);
      return Response.json({
        type: 4,
        data: {
          embeds: buildMatchEmbeds(report),
          components: matchActionRows(report),
        },
      });
    }

    if (name === "match") {
      const id = opt(interaction, "id");
      if (!id) return ephemeral("Missing match id.");
      const raw = await leetifyClient.getMatchDetails(id);
      const report = mapLeetifyMatchToMatchReport(raw);
      return Response.json({
        type: 4,
        data: {
          embeds: buildMatchEmbeds(report),
          components: matchActionRows(report),
        },
      });
    }

    if (name === "player") {
      const query = opt(interaction, "query");
      if (!query) return ephemeral("Missing player query.");
      let steamId = query;
      if (!/^\d{17}$/.test(query)) {
        const mentionId = query.replace(/[<@!>]/g, "");
        const byDiscord = await playerService.getByDiscordUserId(mentionId);
        if (byDiscord) {
          steamId = byDiscord.steam_id;
        } else {
          const players = await playerService.listPlayers();
          const hit = players.find(
            (p) =>
              p.nickname.toLowerCase() === query.toLowerCase() ||
              p.discord_user_id === mentionId
          );
          if (!hit) return ephemeral("Player not found in monitored list. Use SteamID64.");
          steamId = hit.steam_id;
        }
      }
      const raw = await leetifyClient.getPlayerProfile({ steam64Id: steamId });
      const summary = mapLeetifyProfileToSummary(raw);
      return Response.json({
        type: 4,
        data: { embeds: [buildProfileEmbed(summary)] },
      });
    }

    return ephemeral(`Unknown command: ${name}`);
  } catch (err) {
    if (err instanceof LeetifyError) {
      return ephemeral(`${err.code}: ${err.message}`);
    }
    const message = err instanceof Error ? err.message : "Command failed";
    return ephemeral(message);
  }
}
