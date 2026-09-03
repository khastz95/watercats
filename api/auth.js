const { pinOk, signToken } = require("../lib/cloud");
const { readBody, send } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    send(res, 200, { ok: Boolean(process.env.EDIT_PIN) });
    return;
  }
  if (req.method !== "POST") {
    send(res, 405, { ok: false });
    return;
  }
  if (!process.env.EDIT_PIN) {
    send(res, 500, { ok: false, error: "EDIT_PIN não definido na Vercel" });
    return;
  }
  const body = readBody(req);
  const password = body.password ?? body.pin ?? "";
  if (!pinOk(password)) {
    send(res, 401, { ok: false, error: "Senha inválida" });
    return;
  }
  send(res, 200, { ok: true, token: signToken() });
};
