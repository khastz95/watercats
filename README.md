# WATERCATS

<p align="center">
  <img src="img/wordmark-dark.png" alt="Watercats" height="40">
</p>

<p align="center">
  <strong>ALLIANCE</strong><br>
  Clube de amigos. Principalmente CS2 — o mesmo nome de sempre no lobby.
</p>

<p align="center">
  <a href="https://watercats.vercel.app">watercats.vercel.app</a>
  ·
  <a href="https://github.com/khastz95/watercats/blob/main/LICENSE">MIT</a>
</p>

---

## Sobre

Site do clube **Watercats**: membros, números da temporada e jogadas gravadas.
Front estático, API na Vercel e dados no Supabase. O painel em `/admin` edita o arquivo com senha.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front | HTML, CSS, JavaScript |
| Host | [Vercel](https://vercel.com) |
| API | Serverless em `api/` |
| Banco | Supabase (Postgres) |
| Fontes | Leetify, Steam, allstar.gg |

## Páginas

| Rota | Descrição |
| --- | --- |
| `/` | Início |
| `/players` | Membros |
| `/jogador/:slug` | Perfil |
| `/stats` | Números |
| `/clips` | Jogadas |
| `/marca` | Marca (prévia · sem loja) |
| `/sobre` | O clube |
| `/join` | Pedido para entrar |
| `/login` · `/admin` | Painel |

## Estrutura

```text
api/          rotas serverless
css/          estilos
img/          marca e assets
js/           front (site + admin)
lib/          helpers de servidor
scripts/      migrate, seed, sync
*.html        páginas
supabase.sql  schema
vercel.json   rotas e rewrites
```

## Ambiente

1. Copie `.env.example` → `.env.local`
2. Configure as mesmas variáveis na Vercel

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EDIT_PIN=
POSTGRES_URL_NON_POOLING=
LEETIFY_API_KEY=   # opcional
```

```bash
npm install
npm run migrate
npm run seed
npx vercel --prod
```

Scripts úteis: `npm run avatars`, `npm run clips`, `npm run leetify`.

A chave `SUPABASE_SERVICE_ROLE_KEY` fica só no servidor — nunca no navegador.

## Licença

[MIT](LICENSE) © 2026 WATERCATS
