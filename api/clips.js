const { configured, adminOk, listClips, upsertClip, deleteClip } = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    if (req.method === "GET") {
      send(res, 200, { clips: await listClips() });
      return;
    }

    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para editar" });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const clip = await upsertClip(body);
      send(res, 200, { ok: true, clip });
      return;
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || body.id || "").trim();
      if (!id) {
        send(res, 400, { error: "ID obrigatório" });
        return;
      }
      await deleteClip(id);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Método não permitido" });
  } catch (err) {
    fail(res, err);
  }
};
