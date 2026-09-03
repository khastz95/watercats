const I18N = {
  pt: {
    "nav.home": "Início",
    "nav.players": "Elenco",
    "nav.stats": "Estatísticas",
    "nav.clips": "Jogadas",
    "nav.login": "Entrar",
    "nav.admin": "Painel",
    "hero.kicker": "WTC · Counter-Strike",
    "hero.tagline": "Jogadores antigos. O mesmo jogo.",
    "hero.lede": "Um grupo de amigos no Counter-Strike. Elenco, números e jogadas da casa.",
    "cta.players": "Ver o elenco",
    "cta.clips": "Assistir jogadas",
    "home.kicker": "Elenco",
    "home.roster": "Elenco",
    "home.clips": "Jogadas em destaque",
    "home.stats": "Números da casa",
    "stat.players": "Jogadores",
    "stat.rating": "Melhor rating",
    "stat.maps": "Mapas",
    "stat.clips": "Clipes",
    "players.sub": "Dados completos de quem veste a tag.",
    "stats.sub": "Todos os jogadores da casa. Sem número inventado — se estiver vazio, ainda não foi preenchido.",
    "clips.kicker": "allstar.gg",
    "clips.title": "Jogadas",
    "clips.sub": "Clipes pelo link da Allstar. Sem upload pesado — cola o URL no painel e aparece aqui.",
    "empty.players": "O elenco ainda está sendo cadastrado no painel.",
    "empty.clips": "Nenhum clipe da allstar.gg por enquanto.",
    "empty.stats": "As estatísticas entram quando o admin preencher.",
    "error.load": "Não foi possível carregar agora.",
    "retry": "Tentar de novo",
    "skip": "Pular para o conteúdo",
    "footer.tag": "Jogadores antigos. O mesmo jogo.",
    "footer.blurb": "Um grupo de amigos no Counter-Strike. Elenco, números e jogadas da casa.",
    "footer.explore": "Explorar",
    "footer.community": "Comunidade",
    "footer.house": "Casa",
    "footer.copy": "Feito pelos Watercats.",
    "status.active": "Ativo",
    "status.inactive": "Inativo",
    "status.alumni": "Ex-jogador",
    "profile.emptyBio": "Sem bio ainda — o painel preenche no login.",
    "profile.plays": "Jogadas",
    "th.player": "Jogador",
    "th.role": "Função",
    "th.rating": "Rating",
    "th.kd": "K/D",
    "th.adr": "ADR",
    "th.hs": "HS%",
    "th.maps": "Mapas",
    "th.wl": "V/D",
    "th.kills": "Abates",
    "th.clutches": "Clutches",
    "login.title": "Área interna",
    "login.body": "Entre para editar elenco, estatísticas e clipes da allstar.gg.",
    "login.password": "Senha",
    "login.submit": "Entrar",
    "theme.light": "Claro",
    "theme.dark": "Escuro",
    "lang.switch": "EN"
  },
  en: {
    "nav.home": "Home",
    "nav.players": "Roster",
    "nav.stats": "Stats",
    "nav.clips": "Clips",
    "nav.login": "Sign in",
    "nav.admin": "Admin",
    "hero.kicker": "WTC · Counter-Strike",
    "hero.tagline": "Old players. Same game.",
    "hero.lede": "Friends playing Counter-Strike. Roster, numbers and house clips.",
    "cta.players": "See the roster",
    "cta.clips": "Watch clips",
    "home.kicker": "Roster",
    "home.roster": "Roster",
    "home.clips": "Featured clips",
    "home.stats": "House numbers",
    "stat.players": "Players",
    "stat.rating": "Top rating",
    "stat.maps": "Maps",
    "stat.clips": "Clips",
    "players.sub": "Full profiles of everyone on the tag.",
    "stats.sub": "Every player in the house. No made-up numbers — empty means it has not been filled in yet.",
    "clips.kicker": "allstar.gg",
    "clips.title": "Clips",
    "clips.sub": "Clips via Allstar link. No heavy upload — paste the URL in the panel and it shows up here.",
    "empty.players": "The roster is still being added in the admin panel.",
    "empty.clips": "No allstar.gg clips yet.",
    "empty.stats": "Stats show up when an admin fills them in.",
    "error.load": "Could not load this right now.",
    "retry": "Try again",
    "skip": "Skip to content",
    "footer.tag": "Old players. Same game.",
    "footer.blurb": "Friends playing Counter-Strike. Roster, numbers and house clips.",
    "footer.explore": "Explore",
    "footer.community": "Community",
    "footer.house": "House",
    "footer.copy": "Made by Watercats.",
    "status.active": "Active",
    "status.inactive": "Inactive",
    "status.alumni": "Alumni",
    "profile.emptyBio": "No bio yet — an admin fills it in after login.",
    "profile.plays": "Clips",
    "th.player": "Player",
    "th.role": "Role",
    "th.rating": "Rating",
    "th.kd": "K/D",
    "th.adr": "ADR",
    "th.hs": "HS%",
    "th.maps": "Maps",
    "th.wl": "W/L",
    "th.kills": "Kills",
    "th.clutches": "Clutches",
    "login.title": "Members area",
    "login.body": "Sign in to edit the roster, stats and allstar.gg clips.",
    "login.password": "Password",
    "login.submit": "Sign in",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "lang.switch": "PT"
  }
};

