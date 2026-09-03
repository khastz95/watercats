// Avatar do perfil da Steam, pelo XML público do próprio perfil.
// Não precisa de chave de API. O maior tamanho que a Steam devolve é 184×184.
//
// Só o avatar é sincronizado: nick, nome real e cidade ficam como estão no
// painel, porque o que está no perfil da Steam costuma ser apelido ou piada.

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`))
    || xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}

async function fetchSteamAvatar(steamId) {
  const id = String(steamId || "").trim();
  if (!/^\d{17}$/.test(id)) {
    const err = new Error("SteamID64 inválido");
    err.status = 400;
    throw err;
  }
  const res = await fetch(`https://steamcommunity.com/profiles/${id}/?xml=1`, {
    headers: { Accept: "text/xml" }
  });
  if (!res.ok) {
    const err = new Error(`Steam respondeu ${res.status}`);
    err.status = 502;
    throw err;
  }
  const xml = await res.text();
  const avatar = tag(xml, "avatarFull") || tag(xml, "avatarMedium");
  if (!avatar) {
    const err = new Error("Perfil da Steam sem avatar público");
    err.status = 404;
    throw err;
  }
  return {
    avatar,
    nick: tag(xml, "steamID"),
    syncedAt: new Date().toISOString()
  };
}

module.exports = { fetchSteamAvatar };
