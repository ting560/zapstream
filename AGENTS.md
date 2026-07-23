# AGENTS.md - ZapStream / FilmeStream

## Visão Geral
App IPTV web (Next.js 16) para assistir TV ao vivo, filmes (VOD) e séries via API Xtream Codes. Interface em português (pt-BR). Deploy no Vercel.

## Stack
- **Next.js 16** (App Router, `output: "standalone"`)
- **TypeScript 5** (strict, `noImplicitAny: false`)
- **React 19**
- **Tailwind CSS 4** + shadcn/ui (New York style, Lucide icons)
- **Zustand 5** (persist no localStorage) — estado global
- **hls.js 1.6** — player de vídeo (HLS streams)
- **Prisma 6** (SQLite) — schema existe mas NÃO é usado em runtime
- **Supabase** — persistência de `servers`, `app_settings`, `visits`
- **TMDB API** — posters de filmes/séries (`TMDB_KEY=8ac491f51024cd437403cd282cfe1004`)
- **Vercel** — deploy automático do GitHub main

## Comandos Importantes
```bash
npm run dev          # dev server porta 3000
npx next build       # build produção (ignoreBuildErrors: true)
npx prisma generate  # gerar client Prisma (não usado em runtime)
```

## Variáveis de Ambiente
```
DATABASE_URL="file:./db/custom.db"
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
TMDB_KEY=8ac491f51024cd437403cd282cfe1004
```

## Estrutura de Rotas

### Páginas
| Rota | Arquivo | Função |
|------|---------|--------|
| `/` | `src/app/page.tsx` | Home — auto-login com primeiro servidor ativo, renderiza `IPTVApp` |
| `/tv` | `src/app/tv/page.tsx` | Modo TV — navegação por teclado/controle remoto |
| `/admin` | `src/app/admin/page.tsx` | Painel admin — CRUD de servidores |
| `/admin/traffic` | `src/app/admin/traffic/page.tsx` | Dashboard de analytics |

### API Routes
| Rota | Método | Função |
|------|--------|--------|
| `/api/iptv` | POST | Proxy da API Xtream Codes (core) |
| `/api/stream` | GET | Proxy de streams (HLS/video), reescreve manifests M3U8 |
| `/api/canais/stream` | GET | Proxy de canais via CDN |
| `/api/img` | GET | Proxy de imagens (TMDB) |
| `/api/tmdb/search` | GET | Busca TMDB para posters |
| `/api/admin/servers` | GET/POST/PUT/DELETE | CRUD servidores IPTV |
| `/api/admin/settings` | GET/POST/PUT | Configurações do app |
| `/api/analytics/track` | POST | Registro de visitas |
| `/api/analytics/data` | GET | Dados de analytics |

## Componentes Principais

| Arquivo | Função |
|---------|--------|
| `src/components/iptv/IPTVApp.tsx` | App principal — tabs, categorias, grid, busca, favoritos, player, seletor de servidor, banner ad |
| `src/components/iptv/PlayerModal.tsx` | Modal de player — `.mp4` usa `<video>` nativo, `.m3u8` usa HLS.js |
| `src/components/iptv/ContentCard.tsx` | Card de conteúdo com poster TMDB |
| `src/components/iptv/TVApp.tsx` | Interface TV (navegação D-pad) |
| `src/components/iptv/CanaisPlayerModal.tsx` | Player de canais via CDN externo |
| `src/components/iptv/PinModal.tsx` | Modal PIN conteúdo adulto |
| `src/components/iptv/LoginCard.tsx` | Formulário de login (não usado no fluxo principal) |

## Estado Global (Zustand — `src/lib/iptv-store.ts`)

Persistido no localStorage (`iptv-store`):
- `credentials` — `{ server, username, password }`
- `favorites` — itens favoritos
- `theme` — `"dark"` ou `"light"`

Não persistido:
- `isAuthenticated`, `activeTab`, `activeCategory`, `search`, `currentPlay`

**DEFAULT_CREDENTIALS**: `{ server: "https://ooo.fo", username: "josias.barbosa.costa@gmail.com", password: "123abc" }`

## Fluxo de Dados IPTV

