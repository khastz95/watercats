const { configured, createMarcaSignup } = require("../lib/cloud");
const { readBody, send, fail } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    if (!configured()) {
      send(res, 500, { error: "Supabase não configurado" });
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { error: "Método não permitido" });
      return;
    }

    const body = readBody(req);
    const row = await createMarcaSignup(body);
    send(res, 200, { ok: true, signup: row && !row.ignored ? row : null });
  } catch (err) {
    fail(res, err);
  }
};
