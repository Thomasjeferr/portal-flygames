# Avaliação: Jogos pré-estreia (onde os times se promovem)

Resumo da lógica do modelo de pré-estreia no projeto, com foco em **como os times se promovem** (financiam o jogo) e onde está implementado.

---

## 1. Dois modos de pré-estreia

| Modo | Descrição | Onde os “times” entram |
|------|-----------|-------------------------|
| **Pré-estreia Clubes** | Dois clubes financiam o jogo comprando um **slot** cada (valor por time). Quando os 2 slots estão pagos → jogo “financiado”; quando há `videoUrl` → publicado. | Cada time usa um **código de clube** (slot 1 ou 2), vai ao checkout, paga (PIX Woovi) e “se promove” ao pagar. |
| **Pré-estreia Meta** | Jogo vinculado a **meta de novos assinantes** por time (mandante e visitante). Não há compra de slot; a “promoção” é bater a meta de assinaturas no portal. | Times não pagam slot; a contagem usa `User.favoriteTeamId` + assinaturas ativas. Quando ambos os times batem a meta → FUNDED; com `videoUrl` → PUBLISHED. |

No que segue, o foco é no **modelo em que os times se promovem pagando** (Pré-estreia Clubes).

---

## 2. Modelo de dados (Prisma)

- **PreSaleGame**  
  - Um jogo de pré-estreia: título, thumbnail, `videoUrl`, `status` (PRE_SALE → FUNDED → PUBLISHED).  
  - **Clubes:** `clubAPrice`, `clubBPrice`, `maxSimultaneousPerClub`, `homeTeamId`/`awayTeamId` (opcional).  
  - **Meta:** `metaEnabled`, `baselineHomeSubs`, `baselineAwaySubs`, `metaExtraPerTeam`, `metaHomeTotal`, `metaAwayTotal`.  
  - Relação: `clubSlots` (lista de `PreSaleClubSlot`).

- **PreSaleClubSlot**  
  - Um “lugar” de clube no jogo: `slotIndex` (1 ou 2), `clubCode` (único, ex.: `ABCD1234`), `responsibleName`, `responsibleEmail`, `clubName`, `teamMemberCount`, `paymentStatus` (PENDING | PAID | FAILED), `paymentProvider`, `paymentReference`, `paidAt`, `credentialsSentAt`.  
  - **Quem paga** é o responsável pelo clube (time); ao pagar, o slot fica PAID e o time “se promove” para aquele jogo.

- **ClubViewerAccount**  
  - Conta de visualização do clube: vinculada a um `PreSaleClubSlot` pago. Guarda `loginUsername` (ex.: `clube-xxx-1`) e o `userId` da conta interna (role `club_viewer`). Usada para o time assistir com usuário/senha.

- **ClubStreamSession**  
  - Sessão de streaming por dispositivo: `sessionToken`, `clubCode`, heartbeat, `expiresAt`. Limita telas simultâneas por clube (`maxSimultaneousPerClub`).

- **PreSaleCategory**  
  - Categorias com `scope`: CLUB (só Clubes) ou META (só Meta). Separação por tipo de pré-estreia.

---

## 3. Fluxo em que o time “se promove” (Pré-estreia Clubes)

1. **Admin cria o jogo**  
   - Rota: `/admin/pre-estreia/novo` → POST `/api/admin/pre-sale-games`.  
   - Dados: título, preços (clube A e B), limite de telas por clube, categoria especial (scope CLUB), opcionalmente times mandante/visitante.  
   - Status inicial: PRE_SALE; ainda **sem slots** (sem códigos).

2. **Admin gera os códigos dos dois clubes**  
   - Na tela do jogo: “Gerar códigos” → POST `/api/admin/pre-sale-games/[id]/generate-codes`.  
   - Cria ou atualiza 2 `PreSaleClubSlot` (slotIndex 1 e 2), cada um com um `clubCode` único (8 caracteres).  
   - Admin entrega **um código para cada time** (ex.: time da casa = código do slot 1, visitante = slot 2).

3. **Time acessa o checkout com o código**  
   - URL: `/pre-estreia/[id]/checkout` (id do PreSaleGame).  
   - O responsável informa: **código do clube**, nome do responsável, e-mail, nome do clube, quantidade de membros (telas), aceite dos termos.  
   - Front chama POST `/api/pre-sale/checkout` com esses dados.

4. **Checkout valida e gera PIX (Woovi)**  
   - `POST /api/pre-sale/checkout`:  
     - Busca o slot pelo `clubCode`; exige `paymentStatus === 'PENDING'`.  
     - Valida `teamMemberCount` ≤ `maxSimultaneousPerClub`.  
     - Preço = `clubAPrice` ou `clubBPrice` conforme `slotIndex`.  
     - Cria cobrança Woovi com `externalId`: `presale-{slotId}`.  
     - Atualiza o slot com responsável, e-mail, clube, `teamMemberCount`, `paymentReference` (id da cobrança).  
   - Resposta: QR Code PIX para o responsável pagar.

