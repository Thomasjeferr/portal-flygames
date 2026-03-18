# Revisão: templates de e-mails automáticos

Análise dos e-mails transacionais e avisos automáticos do Fly Games — alinhamento de qualidade, harmonia visual e consistência.

---

## 1. Fontes analisadas

- **Templates na tabela `EmailTemplate`** (seed `prisma/seed-emails.ts`): WELCOME, VERIFY_EMAIL, RESET_PASSWORD, PASSWORD_CHANGED, PURCHASE_CONFIRMATION, SPONSOR_CONFIRMATION, LIVE_PURCHASE_CONFIRMATION, PRE_SALE_CREDENTIALS, PRE_SALE_CREDENTIALS_NEW_PASSWORD, SUMULA_* (5), TOURNAMENT_INSCRICAO_REGULAMENTO, LIVE_SCHEDULED, LIVE_STARTED, LIVE_CANCELLED, GAME_PUBLISHED, SUBSCRIPTION_ACTIVATED.
- **E-mails montados no código** (sem template): notificações admin (`adminNotify.ts`), time aprovado/rejeitado, cadastro de parceiro recebido/aprovado, cadastro de time recebido.

---

## 2. O que está bom

- **Largura e tipografia:** Quase todos usam `max-width: 560px`, `font-family: sans-serif` e texto legível.
- **Rodapé:** Nos templates, `{{footer_text}}` em `font-size: 12px; color: #6b7280` está padronizado.
- **Variáveis de marca:** Uso de `{{brand_color}}` na maior parte dos CTAs dos templates.
- **VERIFY_EMAIL:** Caixa do código (fundo cinza, letter-spacing, centralizado) está clara e adequada.
- **Templates “novos” (LIVE_*, GAME_PUBLISHED, SUBSCRIPTION_ACTIVATED):** Blocos com borda colorida, box-shadow, hierarquia (h2 + parágrafos), tom mais cuidado.

---

## 3. Inconsistências e pontos a melhorar

### 3.1 Cor do texto do botão (contraste)

