<p align="center">
  <img src="img/logo.png" alt="WATERCATS" width="280">
</p>

<h1 align="center">WATERCATS</h1>

<p align="center">
  Old players. Same game.<br>
  Site oficial do clube — elenco, estatísticas e jogadas via <a href="https://allstar.gg">allstar.gg</a>.
</p>

<p align="center">
  <a href="https://watercats.vercel.app"><strong>watercats.vercel.app</strong></a>
  ·
  <a href="https://discord.gg/et6N2Y3pJj">Discord</a>
  ·
  <a href="https://steamcommunity.com/groups/watercatsgg">Steam</a>
</p>

---

## O que é

Site estático com API na Vercel e dados no Supabase. O público vê o elenco, as stats e os clipes. Quem tem a senha entra em `/login` e edita tudo pelo painel.

Não inventa biografia nem número: o que não foi cadastrado aparece vazio.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front | HTML, CSS e JavaScript (sem framework) |
| Host | [Vercel](https://vercel.com) (`watercats`) |
| API | Vercel Functions em `api/` |
| Banco | Supabase (Postgres) |
| Clipe | embed `https://allstar.gg/iframe?clip=ID` |

## Páginas

| Rota | Arquivo | Função |
| --- | --- | --- |
| `/` | `index.html` | Home: logo, elenco, números e clipes em destaque |
| `/players` | `players.html` | Lista do elenco |
| `/jogador/:slug` | `player.html` | Perfil (rewrite no `vercel.json`) |
| `/stats` | `stats.html` | Tabela de estatísticas |
| `/clips` | `clips.html` | Jogadas da allstar.gg |
| `/login` | `login.html` | Entrada do painel |
| `/admin` | `admin.html` | CRUD de jogadores, stats e clipes |

## Estrutura

```
watercats/
├── api/                 endpoints serverless
├── css/                 estilo do site
├── img/                 marca
├── js/                  front
├── lib/                 helpers da API (só no servidor)
├── scripts/             migrate do banco
├── *.html               páginas públicas e admin
├── supabase.sql         schema
├── vercel.json          rotas da Vercel
├── package.json         dependência do migrate
└── .env.example         variáveis, sem segredo
```

### Páginas

| Arquivo | Descrição |
| --- | --- |
| `index.html` | Home. |
| `players.html` | Grade do elenco. |
| `player.html` | Ficha do jogador, stats e clipes. |
| `stats.html` | Ranking / tabela. |
| `clips.html` | Lista de jogadas. |
| `login.html` | Formulário de senha. |
| `admin.html` | Painel: abas Jogadores, Stats e Clipes. |

### Front

| Arquivo | Descrição |
| --- | --- |
| `css/app.css` | Layout sóbrio, menu e paleta da marca. |
| `js/site.js` | Header, rodapé, i18n PT/EN e fetch público. |
| `js/admin.js` | Login persistido em sessão; CRUD autenticado. |

### Marca

| Arquivo | Descrição |
| --- | --- |
| `img/logo.png` | Logo completa com fundo transparente; também é o favicon. |
| `img/icon.png` | Recorte do gato (marca quadrada). |
| `img/favicon.png` | Ícone 64×64 gerado da logo. |

### API (`api/`)

Todas as mutations exigem token (`x-admin-token`) depois do login, ou o PIN em `x-edit-pin`.

| Arquivo | Método | Descrição |
| --- | --- | --- |
| `api/auth.js` | `POST` | Valida a senha (`EDIT_PIN`) e devolve token de 12h. |
| `api/players.js` | `GET` `PUT` `DELETE` | Lista / ficha / upsert / apaga jogador. |
| `api/stats.js` | `PUT` | Atualiza estatísticas de um jogador. |
| `api/clips.js` | `GET` `PUT` `DELETE` | Clipes; o link precisa ser da allstar.gg. |
| `api/photo.js` | `POST` | Upload de foto (JPG, PNG, WEBP, GIF, até 1,5 MB). |

### Servidor (`lib/` e `scripts/`)

| Arquivo | Descrição |
| --- | --- |
| `lib/cloud.js` | Supabase REST, sessão, parse do clipe, CRUD. Service role só aqui. |
| `lib/http.js` | Leitura do body e respostas JSON. |
| `scripts/migrate.js` | Aplica `supabase.sql` no Postgres. |
| `supabase.sql` | Tabelas `players`, `player_stats`, `clips`. Não mexe em `org_*`. |
| `vercel.json` | `cleanUrls` e rewrite `/jogador/:slug` → `player.html`. |
| `package.json` | Script `migrate` e cliente `postgres`. |
| `.env.example` | Nomes das variáveis de ambiente. |
| `.gitignore` | Ignora `.env*`, `node_modules` e `.vercel`. |
| `LICENSE` | MIT. |

A chave `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o browser.

## Banco

Três tabelas no schema `public`:

- **`players`** — ficha (nick, nome, função, país, Steam, FACEIT, Discord, Twitch, bio, foto, status).
- **`player_stats`** — rating, K/D, ADR, HS%, mapas, W/L, kills, clutches, MVP.
- **`clips`** — título, URL allstar.gg, mapa, destaque, jogador.

Stats nulas aparecem como "—" no site.

O mesmo projeto Supabase pode ter tabelas `org_*` da [watercatsgg](https://github.com/khastz95/watercatsgg). O migrate deste repo **não** as apaga.

## Ambiente

Copie `.env.example` para `.env.local` (local) e defina o mesmo na Vercel (Production / Preview / Development):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EDIT_PIN=
POSTGRES_URL_NON_POOLING=
```

`EDIT_PIN` é a senha de `/login`. `POSTGRES_URL_NON_POOLING` só é preciso para o migrate.

```bash
npm install
npm run migrate
npx vercel --prod
```

O GitHub `khastz95/watercats` já está ligado ao projeto Vercel **watercats**. Push em `main` dispara deploy.

## Paleta

Preto `#000000` / `#050505`, azul-escuro `#001428`, azul `#006BFF`, elétrico `#008CFF`, ciano `#20B8FF`, branco, cinza `#8A8A8A`. Vermelho `#FF1838` só como detalhe (olhos da logo).

## Licença

[MIT](LICENSE)
