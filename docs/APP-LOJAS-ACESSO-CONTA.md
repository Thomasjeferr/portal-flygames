# App lojas: quem só criou conta ou comprou um jogo

Complemento de **APP-LOJAS-LOGIN-ASSISTIR.md**. Responde: como fica o acesso quando o usuário só criou conta, ou comprou só um jogo, e não pode ter botão de assinar/patrocinar no app?

---

## O backend já controla tudo

Em **`src/lib/access.ts`** e nas APIs (stream-playback, games/[slug], live) já existe:

- **`hasFullAccess(userId)`** – assinatura ativa com acesso total OU patrocínio com acesso total.
- **`canAccessGame(userId, gameId)`** – acesso total OU comprou aquele jogo (Purchase pago e válido).
- **`canAccessLive(userId, live)`** – não exige nada OU tem assinatura OU comprou a live.

Ou seja: **quem só criou conta** não tem acesso a nenhum vídeo/live (APIs não devolvem URL). **Quem comprou um jogo** tem acesso só àquele jogo. Não precisamos criar regra nova no backend.

---

## O que cada tipo de usuário vê no app (modo loja)

| Tipo de usuário | Backend | No app (lojas) |
|-----------------|--------|-----------------|
| **Só criou conta** (não assinou, não comprou nada) | `hasFullAccess` = false; `canAccessGame` / `canAccessLive` = false para tudo. APIs não devolvem URL de vídeo. | Pode ver **listas** (destaques, jogos, lives). Ao **tentar assistir**: mensagem neutra tipo **"Conteúdo disponível para assinantes"** — **sem** botão "Ver planos" ou "Assinar". |
| **Comprou só um jogo** | `canAccessGame` = true só para esse jogo; os outros = false. API de stream só libera o jogo comprado. | Vê todos os jogos na lista. Ao abrir um que **não** comprou: mesma mensagem neutra, **sem** botão para assinar/comprar. No jogo que comprou: **assiste normal**. |
| **Assinante ou patrocínio com acesso** | `hasFullAccess` = true; pode assistir tudo. | Assistir tudo. Na **conta**: **não** mostrar "Assinar" ou "Renovar" (renovação só no site). |

---

## Regras na interface do app (modo loja)

1. **Nunca mostrar no app:** "Planos", "Assinar", "Patrocinar time", "Ver planos", "Comprar jogo", "Criar conta".
2. **Quando o usuário não tem acesso ao conteúdo:** mostrar só **texto** (ex.: "Conteúdo disponível para assinantes") **sem link e sem botão**. Não direcionar para o site para assinar.
3. **Quem tem acesso** (assinatura ou jogo comprado) continua usando as mesmas APIs; o backend já restringe por jogo/live.

Resumo: **acesso** (quem assiste o quê) já está resolvido no backend. No app das lojas a única mudança é **não mostrar nenhuma forma de assinar ou patrocinar** e trocar os botões "Ver planos" / "Assinar" por uma **mensagem neutra**, sem CTA.
