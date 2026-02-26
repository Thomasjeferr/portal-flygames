# Raio-X de Segurança — Portal Futvar / Fly Games

Relatório de análise de segurança do projeto (autenticação, autorização, APIs, dados sensíveis, pagamentos, uploads, rate limit, privacidade e recomendações).  
*Data da análise: fevereiro de 2025.*

---

## 1. Autenticação e sessão

### Pontos positivos
- **Senha:** bcrypt com custo 12 (`hashPassword` em `lib/auth.ts`).
- **Sessão:** token UUID único armazenado no banco (`Session`), consulta por cookie.
- **Cookie:** `httpOnly`, `secure` em produção, `sameSite: 'lax'`, `path: '/'`, validade 30 dias.
- **Expiração:** sessões expiradas são removidas ao validar; token não reutilizável após logout.
- **Login:** validação com Zod (email + senha), rate limit por IP (10 tentativas / 15 min) antes de verificar credenciais.
- **Resposta de login:** mensagem genérica (“E-mail ou senha incorretos”), sem revelar se o e-mail existe.

### Atenção
- **Admin via env:** primeiro admin pode ser criado/atualizado com `ADMIN_EMAIL` + `ADMIN_PASSWORD`. Em produção, se `ADMIN_PASSWORD` não estiver definido, o login com esse e-mail falha (proteção presente). Senha padrão `Admin@123` só é usada em dev. **Recomendação:** em produção, definir sempre `ADMIN_PASSWORD` forte e não depender da senha padrão.
- **Verificação de e-mail:** usuários não-admin precisam ter `emailVerified` para entrar; admin pode entrar sem verificação.

---

## 2. Autorização (APIs e rotas)

### Admin
- **Middleware:** protege apenas caminhos que começam com `/admin`: sem cookie de sessão redireciona para `/admin/entrar`. Não verifica se o usuário é admin (isso é feito nas APIs).
- **APIs `/api/admin/*`:** todas as rotas consultadas checam `getSession()` e `session.role === 'admin'`; em falha retornam 401 ou 403. Nenhuma rota admin foi encontrada sem essa checagem.
- **Painel do time:** uso de `lib/team-portal-auth.ts` (acesso por token de time ou por sessão como `TeamManager`). APIs em `api/team-portal/*` validam acesso ao time.
- **Parceiro:** uso de `lib/partnerAuth.ts`; APIs em `api/partner/*` exigem sessão e parceiro com `status: 'approved'`.

### Conteúdo e checkout
- **Streaming (vídeo):** `api/video/stream-playback` exige sessão e verifica acesso ao jogo (assinatura ou compra) antes de gerar URL assinada.
- **Checkout:** exige sessão; `club_viewer` não pode comprar (retorno 403).
- **Sync Woovi / status da compra:** exige sessão e que a compra pertença ao usuário (ou tratamento equivalente).

### Dados do usuário
- **GET /api/auth/me:** retorna apenas campos seguros (`select` sem `passwordHash`, `resetToken`, etc.).
- **GET /api/admin/users/[id]:** remove `passwordHash` antes de enviar (`const { passwordHash: _, ...safe } = user`).

---

## 3. Webhooks (pagamentos)

### Stripe
- **Verificação:** uso de `verifyStripeWebhook(payload, signature)` com `STRIPE_WEBHOOK_SECRET` antes de processar eventos. Assinatura inválida → 400.
- **Payload:** lido como `request.text()` para manter integridade da assinatura.

### Woovi
- **Verificação:** uso de `verifyWooviWebhookSignature(rawBody, signature, secret)`. Secret vem de `WOOVI_WEBHOOK_SECRET` ou do `PaymentConfig` no banco. Assinatura inválida → 401.
- **Configuração:** se não houver secret configurado, retorna 503 (webhook não configurado).

---

## 4. Dados sensíveis e variáveis de ambiente

