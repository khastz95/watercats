const flash = document.getElementById("flash");
const playerForm = document.getElementById("player-form");
const statsForm = document.getElementById("stats-form");
const clipForm = document.getElementById("clip-form");

if (!sessionStorage.getItem(WTC.TOKEN_KEY)) location.replace("/login");

document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.removeItem(WTC.TOKEN_KEY);
  location.replace("/login");
});

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("is-on", b === btn));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("is-on", p.id === "panel-" + btn.dataset.tab));
  });
});

function say(text, ok = false) {
  flash.style.color = ok ? "#7ad7ff" : "#ff1838";
  flash.textContent = text || "";
}

function fillForm(form, data) {
  [...form.elements].forEach((el) => {
    if (!el.name || el.type === "file") return;
    const v = data[el.name];
    if (el.type === "checkbox") el.checked = Boolean(v);
    else if (v == null) el.value = el.type === "color" ? "#006BFF" : "";
    else el.value = String(v);
  });
}

function formData(form) {
  const data = {};
  [...form.elements].forEach((el) => {
    if (!el.name || el.type === "file") return;
    data[el.name] = el.type === "number" && el.value === "" ? null : el.value;
  });
  return data;
}

let players = [];
let clips = [];

function playerOptions(select, selected) {
  select.innerHTML = `<option value="">—</option>` + players.map((p) =>
    `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${p.name}</option>`
  ).join("");
}

function renderPlayers() {
  document.getElementById("player-list").innerHTML = players.map((p) => `
    <div class="row">
      <div><strong>${p.name}</strong><div class="meta">${p.role || "sem função"} · ${WTC.statusLabel(p.status)}</div></div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" data-edit="${p.id}">Editar</button>
        <button class="btn btn-danger" type="button" data-del="${p.id}">Apagar</button>
      </div>
    </div>
  `).join("");
  playerOptions(statsForm.playerId);
  playerOptions(clipForm.playerId);
}

function renderClips() {
  document.getElementById("clip-list").innerHTML = clips.map((c) => `
    <div class="row">
      <div><strong>${c.title}</strong><div class="meta">${c.playerName || "—"} · ${c.map || "sem mapa"}</div></div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" data-cedit="${c.id}">Editar</button>
        <button class="btn btn-danger" type="button" data-cdel="${c.id}">Apagar</button>
      </div>
    </div>
  `).join("");
}

async function reload() {
  const [p, c] = await Promise.all([WTC.api("/api/players"), WTC.api("/api/clips")]);
  players = p.players;
  clips = c.clips;
  renderPlayers();
  renderClips();
}

playerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const body = formData(playerForm);
    const saved = await WTC.api("/api/players", { method: "PUT", body });
    const file = playerForm.photo.files[0];
    if (file) {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler a foto"));
        reader.readAsDataURL(file);
      });
      await WTC.api("/api/photo", {
        method: "POST",
        body: { playerId: saved.player.id, mime: file.type, data }
      });
    }
    playerForm.reset();
    playerForm.id.value = "";
    say("Jogador salvo.", true);
    await reload();
  } catch (err) {
    say(err.message);
  }
});

playerForm.addEventListener("reset", () => { playerForm.id.value = ""; });

document.getElementById("player-list").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  if (edit) {
    const p = players.find((x) => x.id === edit.dataset.edit);
    if (p) fillForm(playerForm, p);
  }
  if (del && confirm("Apagar este jogador?")) {
    try {
      await WTC.api("/api/players?id=" + encodeURIComponent(del.dataset.del), { method: "DELETE" });
      say("Jogador apagado.", true);
      await reload();
    } catch (err) { say(err.message); }
  }
});

statsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await WTC.api("/api/stats", { method: "PUT", body: formData(statsForm) });
    say("Estatísticas salvas.", true);
    await reload();
  } catch (err) { say(err.message); }
});

document.getElementById("csrep-sync").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  say("Sincronizando com o CSRep…", true);
  try {
    const { results } = await WTC.api("/api/csrep", { method: "POST", body: {} });
    const falhas = results.filter((r) => !r.ok);
    if (falhas.length) say(falhas.map((r) => `${r.id}: ${r.error}`).join(" · "));
    else say(`CSRep sincronizado (${results.length} jogadores).`, true);
    await reload();
  } catch (err) {
    say(err.message);
  } finally {
    btn.disabled = false;
  }
});

statsForm.playerId.addEventListener("change", () => {
  const p = players.find((x) => x.id === statsForm.playerId.value);
  if (!p) return;
  fillForm(statsForm, { playerId: p.id, ...p.stats });
});

clipForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const body = formData(clipForm);
    body.featured = body.featured === "true";
    await WTC.api("/api/clips", { method: "PUT", body });
    clipForm.reset();
    clipForm.id.value = "";
    say("Clipe salvo.", true);
    await reload();
  } catch (err) { say(err.message); }
});

document.getElementById("clip-list").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-cedit]");
  const del = e.target.closest("[data-cdel]");
  if (edit) {
    const c = clips.find((x) => x.id === edit.dataset.cedit);
    if (c) fillForm(clipForm, { id: c.id, title: c.title, playerId: c.playerId, url: c.url, map: c.map, featured: String(c.featured) });
  }
  if (del && confirm("Apagar este clipe?")) {
    try {
      await WTC.api("/api/clips?id=" + encodeURIComponent(del.dataset.cdel), { method: "DELETE" });
      say("Clipe apagado.", true);
      await reload();
    } catch (err) { say(err.message); }
  }
});

reload().catch((err) => {
  if (err.status === 401) location.replace("/login");
  else say(err.message);
});
