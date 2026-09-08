const {
  configured,
  adminOk,
  createJoinRequest,
  listJoinRequests,
  updateJoinRequest,
  deleteJoinRequest
} = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      const row = await createJoinRequest(body);
      send(res, 200, { ok: true, request: row && !row.ignored ? row : null });
      return;
    }

    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para ver os pedidos" });
      return;
    }

    if (req.method === "GET") {
      const status = String(req.query?.status || "").trim();
      send(res, 200, { requests: await listJoinRequests(status) });
      return;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const id = String(req.query?.id || body.id || "").trim();
      if (!id) {
        send(res, 400, { error: "ID obrigatório" });
        return;
      }
      const request = await updateJoinRequest(id, body);
      send(res, 200, { ok: true, request });
      return;
    }

    if (req.method === "DELETE") {
      const id = String(req.query?.id || body.id || "").trim();
      if (!id) {
        send(res, 400, { error: "ID obrigatório" });
        return;
      }
      await deleteJoinRequest(id);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Método não permitido" });
  } catch (err) {
    fail(res, err);
  }
};
