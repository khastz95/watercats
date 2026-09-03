const { configured, adminOk, listPlayers, getPlayer, upsertPlayer, deletePlayer } = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    if (req.method === "GET") {
      const id = String(req.query?.id || "").trim();
      if (id) {
        const player = await getPlayer(id);
        if (!player) {
          send(res, 404, { error: "Jogador não encontrado" });
          return;
        }
        send(res, 200, { player });
        return;
      }
      send(res, 200, { players: await listPlayers() });
      return;
    }

    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para editar" });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const player = await upsertPlayer(body);
      send(res, 200, { ok: true, player });
      return;
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || body.id || "").trim();
      if (!id) {
        send(res, 400, { error: "ID obrigatório" });
        return;
      }
      await deletePlayer(id);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Método não permitido" });
  } catch (err) {
    fail(res, err);
  }
};
