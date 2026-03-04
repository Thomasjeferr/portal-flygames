# Design: considerar fim da live no destaque da home (card + badge)

**Objetivo:** Quando o jogo ao vivo já terminou (`endAt` passou) e o admin esqueceu de mudar o status para "Encerrada", a home não deve mais exibir essa live como "Ao vivo agora". O card e o badge devem deixar de mostrar essa live ou passar a exibir a próxima agendada.

---

## 1. Situação atual

| Onde | Comportamento |
|------|----------------|
| **API `/api/public/live-highlight`** | Busca live com `status: 'LIVE'` (e cloudflare) **sem** verificar `endAt`. Se a live está LIVE no banco, retorna como "Ao vivo" mesmo que `endAt` já tenha passado. |
| **Página `/live/[id]`** | Ao carregar, se `status === 'LIVE'` e `endAt <= now`, atualiza para ENDED e mostra "O jogo acabou". |
| **Efeito** | Na home o card/badge continuam "Ao vivo" até o admin mudar no painel ou alguém abrir a página da live. |

---

## 2. Alteração desejada

Na API **`GET /api/public/live-highlight`**, ao decidir o que retornar como "ao vivo", passar a considerar o **fim** da transmissão:

- **Se** existe uma live com `status: 'LIVE'` (e critérios atuais de cloudflare),
- **e** essa live tem `endAt` preenchido e `endAt <= now`,
- **então** não considerá-la como "ao vivo":
  - opcionalmente atualizar no banco `status` para `'ENDED'` (para consistência),
  - e **não** retornar essa live como `mode: 'LIVE'`; seguir para a próxima regra (scheduledButStarted ou nextScheduled ou NONE).

Assim, o card e o badge na home deixam de mostrar "Ao vivo agora" para uma live que já acabou, mesmo que o admin não tenha alterado o status.

---

## 3. Onde alterar

**Arquivo:** `src/app/api/public/live-highlight/route.ts`

**Lógica atual (resumo):**

1. Buscar `liveNow`: `status === 'LIVE'`, `cloudflareLiveInputId` não nulo, `cloudflarePlaybackId` nulo → retorna `mode: 'LIVE'`.
2. Buscar `scheduledButStarted`: SCHEDULED com `startAt` no passado → retorna `mode: 'LIVE'`.
3. Buscar `nextScheduled`: SCHEDULED com `startAt` no futuro → retorna `mode: 'SCHEDULED'`.
4. Senão → `mode: 'NONE'`.

**Alteração proposta:**

- Na query de **liveNow** (primeiro `findFirst`), incluir na condição que a live **não** tenha acabado por horário:
  - **OU** `endAt` é null (sem horário de fim definido),
  - **OU** `endAt > now` (fim ainda no futuro).

  Em Prisma isso pode ser expressado com:
  - `OR: [ { endAt: null }, { endAt: { gt: now } } ]`
  - no `where` do `findFirst` de liveNow.

- **Opcional mas recomendável:** ao encontrar uma live com `status: 'LIVE'` mas `endAt <= now` (por exemplo em uma verificação separada ou ao não encontrar liveNow), atualizar essa live para `status: 'ENDED'` em uma única vez, para que o banco fique alinhado com a realidade (evita que outras partes do sistema ainda tratem como ao vivo).

  Alternativa mais simples: **só** filtrar na busca (não retornar como ao vivo); a atualização para ENDED continua acontecendo apenas quando alguém abre a página da live. Isso já resolve o problema na home. A atualização em batch na API pode ser feita depois se quiser.

---

## 4. Detalhamento da query "liveNow"

**Antes:**

```ts
const liveNow = await prisma.live.findFirst({
  where: {
    status: 'LIVE',
    cloudflareLiveInputId: { not: null },
    cloudflarePlaybackId: null,
  },
  orderBy: [...],
  include: {...},
});
```

**Depois:**

- Garantir que a live retornada não tenha `endAt` no passado. Duas opções:

**Opção A – Filtrar na query (recomendado):**

- Incluir no `where` uma condição que exija que **não** esteja “encerrada por horário”:
  - `endAt` null **ou** `endAt > now`.

Em Prisma:

```ts
where: {
  status: 'LIVE',
  cloudflareLiveInputId: { not: null },
  cloudflarePlaybackId: null,
  OR: [
    { endAt: null },
    { endAt: { gt: now } },
  ],
},
```

Assim, nenhuma live com `endAt <= now` será retornada como "ao vivo". A ordem das regras (liveNow → scheduledButStarted → nextScheduled → NONE) permanece; apenas o resultado de liveNow deixa de incluir lives já finalizadas por horário.

**Opção B – Atualizar status ao “encontrar” live que acabou:**

- Se quiser que a API também corrija o status no banco quando `endAt` passou:
  - Após a query de liveNow, se não encontrou nada, fazer uma query para uma live LIVE com `endAt <= now`; se existir, dar `update` para ENDED (pode limitar a 1 registro). Isso evita que, em outras chamadas ou telas, essa live continue aparecendo como LIVE.

Para o objetivo “card e badge não mostram mais ao vivo quando o jogo já acabou”, a **Opção A** é suficiente. A Opção B é um refinamento para manter o banco consistente.

---

## 5. scheduledButStarted

- Na segunda busca (SCHEDULED com `startAt` no passado), faz sentido **também** exigir que a live não tenha “acabado” por `endAt`:
  - Caso contrário, uma live SCHEDULED com `startAt` no passado mas `endAt` também no passado poderia ser exibida como "Ao vivo".
- Incluir no `where` de `scheduledButStarted` a mesma ideia: `endAt` null ou `endAt > now`.

Exemplo:

```ts
where: {
  status: 'SCHEDULED',
  startAt: { not: null, lte: now, gte: oneDayAgo },
  OR: [
    { endAt: null },
    { endAt: { gt: now } },
  ],
},
```

---

## 6. Resumo do fluxo após a alteração

1. **liveNow:** LIVE, com cloudflare, e **(endAt null OU endAt > now)** → retorna `mode: 'LIVE'`.
2. **scheduledButStarted:** SCHEDULED, startAt no passado, e **(endAt null OU endAt > now)** → retorna `mode: 'LIVE'`.
3. **nextScheduled:** SCHEDULED, startAt no futuro → retorna `mode: 'SCHEDULED'`.
4. Senão → `mode: 'NONE'`.

Assim, quando o jogo já finalizou (`endAt` passou), mesmo com status ainda LIVE ou SCHEDULED no admin, a home deixa de mostrar essa live como "Ao vivo" e pode mostrar a próxima agendada ou nenhum destaque, até o admin ajustar o status se desejar.