### Expostos ao cliente
- Apenas `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (ou equivalente via API) são usados no front. Chaves secretas (Stripe, Woovi, Resend, Cloudflare, DB) não são expostas.
- **Payment config (admin):** GET da API de configuração de pagamento retorna chaves **mascaradas** (`maskValue`: últimos 4 caracteres); nunca envia secretas em claro para o front.

### Banco e env
- **.env:** está no `.gitignore`; `.env.example` não contém valores reais e avisa para não commitar `.env`.
- **PaymentConfig:** chaves podem ficar no banco (admin); acesso apenas por sessão admin. Cache em memória no servidor (`lib/payment-config.ts`).

### Tokens de e-mail
- Tokens de verificação e reset são armazenados como **hash** (`tokenHash`); tokens em claro só no e-mail. Expiração e uso único tratados em `lib/email/tokenUtils.ts` e nas rotas correspondentes.

---

## 5. Rate limiting

- **Login:** 10 tentativas / 15 min por IP.
- **Cadastro:** 5 / 1 h por IP.
- **Recuperar senha:** 5 / 1 h por IP e por e-mail.
- **Envio de código de verificação de e-mail:** 6 / 1 h por IP e 4 / 1 h por e-mail.
- **Submissão do código de verificação:** 20 / 15 min por IP.
- **Reset de senha (uso do token):** 10 / 1 h por IP.
- **Cadastro de parceiro (público):** 10 / 1 h por IP.
- **Checkout de patrocínio:** 15 / 1 h por IP.
- **Track-play (analytics):** 120 / 1 min por IP.

Implementação em `lib/email/rateLimit.ts` com tabela `RateLimit` no Prisma (key, count, windowStart). Uso consistente nas rotas de login, registro, forgot-password, verify-email, partner apply, sponsor-checkout e track-play.

---

## 6. Validação de entrada e injeção

- **APIs:** uso de **Zod** em várias rotas (login, register, checkout, admin: planos, categorias, times, banners, payment-config, etc.), limitando formato e tipo dos dados.
- **Prisma:** queries parametrizadas; não há concatenação de SQL bruto, o que mitiga SQL injection.
- **Upload (admin):** em `api/admin/upload`: apenas admin; tamanho máximo 5 MB; extensão permitida por allowlist (jpg, png, gif, webp, svg); verificação de “magic bytes” do conteúdo; nome do arquivo gerado no servidor (timestamp + aleatório), sem uso direto do nome enviado pelo cliente. Em produção usa Vercel Blob.

Outros uploads (avatar, team-crest, member-photo, sponsor-logo) seguem padrão semelhante (tamanho, tipo, Blob em prod).

---

## 7. XSS e conteúdo HTML

- **Templates de e-mail (preview no admin):** uso de **DOMPurify** (`isomorphic-dompurify`) ao renderizar HTML no preview, com allowlist de tags e atributos.
- **Banners (admin):** schemas e função `sanitize` em `api/admin/home-banners` para dados de criação/atualização.
- Não foi encontrado uso de `dangerouslySetInnerHTML` sem sanitização em pontos críticos.

---

## 8. Privacidade e analytics

- **VisitLog / geolocalização:** IP é armazenado como **hash** (SHA-256 com salt `GEO_SALT` ou padrão) em `geolocationService.ts`; `VisitLog` usa `ipHash`. Salt configurável por env.
- **IpGeoCache:** chave por `ipHash`; não armazena IP em claro.

---

## 9. Resumo por categoria

| Área                 | Status   | Observação |
|----------------------|----------|------------|
| Autenticação         | Bom      | bcrypt 12, sessão em DB, cookie seguro, rate limit no login. |
| Autorização (admin)  | Bom      | Todas as rotas admin checam sessão + role admin. |
| Autorização (time/parceiro) | Bom | Token/sessão e checagem de vínculo (time ou parceiro aprovado). |
| Webhooks Stripe/Woovi| Bom      | Assinatura verificada antes de processar. |
| Secrets / env        | Bom      | Apenas NEXT_PUBLIC_* no cliente; payment config mascarado no GET. |
| Rate limiting        | Bom      | Login, registro, forgot, verify-email, partner, sponsor-checkout, track-play. |
| Validação de entrada | Bom      | Zod em rotas críticas; Prisma parametrizado. |
| Upload               | Bom      | Admin-only, tamanho, tipo e magic bytes; nome seguro. |
| XSS                  | Razoável | DOMPurify em preview de e-mail; sanitize em banners. |
| Privacidade (IP)     | Bom      | IP hasheado em analytics/geolocalização. |

---

## 10. Recomendações prioritárias

1. **Produção:** Sempre definir `ADMIN_PASSWORD` (e opcionalmente `ADMIN_EMAIL`) em produção e evitar uso da senha padrão.
2. **GEO_SALT:** Em produção usar um valor aleatório e único para `GEO_SALT`, não o padrão do exemplo.
3. **CSP (Content-Security-Policy):** Adicionar headers de segurança (CSP, X-Frame-Options, etc.) no Next.js (config ou middleware) para reforçar mitigação de XSS e clickjacking.
4. **Auditoria de dependências:** Rodar `npm audit` (e corrigir vulnerabilidades críticas/altas) e manter dependências atualizadas.
5. **HTTPS:** Garantir que em produção todo o tráfego seja HTTPS (Vercel já faz; cookie `secure` está correto).
6. **Logs:** Evitar logar payloads completos de webhook ou dados de pagamento; manter apenas identificadores e status quando necessário para suporte.
7. **Sessões:** Considerar invalidar todas as sessões do usuário ao trocar senha (além da atual) e, se aplicável, após “sair de todos os dispositivos”.

---

## 11. Conclusão

O projeto aplica boas práticas em autenticação (bcrypt, sessão em DB, cookie seguro), autorização (checagem consistente de sessão e papel nas APIs admin, time e parceiro), verificação de webhooks de pagamento, rate limiting em fluxos sensíveis, validação de entrada com Zod, upload com restrições e verificação de tipo, e privacidade de IP (hash com salt). Os principais pontos de melhoria são: reforço de headers de segurança (CSP etc.), uso de `ADMIN_PASSWORD` e `GEO_SALT` fortes em produção, e auditoria periódica de dependências.