const TOKEN_KEY = "wtc_token";
const LANG_KEY = "wtc_lang";
const THEME_KEY = "wtc_theme";

function lang() {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "pt";
}

function theme() {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme());
}

function t(key) {
  return (I18N[lang()] && I18N[lang()][key]) || I18N.pt[key] || key;
}

function applyI18n() {
  document.documentElement.lang = lang() === "en" ? "en" : "pt-BR";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  const sw = document.querySelector("[data-lang]");
  if (sw) sw.textContent = t("lang.switch");
  const themeBtn = document.querySelector("[data-theme-btn]");
  if (themeBtn) themeBtn.textContent = t(theme() === "light" ? "theme.dark" : "theme.light");
  document.dispatchEvent(new Event("wtc:lang"));
}

function pageId() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index") return "home";
  if (path.startsWith("/players/") || path.startsWith("/jogador/")) return "player";
  if (path.startsWith("/login") || path.startsWith("/admin")) return "login";
  return path.replace(/^\//, "");
}

function mountChrome() {
  applyTheme();
  const header = document.getElementById("header");
  const footer = document.getElementById("footer");
  const here = pageId();
  const logo = "/img/logo.png?v=9";
  if (header) {
    header.innerHTML = `
      <div class="wrap header-inner">
        <a class="brand" href="/">
          <img src="${logo}" alt="">
          <span class="brand-name">WATER<span>CATS</span></span>
        </a>
        <nav class="nav">
          <a href="/" class="${here === "home" ? "is-on" : ""}" data-i18n="nav.home"></a>
          <a href="/players" class="${here === "players" || here === "player" ? "is-on" : ""}" data-i18n="nav.players"></a>
          <a href="/stats" class="${here === "stats" ? "is-on" : ""}" data-i18n="nav.stats"></a>
          <a href="/clips" class="${here === "clips" ? "is-on" : ""}" data-i18n="nav.clips"></a>
          <button class="lang" type="button" data-lang></button>
          <button class="theme" type="button" data-theme-btn></button>
          <a class="nav-login" href="/login" data-i18n="nav.login"></a>
        </nav>
      </div>`;
  }
  if (footer) {
    footer.innerHTML = `
      <div class="wrap footer-grid">
        <div class="footer-brand">
          <img src="${logo}" alt="WATERCATS">
          <p class="footer-tag" data-i18n="footer.tag"></p>
          <p class="footer-blurb" data-i18n="footer.blurb"></p>
        </div>
        <div class="footer-col">
          <h3 data-i18n="footer.explore"></h3>
          <a href="/" data-i18n="nav.home"></a>
          <a href="/players" data-i18n="nav.players"></a>
          <a href="/stats" data-i18n="nav.stats"></a>
          <a href="/clips" data-i18n="nav.clips"></a>
        </div>
        <div class="footer-col">
          <h3 data-i18n="footer.community"></h3>
          <div class="socials">
            <a href="https://discord.gg/et6N2Y3pJj" target="_blank" rel="noreferrer">Discord</a>
            <a href="https://steamcommunity.com/groups/watercatsgg" target="_blank" rel="noreferrer">Steam</a>
          </div>
        </div>
        <div class="footer-col">
          <h3 data-i18n="footer.house"></h3>
          <a href="/login" data-i18n="nav.login"></a>
          <a href="/admin" data-i18n="nav.admin"></a>
        </div>
      </div>
      <div class="footer-bar">
        <div class="wrap">
          <p>WATERCATS · 2026</p>
          <p data-i18n="footer.copy"></p>
        </div>
      </div>`;
  }
  document.querySelector("[data-lang]")?.addEventListener("click", () => {
    localStorage.setItem(LANG_KEY, lang() === "pt" ? "en" : "pt");
    applyI18n();
  });
  document.querySelector("[data-theme-btn]")?.addEventListener("click", () => {
    localStorage.setItem(THEME_KEY, theme() === "light" ? "dark" : "light");
    applyTheme();
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
  return t("status." + (status || "active")) || status || "";
}

function playerCard(p) {
  const photo = p.photo
    ? `<img class="photo" src="${escapeAttr(p.photo)}" alt="${escapeAttr(p.name)}">`
    : `<div class="photo" style="box-shadow: inset 0 0 40px ${escapeAttr(p.color || "#006BFF")}"></div>`;
  return `<a class="card player-card" href="/jogador/${encodeURIComponent(p.id)}">
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

applyTheme();
document.addEventListener("DOMContentLoaded", mountChrome);

window.WTC = { t, api, dash, playerCard, clipCard, emptyBox, errorBox, statusLabel, TOKEN_KEY };