- **WELCOME e RESET_PASSWORD:** botão com `color:#fff!important` (branco no verde) — bom contraste.
- **SUMULA_*, TOURNAMENT_*:** botão com `color:#0C1222!important` (texto escuro no verde).
- **Risco:** Em alguns clientes de e-mail, verde (#22c55e) com texto escuro pode prejudicar leitura. Recomendação: padronizar **texto branco** nos botões principais (como em WELCOME/RESET_PASSWORD) para garantir contraste e acessibilidade.

### 3.2 Dois “níveis” visuais nos templates

- **Nível 1 (mais simples):** WELCOME, VERIFY_EMAIL, RESET_PASSWORD, PASSWORD_CHANGED, PURCHASE_CONFIRMATION, SPONSOR_CONFIRMATION, LIVE_PURCHASE_CONFIRMATION, PRE_SALE_* — fundo cinza + card branco, pouco ou nenhum box-shadow, sem blocos com borda colorida.
- **Nível 2 (mais elaborado):** LIVE_SCHEDULED, LIVE_STARTED, LIVE_CANCELLED, GAME_PUBLISHED, SUBSCRIPTION_ACTIVATED — `box-shadow`, blocos com `border-left` colorido, emojis (👋, 🔴, ⚽, 📺).
- **Efeito:** Quem recebe boas-vindas ou confirmação de compra vê um e-mail mais “seco”; quem recebe “live programada” ou “assinatura ativada” vê um e-mail mais “rico”. Para harmonia, vale **ou** enxugar o nível 2 **ou** levar elementos do nível 2 (sombra leve, um bloco de destaque) para os principais do nível 1 (ex.: WELCOME, PURCHASE_CONFIRMATION).

### 3.3 Cores fixas em vez de marca (PRE_SALE_*)

- PRE_SALE_CREDENTIALS e PRE_SALE_CREDENTIALS_NEW_PASSWORD usam `#22c55e` e `#f59e0b` fixos nos blocos de aviso.
- **Sugestão:** Usar `{{brand_color}}` no bloco verde; o amarelo de alerta pode permanecer fixo ou vir de uma variável de “cor de aviso” se no futuro houver configuração por marca.

### 3.4 E-mails “fora do template” (sendEmailToMany)

Todos estes usam apenas um `<div style="font-family:sans-serif; max-width:560px; margin:0 auto;">` **sem**:

- fundo cinza no `body` (`background: #f4f4f5`);
- card branco com `padding` e `border-radius`;
- rodapé padronizado (só adminNotify tem uma linha de rodapé genérica).

**Arquivos afetados:**

- `src/lib/email/adminNotify.ts` — notificações para admin (novo usuário, compra, patrocínio, pré-estreia, time, parceiro).
- `src/app/api/admin/teams/[id]/approve/route.ts` — “Seu time foi aprovado”.
- `src/app/api/admin/teams/[id]/reject/route.ts` — “Cadastro de time não aprovado”.
- `src/app/api/public/partners/apply/route.ts` — “Recebemos seu cadastro de parceiro”.
- `src/app/api/admin/partners/[id]/status/route.ts` — “Parceria aprovada”.
- `src/app/api/team-portal/teams/route.ts` — “Cadastro do time recebido”.

**Recomendação:** Para ficarem alinhados aos templates, esses HTMLs deveriam usar a mesma “casca”: `body` com fundo cinza + div interna branca (padding 32px, border-radius 12px) + rodapé em cinza pequeno. O botão de CTA (quando houver) pode usar `#22c55e` e texto branco.

### 3.5 TOURNAMENT_INSCRICAO_REGULAMENTO

- Botão “Acessar painel do time” está com `background:#64748b` (cinza) em vez de `{{brand_color}}`. Quebra a regra de “um CTA principal verde” usada no resto.

### 3.6 Identidade visual (logo / cabeçalho)

- Nenhum template usa logo ou linha de cabeçalho “Fly Games” no topo do card.
- **Sugestão:** Incluir opcionalmente uma linha de cabeçalho (texto “Fly Games” ou imagem pequena) e/ou variável `{{logo_url}}` nos templates para reforçar a marca e deixar todos mais harmônicos.

### 3.7 Lista de templates no admin

- A página **Admin → E-mails → Templates** usa `TEMPLATE_LABELS` em código: só têm label amigável os templates WELCOME, VERIFY_EMAIL, RESET_PASSWORD, etc. Templates como SUMULA_DISPONIVEL, LIVE_SCHEDULED, GAME_PUBLISHED, SUBSCRIPTION_ACTIVATED **não** estão nesse mapa — na lista podem aparecer só com a `key`. Vale **incluir todos os template keys** em `TEMPLATE_LABELS` (e em `TEMPLATE_VARS` quando houver variáveis) para edição e preview corretos no admin.

---

## 4. Resumo executivo

| Aspecto | Status | Ação sugerida |
|--------|--------|----------------|
| Largura e tipografia | OK | Manter |
| Rodapé nos templates | OK | Manter |
| Contraste do botão (texto branco vs escuro) | Inconsistente | Padronizar texto **branco** nos CTAs principais |
| Dois níveis visuais (simples vs rico) | Inconsistente | Unificar: ou enxugar os “ricos” ou enriquecer os principais (WELCOME, compras) |
| PRE_SALE cores fixas | Menor | Preferir `{{brand_color}}` onde fizer sentido |
| E-mails sendEmailToMany | Desalinhados | Usar mesma casca (body + card + rodapé) dos templates |
| TOURNAMENT botão cinza | Desalinhado | Trocar para `{{brand_color}}` no CTA principal |
| Logo/cabeçalho | Ausente | Opcional: adicionar cabeçalho “Fly Games” ou variável de logo |
| Lista admin (labels) | Incompleta | Incluir todos os template keys em TEMPLATE_LABELS (e TEMPLATE_VARS) |

---

## 5. Conclusão

Os templates da base (EmailTemplate) estão **razoavelmente alinhados** entre si (estrutura, largura, rodapé), mas há **duas famílias visuais** (simples vs rico) e **diferença de contraste nos botões**. Os e-mails enviados via **sendEmailToMany** (time, parceiro, notificações admin) ficam **visualmente mais pobres** e **desalinhados** em relação ao “card branco no fundo cinza” dos templates. Para ficarem **harmoniosos e no mesmo nível de qualidade**, o ideal é: (1) padronizar cor do texto dos botões; (2) unificar o nível visual dos templates; (3) aplicar a mesma casca (body + card + rodapé) nos e-mails montados em código; (4) completar labels (e variáveis) no admin; (5) opcionalmente adicionar cabeçalho/logo.

Se quiser, na próxima etapa podemos priorizar só contraste + casca dos sendEmailToMany ou desenhar um único “layout base” (HTML/CSS) para todos os e-mails e ir migrando template a template.
