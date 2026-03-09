# App (web e nativo) — Reprodução de jogos Stream e limite de telas

Garantia: **qualquer cliente** (site no navegador, app Capacitor/WebView ou futuro app nativo) que reproduz vídeo de jogo Cloudflare Stream **deve** obter a URL de reprodução **somente** pela API `GET /api/video/stream-playback`, enviando `gameSlug` e `deviceId`. Assim o limite de telas é aplicado em todos os canais.

---

## 1. Contrato da API

### GET `/api/games/[gameId]` (ou slug)

- Retorna dados do jogo e `canWatch`, `videoUrl` (raw, ex: `stream:VIDEO_ID`).
- Quando o vídeo é Cloudflare Stream, inclui **`streamPlaybackRequired: true`**.
- **Nunca** retorna URLs assinadas (iframe/HLS). Para reproduzir, o cliente **deve** chamar a API abaixo.

### GET `/api/video/stream-playback` (obrigatório para jogos Stream)

Parâmetros obrigatórios para jogo:

| Parâmetro  | Obrigatório | Descrição |
|------------|-------------|-----------|
| `videoId`  | Sim         | ID do vídeo (extraído de `videoUrl`, ex: `stream:abc123` → `abc123`) |
| `gameSlug` | Sim         | Slug do jogo |
| `deviceId` | Sim         | Identificador estável por dispositivo (ex: UUID guardado em localStorage/AsyncStorage). Um ID por aparelho/navegador. |

A requisição deve enviar os cookies de sessão (web) ou o token de autenticação aceito pelo backend (app nativo).

Resposta de sucesso: `{ playbackUrl, hlsUrl }`.  
Resposta 403: limite de telas atingido (mensagem no campo `error`).

---

## 2. Comportamento no backend

- A página do jogo (**web**) não preenche `streamPlaybackUrl`/`streamHlsUrl` no servidor quando o usuário tem **limite de telas** (assinatura ou patrocínio). O player sempre busca a URL via `GET /api/video/stream-playback` com `gameSlug` e `deviceId`.
- Para **qualquer** requisição de jogo em `stream-playback`, o backend **exige** `deviceId`. Sem ele retorna 400.
- O limite de telas é aplicado na mesma API; não existe outro endpoint que devolva URL assinada para jogos.

---

## 3. App nativo (ex.: React Native / futuro)

1. Ao abrir um jogo, usar `GET /api/games/[gameId]` ou slug.
2. Se `canWatch` e `streamPlaybackRequired === true`:
   - Obter ou gerar um **deviceId** estável por dispositivo (ex: gerar uma vez e guardar em AsyncStorage).
   - Chamar `GET /api/video/stream-playback?videoId=...&gameSlug=...&deviceId=...` com a sessão do usuário.
   - Usar `playbackUrl` ou `hlsUrl` no player.
3. **Não** usar `videoUrl` retornado pelo `/api/games` para obter URL assinada por outro meio; a única forma é `stream-playback`.

---

## 4. App Capacitor (WebView)

O app atual (Capacitor) carrega o mesmo site. O fluxo é o mesmo da web: a página do jogo e o `VideoPlayer` já usam `stream-playback` com `gameSlug` e `deviceId` (localStorage). Nenhuma alteração extra no app é necessária; o limite de telas já vale.
