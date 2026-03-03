# Design: transição agendado → ao vivo sem refresh da página

Objetivo: quando o usuário está na página da live agendada e a contagem chega a zero, trocar suavemente para o player ao vivo **na mesma view**, sem `router.refresh()` nem recarregar a página.

---

## 1. Visão geral do fluxo

```
[Contagem regressiva]  →  (diff = 0)  →  [“Transmissão em instantes…”]  →  [Polling API]
                                                                                ↓
[Player ao vivo com HLS]  ←  API retorna status=LIVE e hlsUrl  ←  (a cada 3–5 s)
```

- **Fase 1:** Usuário vê a contagem (dias/horas/min/seg) como hoje.
- **Fase 2:** Ao chegar a zero, a UI muda para “A transmissão deve começar em instantes…” (sem refresh).
- **Fase 3:** O cliente começa a chamar a API de status a cada X segundos.
- **Fase 4:** Quando a API devolver `status: 'LIVE'` e `hlsUrl`, o mesmo bloco da página passa a renderizar o `StreamCustomPlayer` com esse `hlsUrl`.

Nenhum `router.refresh()` ou `window.reload`; só troca de estado no cliente.

---

## 2. Nova API: status da live + URL do stream

### 2.1 Contrato

- **Método e path:** `GET /api/live/[id]/stream-status`
- **Autenticação:** usa a sessão atual (cookie). Se não logado, retorna 401 ou `{ canWatch: false }`.
- **Resposta (200):**

```ts
{
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';  // considerando horário (startAt/endAt)
  canWatch: boolean;                        // mesmo critério da página (assinatura/compra)
  hlsUrl?: string | null;                   // só se status === 'LIVE' e canWatch e stream disponível
  startAt?: string | null;                  // ISO date (para o cliente não precisar do server)
}
```

- **Quando `hlsUrl` vem preenchido:** cliente pode montar o player imediatamente.
- **Quando `status === 'LIVE'` mas `hlsUrl` é null:** exibir “Transmissão em breve…” (igual hoje).

### 2.2 Lógica no servidor (resumo)

1. Buscar a live por `id` (com `startAt`, `endAt`, `status`, `cloudflareLiveInputId`, `cloudflarePlaybackId`, `requireSubscription`, `allowOneTimePurchase`).
2. **Ajuste de status por horário** (igual à página):
   - Se `status === 'SCHEDULED'` e `startAt <= now` e não acabou → considerar `status = 'LIVE'` (e opcionalmente atualizar no banco, como hoje).
   - Se `status === 'LIVE'` e `endAt <= now` → considerar `status = 'ENDED'`.
3. Obter `userId` da sessão; chamar `canAccessLive(userId, live)` → `canWatch`.
4. Se `canWatch` e status efetivo for `'LIVE'` e existir `cloudflareLiveInputId` (e não tiver playback de replay): chamar `getLiveHlsUrl(live.cloudflareLiveInputId)` e devolver em `hlsUrl`.
5. Se for replay (`cloudflarePlaybackId`), pode devolver `status: 'ENDED'` e outro campo `replayHlsUrl` se quiser reuso; para o “agendado → ao vivo” o foco é `LIVE` + `hlsUrl`.

Assim, a API fica alinhada à lógica atual da página (incluindo acesso e Cloudflare), mas exposta como endpoint para o cliente.

---

## 3. Cliente: componente “Live agendado → player”

### 3.1 Responsabilidade

Um único componente cliente que:

- Recebe: `liveId`, `startAt` (Date), `title`, `thumbnailUrl` (opcional), `posterUrl` (opcional).
- Estados internos:
  - **counting:** `diff > 0` → mostra contagem (igual ao `LiveCountdown` atual).
  - **waiting:** `diff <= 0` e ainda não recebeu `hlsUrl` → mostra “A transmissão deve começar em instantes…” (e opcionalmente um loader).
  - **playing:** recebeu `hlsUrl` → mostra o badge “AO VIVO” + `StreamCustomPlayer` com esse `hlsUrl`.

### 3.2 Fluxo interno (passo a passo)

