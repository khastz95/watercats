function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function send(res, status, data) {
  res.status(status).json(data);
}

function fail(res, err) {
  send(res, err.status || 500, { error: err.message || "Erro interno" });
}

module.exports = { readBody, send, fail };
