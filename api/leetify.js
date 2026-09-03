const { configured, adminOk, listPlayers, getPlayer, saveLeetify } = require("../lib/cloud");
const { fetchLeetifyProfile } = require("../lib/leetify");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    // Leitura pública: devolve o que já foi sincronizado.
    if (req.method === "GET") {
      const id = String(req.query?.id || "").trim();
      if (id) {
        const player = await getPlayer(id);
        if (!player) {
          send(res, 404, { error: "Jogador não encontrado" });
          return;
        }
        send(res, 200, { id: player.id, leetify: player.leetify });
        return;
      }
      const players = await listPlayers();
      send(res, 200, {
        players: players.map((p) => ({ id: p.id, steamId: p.steamId, leetify: p.leetify }))
      });
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
        const profile = await fetchLeetifyProfile(player.steamId);
        await saveLeetify(player.id, profile);
        results.push({ id: player.id, ok: true, syncedAt: profile.syncedAt });
      } catch (err) {
        results.push({ id: player.id, ok: false, error: err.message });
      }
    }

    send(res, 200, { ok: results.every((r) => r.ok), results });
  } catch (err) {
    fail(res, err);
  }
};
