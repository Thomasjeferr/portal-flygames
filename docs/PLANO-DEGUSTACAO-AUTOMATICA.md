# Plano: automatizar ativação do plano degustação (7 dias)

## Objetivo

Conceder **automaticamente** 7 dias de degustação (máx. **2 telas**) quando o usuário **verificar o e-mail pela primeira vez**, sem o admin precisar ativar manualmente. Incluir regras para **reduzir abuso** e um **interruptor** para desligar a degustação automática quando vocês decidirem não oferecer mais trial.

---

## Controle “ligar/desligar” (recomendado)

Como a degustação automática será usada **só por um período** e depois vocês pretendem **não dar mais degustação**, o ideal é implementar um **único interruptor**:

### Opção A – Variável de ambiente (mais simples)

- Criar `AUTO_TRIAL_ENABLED=true` no `.env` / Vercel.
- Na lógica: só chamar `grantTrialIfEligible` se `process.env.AUTO_TRIAL_ENABLED === 'true'`.
- **Para desligar:** alterar no painel da Vercel (ou no `.env`) para `false` e fazer **redeploy** (ou apenas novo deploy). Nenhuma alteração de código.
- **Prós:** zero migration, zero tela. **Contras:** precisa redeploy para desligar.

### Opção B – Banco (SiteSettings) – recomendado

- Adicionar em `SiteSettings` o campo `autoTrialEnabled Boolean @default(false)` (migration).
- Na lógica: ler `SiteSettings` (ou um getter em cache) e só conceder trial automático se `autoTrialEnabled === true`.
- **Para desligar:** atualizar no banco (uma vez) `autoTrialEnabled = false`. Pode ser por uma tela no admin “Configurações” ou direto no Prisma Studio / SQL. **Não precisa redeploy.**
- **Prós:** desligar a qualquer momento sem novo deploy; pode expor um switch no admin. **Contras:** uma migration e, se quiser, uma tela (opcional).

**Recomendação:** **Opção B (SiteSettings)**. Quando decidirem acabar com a degustação, basta desligar no admin ou no banco; o resto do código continua igual (ativação manual pelo admin continua disponível).

---

## Parâmetros fixos do trial automático

- **Duração:** 7 dias (como hoje).
- **Máximo de telas:** 2 (`maxConcurrentStreams: 2` na `Subscription`).
- **Momento:** só após verificação do e-mail (código de 6 dígitos válido).
- **Elegibilidade:** 1 trial por e-mail (uma vez na vida); máx. 2 trials por IP a cada 30 dias.

---

## Situação atual

| Onde | O que acontece |
|------|----------------|
| **Cadastro** (`POST /api/auth/register`) | Cria usuário, envia código de verificação. **Não** cria assinatura. |
| **Verificar e-mail** (`POST /api/auth/verify-email`) | Marca `emailVerified: true`, envia WELCOME, cria sessão. **Não** cria assinatura. |
| **Admin** (usuários → [id] → Gerenciar) | Admin escolhe "7 dias (degustação)" e clica "Ativar assinatura" → `POST /api/subscription/activate`. Aí sim a `Subscription` é criada/atualizada. |

Ou seja: a degustação hoje é **só manual** (admin). O plano é torná-la **automática na primeira verificação de e-mail**, com proteções contra abuso.

---

## Momento da ativação automática

**Recomendação:** ativar a degustação **apenas após a verificação do e-mail** (não no cadastro).

- **Vantagem:** quem ganha o trial precisa ter acesso real ao e-mail (reduz contas falsas).
- **Onde implementar:** em `src/app/api/auth/verify-email/route.ts`, **depois** de:
  - dar `emailVerified: true` no usuário e marcar o token como usado (dentro da `$transaction` ou logo em seguida),
  - e **antes** (ou depois) de `sendWelcomeEmail(user)` e `createSession(user.id)`.

Fluxo proposto:

1. Usuário verifica o código → transaction atualiza `User` e `EmailToken`.
2. Chamar uma função **`grantTrialIfEligible(userId, ip)`** (nova).
3. Se a função conceder o trial → cria/atualiza `Subscription` (7 dias, `active: true`).
4. Segue o fluxo atual: `sendWelcomeEmail`, `createSession`, resposta com cookie.

Assim, na primeira vez que o usuário verifica o e-mail, ele já pode ter os 7 dias ativos sem o admin fazer nada.

---

## Regras de elegibilidade (anti-abuso)

Só conceder o trial automático se **todas** as condições abaixo forem verdadeiras.

### 1. Uma degustação por e-mail (uma vez na vida)

- **Regra:** se o usuário **já tiver** um registro de `Subscription` (ativo ou não), **não** conceder o trial automático.
- **Implementação:** antes de criar a `Subscription`, fazer `prisma.subscription.findUnique({ where: { userId } })`. Se existir, não conceder (e não criar outro).
- **Efeito:** cada e-mail ganha no máximo uma vez o trial automático. Quem já teve assinatura (paga ou degustação manual) não ganha de novo.

### 2. Limite por IP (ex.: 2 trials por IP a cada 30 dias)

