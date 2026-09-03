const { configured, adminOk, listPlayers, saveSteamAvatar } = require("../lib/cloud");
const { fetchSteamAvatar } = require("../lib/steam");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    if (req.method !== "POST" && req.method !== "PUT") {
      send(res, 405, { error: "Método não permitido" });
      return;
    }

    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para sincronizar" });
      return;
    }

    const only = String(req.query?.id || body.id || "").trim();
    const players = (await listPlayers()).filter((p) => p.steamId && (!only || p.id === only));
    if (!players.length) {
      send(res, 400, { error: only ? "Jogador sem SteamID64" : "Nenhum jogador com SteamID64" });
      return;
    }

    const results = [];
    for (const player of players) {
      try {
        const { avatar } = await fetchSteamAvatar(player.steamId);
        await saveSteamAvatar(player.id, avatar);
        results.push({ id: player.id, ok: true, avatar });
      } catch (err) {
        results.push({ id: player.id, ok: false, error: err.message });
      }
    }

    send(res, 200, { ok: results.every((r) => r.ok), results });
  } catch (err) {
    fail(res, err);
  }
};
