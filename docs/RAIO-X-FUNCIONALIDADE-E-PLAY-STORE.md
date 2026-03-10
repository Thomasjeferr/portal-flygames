# Raio-X: funcionalidade e varredura para versão Play Store

**Data:** 26/02/2026  
**Objetivo:** Verificar falhas de funcionalidade e pontos críticos antes de publicar na Play Store.

---

## Parte 1 — Funcionalidade (geral)

### 1.1 Limite de telas (jogos)

| Item | Status |
|------|--------|
| Página do jogo não preenche URLs no servidor quando há limite | ✅ |
| API `stream-playback` exige `deviceId` para jogo e aplica limite | ✅ |
| API `games/[gameId]` retorna `streamPlaybackRequired`, não devolve URL assinada | ✅ |
| VideoPlayer chama API com `gameSlug` + `deviceId` e exibe erro 403 | ✅ |
| App (WebView com ?app=1) usa o mesmo fluxo | ✅ |

### 1.2 Planos (assinatura / grade)

| Item | Status |
|------|--------|
| Apenas planos ativos aparecem em `/planos` e no checkout | ✅ (fallback removido) |
| Editar plano: limpar "Telas simultâneas" salva como null | ✅ |
| Listagem de planos no admin mostra "X telas simultâneas" quando preenchido | ✅ |

### 1.3 Pré-estreia (auto-financiamento)

| Item | Status |
|------|--------|
| Checkout: "Quantidade de membros" limitada a `maxSimultaneousPerClub` | ✅ |
| Mensagem de excedente e botão desabilitado quando excede | ✅ |
| API de checkout rejeita `teamMemberCount` > limite | ✅ |

### 1.4 Admin e APIs

| Item | Status |
|------|--------|
| Feedback "Telas salvas com sucesso" ao salvar telas no usuário | ✅ |
| Rotas críticas (auth, checkout, planos, stream-playback) com tratamento de erro | ✅ (try/catch e mensagens) |

**Resumo funcionalidade:** Nenhuma falha crítica encontrada nos fluxos revisados. Comportamento alinhado à documentação e aos ajustes recentes.

---

## Parte 2 — Varredura para Play Store (modo ?app=1)

O app abre com **`https://flygames.app/?app=1`** (definido em `capacitor.config.ts`). O site detecta `?app=1` e grava em `sessionStorage`; assim, no modo "app lojas" não devem aparecer planos, preços, cadastro nem checkout no app.

### 2.1 O que está coberto ✅

| Área | Comportamento no app (?app=1) |
|------|------------------------------|
| **Header** | Sem link "Planos", sem "Cadastrar", sem "Instalar app"; "Assinatura" vira "Acesso ativo/inativo" |
| **Footer** | Sem "Planos", "Seja Patrocinador", "Programa de parceiros"; sem coluna "Formas de pagamento" (Stripe/Woovi) |
| **/planos** | Redireciona para home (`StoreAppRedirectToHome`) |
| **/cadastro** | Redireciona para home |
| **/checkout** | Redireciona para home |
| **Login (/entrar)** | Textos adaptados (sem CTAs de criar conta/planos quando isStoreApp) |
| **Jogo sem acesso** | `StoreAppNoAccessMessage`: mensagem genérica, sem botões "Assinar"/"Ver planos" |
| **Manutenção** | Quem acessa com ?app=1 não cai na tela de manutenção |
| **URL padrão do app** | `capacitor.config.ts` usa `?app=1` por padrão |

### 2.2 Lacuna identificada e correção ✅

| Página | Status |
|--------|--------|
| **/patrocinar** | ✅ **Corrigido:** uso de `StoreAppGate`; no app (?app=1) redireciona para home. |
| **/patrocinar/comprar** | ✅ **Corrigido:** checagem `useStoreApp` + `StoreAppRedirectToHome`; no app redireciona para home. |
| **/pre-estreia/[id]/checkout** | ⚠️ Opcional: ainda acessível por URL no app. Se quiser "zero compras no app", adicionar o mesmo redirecionamento. |

### 2.3 Checklist documentado (APP-LOJAS-LOGIN-ASSISTIR.md)

- [x] App abre em `https://flygames.app/?app=1`
- [x] Tela de login sem "Criar conta" e sem link para planos (no app)
- [x] Menu e footer sem "Planos", "Assinar", preços
- [x] Quem tem conta consegue logar e assistir
- [x] **Patrocinar e Patrocinar compra:** redirecionam para home quando acessados no app (?app=1)
- [ ] **Política de privacidade:** acessível por link no footer (Legal); conferir se o link abre corretamente no WebView

### 2.4 Build para a Play Store

- **Variável:** `CAPACITOR_SERVER_URL=https://flygames.app/?app=1` (já é o padrão no `capacitor.config.ts`).
- Ao gerar o AAB/APK para enviar à loja, **não** sobrescrever com URL sem `?app=1`, para manter o modo "só login + assistir".
- Screenshots e descrições: ver `docs/LOJA-PLAYSTORE-IOS-SCREENSHOTS.md` e `assets/playstore-descricao-curta.txt` (descrição curta até 80 caracteres).

### 2.5 Política de privacidade e termos

- Links no footer: Política de privacidade, Termos de uso, Contato, etc. Devem abrir no mesmo WebView; conferir se não há bloqueio em links externos se estiverem em outro domínio.
- Na ficha da Play Console, é obrigatório informar URL da política de privacidade (ex.: `https://flygames.app/politica-de-privacidade`).

---

## Parte 3 — Resumo executivo

| Tipo | Situação |
|------|----------|
| **Funcionalidade** | Sem falhas críticas nos fluxos de limite de telas, planos ativos, pré-estreia (membros/telas) e admin. |
| **Play Store (?app=1)** | Cobertura completa: planos, cadastro, checkout, **patrocinar** e **patrocinar/comprar** redirecionam para home. Opcional: /pre-estreia/[id]/checkout. |
| **Build** | URL padrão com ?app=1; AAB de release assinado para envio. |

**Próximo passo sugerido (opcional):** Se quiser esconder também o checkout de pré-estreia no app, adicionar redirecionamento em **/pre-estreia/[id]/checkout** quando `isStoreApp`.
