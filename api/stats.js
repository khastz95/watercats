const { configured, adminOk, upsertStats, getPlayer } = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }
    if (req.method !== "PUT" && req.method !== "POST") {
      send(res, 405, { error: "Método não permitido" });
      return;
    }
    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para editar" });
      return;
    }
    const playerId = String(body.playerId || body.id || "").trim();
    if (!playerId) {
      send(res, 400, { error: "Jogador obrigatório" });
      return;
    }
    const player = await getPlayer(playerId);
    if (!player) {
      send(res, 404, { error: "Jogador não encontrado" });
      return;
    }
    const stats = await upsertStats(playerId, body);
    send(res, 200, { ok: true, stats });
  } catch (err) {
    fail(res, err);
  }
};