1. **Montagem:** inicia contagem (igual ao `LiveCountdown`: `setInterval` 1s, `diff = max(0, startAt - now)`).
2. **Quando `diff` passa a 0:**
   - Parar o intervalo da contagem.
   - Mudar para estado `waiting`.
   - Iniciar polling: `fetch(/api/live/${liveId}/stream-status)` a cada 3–5 s (e opcionalmente uma primeira chamada imediata).
3. **A cada resposta da API:**
   - Se `status === 'LIVE'` e `hlsUrl` existe → guardar `hlsUrl`, parar polling, mudar para estado `playing` e renderizar `StreamCustomPlayer` com `hlsUrl` e `autoplay`.
   - Se `status === 'LIVE'` e `hlsUrl` é null → manter `waiting` e mensagem “Transmissão em breve…” (ou “em instantes”).
   - Se `status === 'ENDED'` e vier replay: pode tratar depois (ex.: mostrar link para replay); para este design o foco é só LIVE.
4. **Limite de tempo:** após N minutos em `waiting` (ex.: 10 min), pode parar o polling e mostrar “Atualize a página se a transmissão já começou”.

Nada disso usa `router.refresh()` nem `window.location.reload()`.

### 3.3 Onde encaixar na página

- **Hoje:** dentro de `page.tsx` (Server Component), quando `live.status === 'SCHEDULED' && startAt` e `canWatch`, o bloco do player renderiza algo como:
  - `<LiveCountdown startAt={startAt} title={live.title} />` (e ao chegar a 0 chama `router.refresh()`).
- **Depois:** o mesmo bloco passa a renderizar um **único** componente cliente, por exemplo:
  - `<LiveScheduledToLivePlayer liveId={live.id} startAt={startAt} title={live.title} thumbnailUrl={live.thumbnailUrl} />`.
- Esse componente:
  - Enquanto `diff > 0`: mostra a mesma UI de contagem que o `LiveCountdown` (pode extrair a parte visual para um subcomponente ou reutilizar o atual só para exibição, sem o `useEffect` do refresh).
  - Quando `diff <= 0`: mostra “em instantes” e inicia o polling.
  - Quando a API devolve LIVE + `hlsUrl`: renderiza o player na mesma posição.

O restante da página (cabeçalho da partida, times, avisos de assinatura etc.) continua como está; só o “conteúdo do retângulo do player” é que passa a ser controlado por esse componente.

---

## 4. Resumo dos arquivos

| O quê | Onde |
|------|------|
| Nova API de status + HLS | `src/app/api/live/[id]/stream-status/route.ts` (GET) |
| Componente cliente countdown → waiting → player | `src/components/LiveScheduledToLivePlayer.tsx` (ou nome parecido) |
| Uso na página da live | `src/app/live/[id]/page.tsx`: no ramo SCHEDULED + canWatch, trocar `<LiveCountdown … />` pelo novo componente que recebe `liveId`, `startAt`, `title`, `thumbnailUrl` |
| Reuso de lógica de acesso e HLS | `canAccessLive`, `getLiveHlsUrl` (e ajuste de status por horário) na rota da API |

---

## 5. Comportamentos opcionais

- **Backoff no polling:** aumentar o intervalo após várias tentativas (ex.: 3s → 5s → 8s) para não sobrecarregar.
- **Feedback visual em “waiting”:** spinner ou animação leve junto com “A transmissão deve começar em instantes…”.
- **Acessibilidade:** anunciar para leitores de tela quando passar de “contagem” para “em instantes” e quando o player for exibido.

---

## 6. Diagrama de estados (cliente)

```
     ┌─────────────────┐
     │   COUNTING      │  diff > 0, mostrando dias/horas/min/seg
     └────────┬────────┘
              │ diff === 0
              ▼
     ┌─────────────────┐     polling GET /api/live/[id]/stream-status
     │   WAITING       │     a cada 3–5 s
     │ "em instantes"  │
     └────────┬────────┘
              │ status === 'LIVE' && hlsUrl
              ▼
     ┌─────────────────┐
     │   PLAYING       │  StreamCustomPlayer(hlsUrl, autoplay)
     │   AO VIVO       │
     └─────────────────┘
```

Com esse desenho, a experiência fica contínua na mesma página, sem refresh, e a API concentra regras de acesso e de horário já existentes no servidor.
