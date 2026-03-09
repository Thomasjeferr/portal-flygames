# Avaliação pré-deploy — Limite de telas (Stream) e fluxo de reprodução

**Data:** 26/02/2026  
**Objetivo:** Garantir que não há falhas antes do deploy (custo por deploy).

---

## 1. Resumo executivo

- **Build:** ✅ `npm run build` concluído com sucesso.
- **Linter:** ✅ Sem erros nos arquivos alterados.
- **Fluxo de limite de telas:** Revisado de ponta a ponta; uma melhoria de robustez foi aplicada (fail-closed na página do jogo).

---

## 2. Arquivos envolvidos no fluxo de limite de telas

| Arquivo | Função |
|--------|--------|
| `src/app/jogo/[slug]/page.tsx` | Página do jogo: só preenche URLs no servidor quando **não** há limite; passa `streamContext.gameSlug` para o player. |
| `src/app/api/video/stream-playback/route.ts` | API única que devolve URL assinada para jogos; exige `deviceId` quando `gameSlug`; aplica limite e sessão. |
| `src/app/api/games/[gameId]/route.ts` | Retorna jogo + `streamPlaybackRequired: true` quando vídeo é Stream (contrato para app). |
| `src/components/VideoPlayer.tsx` | Cliente: se não receber URLs, chama `stream-playback` com `gameSlug` + `deviceId` (localStorage); exibe erro em 403/400. |
| `src/lib/access.ts` | `getSubscriptionMaxScreens`, `getSponsorMaxScreens` — usados na página e na API. |

---

## 3. Verificações realizadas

### 3.1 Página do jogo (`/jogo/[slug]`)

- ✅ Só chama `getSignedPlaybackUrls` quando **não** há limite (assinatura ou patrocínio com `maxScreens`/`maxConcurrentStreams`).
- ✅ Quando há limite, `streamPlaybackUrl` e `streamHlsUrl` ficam `undefined` → o player é obrigado a chamar a API.
- ✅ `streamContext={{ gameSlug: game.slug }}` é passado para vídeos Stream, para o player montar a chamada à API.
- ✅ **Ajuste aplicado:** bloco de verificação de limite e geração de URLs envolvido em `try/catch`: em caso de erro (ex.: banco indisponível), **não** preenche URLs (fail-closed). O usuário cai no fluxo via `stream-playback`, que também validará acesso e limite.

### 3.2 API `GET /api/video/stream-playback`

- ✅ Para jogos (`gameSlug`): exige **sempre** `deviceId` (400 se faltar).
- ✅ Verifica acesso com `canAccessGameBySlug`.
- ✅ Limite de telas: usa `getSponsorMaxScreens` e `getSubscriptionMaxScreens`; conta sessões ativas (últimos 15 min); retorna 403 com mensagem clara quando atinge o limite.
- ✅ Faz upsert em `UserStreamSession` quando há limite, para contar o dispositivo.
- ✅ Fluxo de pré-venda (`preSaleSlug`) não exige `deviceId` e não aplica limite de telas (comportamento intencional).

### 3.3 API `GET /api/games/[gameId]`

- ✅ Retorna `videoUrl` apenas quando `canWatch`; nunca retorna URLs assinadas.
- ✅ `streamPlaybackRequired: true` quando o vídeo é Stream e o usuário pode assistir — contrato claro para qualquer cliente (web ou app).

### 3.4 VideoPlayer (cliente)

- ✅ Se receber `streamPlaybackUrl` e `streamHlsUrl`, **não** chama a API (early return) — usado só quando não há limite.
- ✅ Se não receber as duas URLs e tiver `streamContext.gameSlug`, chama `stream-playback` com `videoId`, `gameSlug` e `deviceId` (localStorage; fallback se localStorage falhar = sem deviceId → API retorna 400 → mensagem de erro exibida).
- ✅ Resposta não-ok (403/400): `setStreamError(d.error || 'Não foi possível carregar o vídeo.')` — usuário vê a mensagem da API (ex.: limite de telas).
- ✅ Estado “Carregando vídeo...” enquanto aguarda a API; estado de erro com texto adequado quando falha.

### 3.5 Outros usos de vídeo Stream

- ✅ **Pré-estreia** (`/pre-estreia/assistir/[slug]`): usa `VideoPlayer` com `streamContext.preSaleSlug` e `sessionToken`; **não** passa URLs do servidor; sempre passa pela API. Pré-venda não usa limite de telas (fluxo de clube).
- ✅ **Lives** (`/live/[id]`): não usam `VideoPlayer` com Stream da mesma forma; não fazem parte do fluxo de limite de telas de jogos.
- ✅ **Nenhum outro lugar** chama `getSignedPlaybackUrls` para jogos além da página do jogo (e a própria API `stream-playback`).

---

## 4. Cenários de teste sugeridos (após deploy)

1. **Usuário com limite (ex.: 2 telas)**  
   Abrir o mesmo jogo em 3 dispositivos/abas diferentes (cada um com seu `deviceId`). Os dois primeiros devem reproduzir; o terceiro deve receber 403 e ver a mensagem de limite.

2. **Usuário sem limite**  
   Página do jogo deve carregar o vídeo normalmente (URLs podem vir do servidor ou da API, sem bloqueio).

3. **Navegador com localStorage desativado (ou modo anônimo)**  
   Ao abrir um jogo Stream com acesso, o player chama a API sem `deviceId` → 400 → usuário vê “Identificador do dispositivo é necessário…”.

4. **App (WebView/loja)**  
   Mesmo código da web; comportamento deve ser o mesmo, com um `deviceId` por instalação.

---

## 5. Conclusão

- Nenhuma falha lógica ou vazamento de URL assinada foi encontrado.
- Uma melhoria de robustez foi feita na página do jogo (try/catch fail-closed).
- Build e linter estão ok.

**Recomendação:** Pode fazer o deploy. Se quiser, rode os cenários da seção 4 em homologação assim que o deploy estiver no ar.
