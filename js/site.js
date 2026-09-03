const I18N = {
  pt: {
    "nav.home": "Início",
    "nav.players": "Elenco",
    "nav.stats": "Stats",
    "nav.clips": "Jogadas",
    "nav.login": "Login",
    "hero.kicker": "WTC · Counter-Strike",
    "hero.lede": "Um time vivo. Paleta no sangue. Old players, same game — agora com a casa acesa.",
    "cta.players": "Ver o elenco",
    "cta.clips": "Assistir jogadas",
    "home.roster": "Elenco",
    "home.clips": "Jogadas em destaque",
    "home.stats": "Números da casa",
    "empty.players": "O elenco ainda está sendo cadastrado no painel.",
    "empty.clips": "Nenhum clipe da allstar.gg por enquanto.",
    "empty.stats": "As estatísticas entram quando o admin preencher.",
    "error.load": "Não rolou carregar agora.",
    "retry": "Tentar de novo",
    "footer.tag": "Old players. Same game.",
    "lang.switch": "EN"
  },
  en: {
    "nav.home": "Home",
    "nav.players": "Roster",
    "nav.stats": "Stats",
    "nav.clips": "Clips",
    "nav.login": "Login",
    "hero.kicker": "WTC · Counter-Strike",
    "hero.lede": "A living roster. Color in the blood. Old players, same game — lights on.",
    "cta.players": "See the roster",
    "cta.clips": "Watch clips",
    "home.roster": "Roster",
    "home.clips": "Featured clips",
    "home.stats": "House numbers",
    "empty.players": "The roster is still being added in the admin panel.",
    "empty.clips": "No allstar.gg clips yet.",
    "empty.stats": "Stats show up when an admin fills them in.",
    "error.load": "Could not load this right now.",
    "retry": "Try again",
    "footer.tag": "Old players. Same game.",
    "lang.switch": "PT"
  }
};

const TOKEN_KEY = "wtc_token";
const LANG_KEY = "wtc_lang";

function lang() {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "pt";
}

function t(key) {
  return (I18N[lang()] && I18N[lang()][key]) || I18N.pt[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  const sw = document.querySelector("[data-lang]");
  if (sw) sw.textContent = t("lang.switch");
}

function pageId() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index") return "home";
  if (path.startsWith("/players/")) return "player";
  if (path.startsWith("/login") || path.startsWith("/admin")) return "login";
  return path.replace(/^\//, "");
}

function mountChrome() {
  const header = document.getElementById("header");
  const footer = document.getElementById("footer");
  const here = pageId();
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="/">
          <img src="/img/logo.png" alt="WATERCATS">
          <span>WATER<b>CATS</b></span>
        </a>
        <nav class="nav">
          <a href="/" class="${here === "home" ? "is-on" : ""}" data-i18n="nav.home"></a>
          <a href="/players" class="${here === "players" || here === "player" ? "is-on" : ""}" data-i18n="nav.players"></a>
          <a href="/stats" class="${here === "stats" ? "is-on" : ""}" data-i18n="nav.stats"></a>
          <a href="/clips" class="${here === "clips" ? "is-on" : ""}" data-i18n="nav.clips"></a>
          <button class="lang" type="button" data-lang></button>
          <a class="nav-login" href="/login" data-i18n="nav.login"></a>
        </nav>
      </div>`;
  }
  if (footer) {
    footer.innerHTML = `
      <div class="wrap footer-inner">
        <p data-i18n="footer.tag"></p>
        <p>
          <a href="https://discord.gg/et6N2Y3pJj" target="_blank" rel="noreferrer">Discord</a>
          ·
          <a href="https://steamcommunity.com/groups/watercatsgg" target="_blank" rel="noreferrer">Steam</a>
        </p>
      </div>`;
  }
  document.querySelector("[data-lang]")?.addEventListener("click", () => {
    localStorage.setItem(LANG_KEY, lang() === "pt" ? "en" : "pt");
    applyI18n();
  });
  applyI18n();
}

function dash(value, digits = 0) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

function statusLabel(status) {
  return { active: "Ativo", inactive: "Inativo", alumni: "Alumni" }[status] || status || "";
}

function playerCard(p) {
  const photo = p.photo
    ? `<img class="photo" src="${escapeAttr(p.photo)}" alt="${escapeAttr(p.name)}">`
    : `<div class="photo" style="box-shadow: inset 0 0 40px ${escapeAttr(p.color || "#006BFF")}"></div>`;
  return `<a class="card player-card" href="/players/${encodeURIComponent(p.id)}">
    ${photo}
    <h3>${escapeHtml(p.name)}</h3>
    <p class="meta">${escapeHtml(p.role || p.realName || "")}</p>
    <span class="chip">${escapeHtml(statusLabel(p.status))}</span>
  </a>`;
}

function clipCard(c) {
  return `<article class="card clip">
    <iframe src="${escapeAttr(c.embed)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="${escapeAttr(c.title)}"></iframe>
    <h3>${escapeHtml(c.title)}</h3>
    <p class="meta">${escapeHtml([c.playerName, c.map].filter(Boolean).join(" · "))}</p>
  </article>`;
}

function emptyBox(key) {
  return `<div class="empty">${t(key)}</div>`;
}

function errorBox() {
  return `<div class="error">${t("error.load")} <button type="button" onclick="location.reload()">${t("retry")}</button></div>`;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers["x-admin-token"] = token;
  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Erro");
    err.status = res.status;
    throw err;
  }
  return data;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", mountChrome);

window.WTC = { t, api, dash, playerCard, clipCard, emptyBox, errorBox, statusLabel, TOKEN_KEY };