- **Regra:** do mesmo IP, só permitir até **2** concessões de trial automático nos **últimos 30 dias**.
- **Implementação:** usar a tabela `RateLimit` com chave `trial_granted:ip:{ip}`:
  - Janela: 30 dias (`TRIAL_IP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000`).
  - Limite: 2 (`TRIAL_IP_MAX = 2`).
  - Ao **conceder** o trial, incrementar o contador para esse IP.
  - Ao **verificar** elegibilidade, checar se `count < 2` na janela atual.
- **Efeito:** evita a mesma pessoa criar muitas contas no mesmo lugar; 2 permite, por exemplo, duas pessoas na mesma casa.

Constantes e funções novas em `src/lib/email/rateLimit.ts` (ou em um módulo dedicado, ex.: `src/lib/trial.ts`):

- `checkTrialGrantedByIpLimit(ip: string): Promise<boolean>` → true se pode conceder (ainda não atingiu 2 no período).
- `incrementTrialGrantedByIp(ip: string): Promise<void>` → chamar após conceder o trial.

---

## Onde implementar (resumo)

| Item | Arquivo / local |
|------|------------------|
| Constantes e funções de limite por IP (trial) | `src/lib/email/rateLimit.ts` ou `src/lib/trial.ts` |
| Função `grantTrialIfEligible(userId, ip)` | Novo módulo `src/lib/trial.ts` (ou dentro de `src/lib/subscription.ts`) |
| Chamada a `grantTrialIfEligible` após verificação de e-mail | `src/app/api/auth/verify-email/route.ts` |
| Lógica da Subscription (7 dias, startDate, endDate) | Reutilizar a mesma lógica de `POST /api/subscription/activate` (sem envio de e-mail extra, pois o WELCOME já é enviado; opcional: enviar SUBSCRIPTION_ACTIVATED também para quem ganhou trial automático) |

---

## Detalhes da função `grantTrialIfEligible(userId, ip)`

Pseudocódigo:

0. **Interruptor (Opção B – SiteSettings):**  
   `settings = await prisma.siteSettings.findFirst()`  
   Se `!settings?.autoTrialEnabled` → return (não conceder).  
   *(Se usar Opção A, aqui seria `process.env.AUTO_TRIAL_ENABLED !== 'true'`.)*

1. **Elegibilidade por usuário:**  
   `existing = await prisma.subscription.findUnique({ where: { userId } })`  
   Se `existing != null` → return (não conceder).

2. **Elegibilidade por IP:**  
   `allowed = await checkTrialGrantedByIpLimit(ip)`  
   Se `!allowed` → return (não conceder).

3. **Conceder trial:**  
   - `startDate = new Date()`, `endDate = new Date()` + 7 dias.  
   - `maxConcurrentStreams: 2` (máx. 2 telas).  
   - `prisma.subscription.create({ data: { userId, active: true, startDate, endDate, maxConcurrentStreams: 2 } })`.  
   - `incrementTrialGrantedByIp(ip)`.

4. **(Opcional)** Enviar e-mail **SUBSCRIPTION_ACTIVATED** para o usuário (mesmo template usado quando o admin ativa), para informar que a degustação foi ativada e até quando vale. Se não quiser duplicar com o WELCOME, pode só confiar no WELCOME e não enviar outro e-mail.

---

## Efeito no produto

- **Novo usuário:** cadastra → recebe código → verifica e-mail → **ganha 7 dias de degustação automaticamente** (e continua recebendo WELCOME e sessão como hoje).
- **Quem já teve assinatura (ou já teve trial):** não ganha trial automático de novo.
- **Muitos cadastros no mesmo IP:** só os 2 primeiros trials concedidos nos últimos 30 dias por aquele IP; o terceiro não ganha trial automático (pode ganhar depois manualmente pelo admin, se for legítimo).

---

## O que não fazer (por enquanto)

- **Não** dar trial no cadastro (antes de verificar e-mail): facilita abuso com e-mails falsos.
- **Não** implementar fingerprint de dispositivo nesta fase: complexidade maior e ganho menor; deixar para uma segunda etapa se o abuso continuar.
- **Não** exigir CPF/cartão para o trial: manter como está; isso pode ser evoluído no futuro.

---

## Checklist de implementação

- [ ] **Interruptor:** Opção A – usar `AUTO_TRIAL_ENABLED` no código; ou Opção B – migration em `SiteSettings` (`autoTrialEnabled Boolean @default(false)`) e ler no `grantTrialIfEligible`. (Opcional: tela no admin para ligar/desligar.)
- [ ] Adicionar constantes e funções de limite por IP para trial em `rateLimit.ts` (ou `trial.ts`).
- [ ] Criar `grantTrialIfEligible(userId, ip)` que: verifica interruptor → Subscription existente → limite por IP → cria Subscription (7 dias, **maxConcurrentStreams: 2**) e incrementa contador do IP.
- [ ] Em `verify-email/route.ts`: obter IP da requisição, após a transaction de verificação chamar `grantTrialIfEligible(user.id, ip)` (e opcionalmente enviar SUBSCRIPTION_ACTIVATED).
- [ ] Testar: com interruptor ligado, novo usuário que verifica e-mail → ganha 7 dias e 2 telas; mesmo usuário não ganha de novo; terceiro cadastro no mesmo IP em 30 dias não ganha trial automático. Com interruptor desligado, ninguém ganha trial automático (ativação manual no admin continua igual).

Quando quiser que eu implemente esse plano no código, é só pedir.
