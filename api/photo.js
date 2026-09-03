const { configured, adminOk, uploadPlayerPhoto } = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

const MAX_BYTES = 1.5 * 1024 * 1024;
const TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
  "image/gif": true
};

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      send(res, 405, { error: "Método não permitido" });
      return;
    }
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    const body = readBody(req);
    if (!adminOk(req, body)) {
      send(res, 401, { error: "Faça login para editar" });
      return;
    }

    const playerId = String(body.playerId || "").trim();
    if (!playerId) {
      send(res, 400, { error: "Jogador inválido" });
      return;
    }

    const mime = String(body.mime || "").toLowerCase();
    if (!TYPES[mime]) {
      send(res, 400, { error: "Use JPG, PNG, WEBP ou GIF" });
      return;
    }

    const raw = String(body.data || "").replace(/^data:[^;]+;base64,/, "");
    let buffer;
    try {
      buffer = Buffer.from(raw, "base64");
    } catch {
      send(res, 400, { error: "Imagem inválida" });
      return;
    }
    if (!buffer.length || buffer.length > MAX_BYTES) {
      send(res, 400, { error: "A foto deve ter até 1,5 MB" });
      return;
    }

    const url = await uploadPlayerPhoto(playerId, buffer, mime);
    send(res, 200, { ok: true, url });
  } catch (err) {
    fail(res, err);
  }
};