1. Client chama `callApiViaProxy()` → POST `/api/iptv` com credenciais + action
2. Server-side monta URL: `{server}/player_api.php?username=...&password=...&action=...`
3. Faz request HTTP com User-Agent de browser
4. Se 403, tenta fallback HTTP↔HTTPS
5. Retorna JSON ao client

## Playback de Vídeo (`PlayerModal.tsx`)

- **`.mp4` / `.mkv` (VOD/Séries):** Usa `<video>` nativo do browser (sem CORS issues). URL direta: `{server}/movie/{user}/{pass}/{id}.{ext}`
- **`.m3u8` (Live):** Usa HLS.js. URL direta: `{server}/live/{user}/{pass}/{id}.m3u8`
- **Canais externos:** Via PHP proxy em `https://blueviolet-newt-188057.hostingersite.com/200/`

**IMPORTANTE:** NUNCA usar HLS.js para arquivos `.mp4` — ele não consegue parsear. Sempre usar `<video>` nativo.

## Servidores IPTV

Dois servidores configurados (admin padrão):
1. **ooo.fo** — funciona via Vercel (API + streams)
2. **srv.cldplay.in** — DDOS-GUARD bloqueia IPs do Vercel (403 na API). Funciona do browser do usuário.

Dropdown "Servidor 1" / "Servidor 2" no header ao lado das tabs.

## Supabase (`src/lib/supabase.ts`)

- Cria client real quando env vars estão configuradas
- Fallback: mock Proxy que retorna dados vazios
- Tabelas esperadas: `servers`, `app_settings`, `visits`
- Storage dual: tenta Supabase → fallback para JSON files (`db/` ou `/tmp/` no Vercel)

## Config Admin (`db/settings.json`)
```json
{
  "adultCategories": ["Erótico", "Adultos", "XXX"],
  "pin": "123456",
  "disabledTabs": ["live", "favoritos"],
  "adminPassword": "Frenesi04"
}
```

## Anúncios

Banner 300x250 fixo no rodapé via `highperformanceformat.com` (chave: `443dfd27df99ddf8dea113eceb887912`). Injetado via `useEffect` em `IPTVApp.tsx`. Container: `#container-83db2da36f450d487d008356efe65b22`.

**NÃO usar** `effectivecpmnetwork.com` — injeta interceptadores XHR que quebram o player de vídeo.

## Coisas que NÃO fazer
1. **NUNCA** usar HLS.js para `.mp4` — usar `<video>` nativo
2. **NUNCA** adicionar scripts de anúncio que interceptam XHR (`effectivecpmnetwork.com`, scripts com `requests.js`)
3. **NUNCA** mudar o `buildStreamUrl` para usar `/api/stream` proxy para VOD — URLs diretas funcionam do browser
4. **NUNCA** mexer no fluxo de auto-login em `page.tsx` sem entender a cadeia: `fetch servers → authenticate → setAuthenticated`
5. **NUNCA** remover o `aria-describedby={undefined}` dos Dialogs (causa warnings no console)
6. O arquivo `public/data/iptv-data.json` NÃO deve existir no repo — o `.gitignore` bloqueia `/public/data/*.json`. O fetch no código usa `.catch(() => {})` silenciosamente.

## Arquivos Importantes
```
src/lib/iptv-client.ts       — API client (authenticate, getCategories, buildStreamUrl, etc.)
src/lib/iptv-store.ts         — Zustand store (estado global)
src/lib/iptv-types.ts         — Todas as interfaces TypeScript
src/lib/img-cache.ts          — URL builder para imagens TMDB
src/app/api/iptv/route.ts     — Proxy server-side da API Xtream
src/app/api/stream/route.ts   — Proxy de streams (M3U8 rewrite)
src/app/api/admin/servers/route.ts — CRUD servidores (Supabase + file fallback)
src/app/api/admin/settings/route.ts — Settings (Supabase + file fallback)
```

## Deploy
- GitHub push → Vercel auto-deploy (branch main)
- Token Vercel: configurado via CLI
- Supabase env vars configuradas no Vercel
- Build: `npx next build` (ignoreBuildErrors: true)

## Ambiente de Desenvolvimento
- Windows ( PowerShell 7+ )
- npm como package manager
- Diretório: `C:\200\zapstream`