5. **Pagamento confirmado (webhook Woovi)**  
   - `POST /api/webhooks/woovi`: quando o pagamento é confirmado, identifica `presale-{slotId}` no `correlationId`.  
   - Chama `markSlotAsPaid(slotId, WOOVI, reference)` → slot vira PAID, `paidAt` preenchido.  
   - Em seguida chama `recalculatePreSaleGameStatus(preSaleGameId)` → se os 2 slots estiverem PAID, status do jogo vira FUNDED; se já tiver `videoUrl`, PUBLISHED.  
   - Chama `createClubViewerAccountForSlot(slotId)` (fire-and-forget) → cria conta `club_viewer` e envia e-mail com **usuário e senha** para o responsável (e opcionalmente para o e-mail admin de credenciais).

6. **Time assiste**  
   - Página `/pre-estreia/assistir/[slug]`:  
     - Quem tem assinatura full access (ou admin) assiste direto.  
     - Quem não tem usa o bloco “Sou do clube”: **usuário e senha** recebidos por e-mail (conta `club_viewer`).  
   - POST `/api/pre-sale/start-session` devolve `sessionToken` para o player; heartbeat renova a sessão; limite de telas por clube é aplicado via `ClubStreamSession` e `maxSimultaneousPerClub`.

**Resumo:** o time “se promove” **pagando o slot** no checkout; após o PIX confirmado, o slot fica PAID, o jogo pode virar FUNDED/PUBLISHED, e o clube recebe credenciais para assistir.

---

## 4. Onde a lógica está no código

| O quê | Onde |
|-------|------|
| Criar jogo pré-estreia (admin) | `src/app/admin/(dashboard)/pre-estreia/novo/page.tsx` → POST `src/app/api/admin/pre-sale-games/route.ts` |
| Gerar códigos dos 2 clubes | `src/app/api/admin/pre-sale-games/[id]/generate-codes/route.ts` |
| Listar jogos (admin Clubes) | `src/app/admin/(dashboard)/pre-estreia/page.tsx` → GET `/api/admin/pre-sale-games`; **filtro** `metaEnabled !== true` (só Clubes). |
| Checkout (time paga com código) | `src/app/pre-estreia/[id]/checkout/page.tsx` → POST `src/app/api/pre-sale/checkout/route.ts` (Woovi) |
| Marcar slot como pago + recalcular status | `src/services/pre-sale-slot.service.ts` (`markSlotAsPaid`) → `src/services/pre-sale-status.service.ts` (`recalculatePreSaleGameStatus`) |
| Webhook Woovi (pagamento presale) | `src/app/api/webhooks/woovi/route.ts` → `markSlotAsPaid` + `createClubViewerAccountForSlot` |
| Criar conta clube e enviar credenciais | `src/services/club-viewer.service.ts` (`createClubViewerAccountForSlot`) |
| Assistir (player + sessão clube) | `src/app/pre-estreia/assistir/[slug]/page.tsx`; `src/app/api/pre-sale/start-session/route.ts`; `src/app/api/video/stream-playback/route.ts` (valida sessão/token) |
| Status do jogo (PRE_SALE / FUNDED / PUBLISHED) | `src/services/pre-sale-status.service.ts`: Clubes = 2 slots PAID → FUNDED; FUNDED + videoUrl → PUBLISHED. Meta = meta de assinantes batida. |

---

## 5. Pontos importantes

- **Um jogo, dois slots:** cada jogo de pré-estreia Clubes tem exatamente 2 slots (time A e time B). Os dois precisam estar PAID para o jogo ficar FUNDED.  
- **Código único por slot:** o `clubCode` é gerado no “Gerar códigos” e identifica o slot; no checkout o time informa esse código para pagar **o seu** slot.  
- **Pagamento hoje:** apenas **Woovi** (PIX) está integrado no checkout de pré-estreia; webhook Woovi chama `markSlotAsPaid` e `createClubViewerAccountForSlot`.  
- **Credenciais:** enviadas por e-mail (template PRE_SALE_CREDENTIALS) ao responsável do slot e, se configurado, ao e-mail admin (SiteSettings.adminCredentialsEmail).  
- **Limite de telas:** `maxSimultaneousPerClub` no jogo; aplicado via sessões de streaming (`ClubStreamSession`) e heartbeat na página de assistir.  
- **Separação Clubes vs Meta:** lista admin Clubes filtra `metaEnabled !== true`; lista Meta filtra `metaEnabled === true`. Home pública: blocos separados (Clubes vs Meta).  
- **Pré-estreia Meta:** não há slots nem checkout de clube; “promoção” é bater meta de assinantes (contagem por `favoriteTeamId` + Subscription ativa); status recalculado em `recalculatePreSaleGameStatus` quando `metaEnabled` é true.

---

## 6. Resumo em uma frase

**No modelo “times se promovem”, o admin cria um jogo de pré-estreia Clubes, gera dois códigos (um por time); cada time entra no checkout com seu código, paga via PIX (Woovi); ao confirmar o pagamento, o slot fica pago, o jogo pode virar financiado/publicado e o clube recebe usuário e senha para assistir à pré-estreia.**
