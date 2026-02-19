# Configurar e-mails no Portal (Resend + Admin)

O envio de e-mails usa **Resend** e as configurações (remetente, URL base, templates) ficam no **admin do portal**. O “render” é a substituição de variáveis `{{var}}` nos templates.

---

## 1. Resend (envio real)

1. Crie uma conta em **https://resend.com** (ou use a existente).
2. Em **API Keys**, crie uma chave (ex.: “Portal Fly Games”).
3. Copie a chave (começa com `re_...`).
4. No **Vercel** (projeto do portal):
   - **Settings** → **Environment Variables**
   - Nome: `RESEND_API_KEY`
   - Valor: `re_xxxxxxxxxxxx` (sua chave)
   - Ambiente: Production (e Preview se quiser testar).
5. **Domínio no Resend** (para não enviar como “onboarding@resend.dev”):
   - Em **Domains**, adicione o domínio que você usa (ex.: `flygames.app`).
   - Siga as instruções para adicionar os registros DNS (SPF, DKIM, etc.).
   - Depois de verificado, use um e-mail desse domínio em “E-mail do remetente” no admin (ex.: `no-reply@flygames.app`).

Sem `RESEND_API_KEY` configurada, os e-mails não são enviados (só ficam logados como falha).

---

## 2. Admin do portal – Configurações de e-mail

No painel: **Admin** → **E-mails** → **Configurações**.

| Campo | Uso |
|-------|-----|
| **Nome do remetente** | Nome que aparece no “De” (ex.: Fly Games). |
| **E-mail do remetente** | Deve ser um e-mail do domínio verificado no Resend (ex.: `no-reply@flygames.app`). |
| **Reply-To** | Opcional; e-mail para onde vão as respostas. |
| **Cor da marca (hex)** | Usada nos botões/links dos templates (ex.: `#22c55e`). |
| **URL do logo** | Opcional; URL da imagem do logo nos e-mails. |
| **E-mail de suporte** | Usado em `{{support_url}}` e links de “fale conosco”. |
| **URL WhatsApp** | Opcional; link do WhatsApp. |
| **Texto do rodapé** | Substitui `{{footer_text}}` nos templates. |
| **URL base do app** | Base do site (ex.: `https://flygames.app`). Usado em links de login, reset de senha, etc. |

Salve e use **“Enviar e-mail de teste”** para validar.

---

## 3. “Render” dos templates (variáveis `{{var}}`)

Os templates de e-mail são HTML com placeholders no formato **`{{nome_da_var}}`**. Na hora do envio, o sistema substitui cada um pelo valor correto (isso é o “render” dos e-mails).

### Variáveis especiais (não escapadas para HTML)

Podem ser URLs; use com cuidado (só com valores controlados pelo sistema):

- `action_url`, `verify_url`, `reset_url`, `login_url`, `support_url`

### Variáveis comuns (escapadas para evitar XSS)

Qualquer outra variável (ex.: `name`, `code`, `plan_name`) é escapada antes de colocar no HTML.

### Variáveis que vêm das Configurações

- **`{{brand_color}}`** – cor da marca (hex).
- **`{{footer_text}}`** – texto do rodapé.
- **`{{support_url}}`** – link de suporte (e-mail ou URL base).

### Exemplos por tipo de template

| Template | Variáveis típicas |
|----------|-------------------|
| **VERIFY_EMAIL** | `name`, `code`, `expires_in` |
| **RESET_PASSWORD** | `name`, `reset_url`, `expires_in` |
| **WELCOME** | `name`, `login_url` |
| **PURCHASE_CONFIRMATION** | `name`, `plan_name`, `amount` |
| **SPONSOR_CONFIRMATION** | `company_name`, `plan_name`, `amount` |
| **PASSWORD_CHANGED** | `name`, `support_url` |
| **PRE_SALE_CREDENTIALS** | (variáveis do clube/credenciais) |

Nos templates do admin (**E-mails** → **Templates**), você pode editar o **assunto** e o **corpo HTML** e usar qualquer uma dessas variáveis com `{{var}}`. O “render” troca cada `{{var}}` pelo valor no momento do envio.

---

## 4. Resumo rápido

1. **Resend**: criar API Key, colocar em `RESEND_API_KEY` na Vercel; verificar domínio e usar esse domínio no “E-mail do remetente”.
2. **Admin** → **Configurações de E-mail**: preencher remetente, URL base do app, suporte, rodapé, etc.
3. **Render**: nos templates, usar `{{nome}}`, `{{code}}`, `{{reset_url}}`, etc.; o sistema substitui automaticamente ao enviar.

Se quiser, na próxima a gente pode ajustar um template específico ou as variáveis de um fluxo (ex.: só verificação de e-mail ou só recuperação de senha).
