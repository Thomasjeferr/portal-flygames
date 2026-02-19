# Configurar e-mails no Portal (Resend + Admin)

O envio de e-mails usa **Resend** e as configurações (remetente, URL base, templates) ficam no **admin do portal**. O “render” é a substituição de variáveis `{{var}}` nos templates.

---

## 1. Passo a passo no Resend (e-mails automáticos)

### 1.1 Criar conta e acessar o dashboard

1. Acesse **https://resend.com** e clique em **Sign up** (ou **Log in** se já tiver conta).
2. Crie a conta com e-mail ou Google/GitHub.
3. No dashboard, use o menu lateral: **API Keys** e **Domains**.

---

### 1.2 Criar API Key

1. No menu, vá em **API Keys**.
2. Clique em **Create API Key**.
3. Dê um nome (ex.: `Portal Fly Games`).
4. Escolha permissão **Sending access** (envio).
5. Clique em **Add**.
6. **Copie a chave** (começa com `re_...`) e guarde em lugar seguro — ela só aparece uma vez.

---

### 1.3 Colocar a API Key na Vercel

1. Abra o projeto do portal na **Vercel**.
2. **Settings** → **Environment Variables**.
3. **Add New**:
   - **Name:** `RESEND_API_KEY`
   - **Value:** a chave que você copiou (ex.: `re_xxxxxxxxxxxx`)
   - **Environments:** marque **Production** (e **Preview** se quiser testar em deploy de branch).
4. Salve e faça um **Redeploy** do projeto para a variável valer.

---

### 1.4 Adicionar e verificar o domínio (flygames.app)

Para enviar como `no-reply@flygames.app` (em vez de `onboarding@resend.dev`):

1. No Resend, vá em **Domains**.
2. Clique em **Add Domain**.
3. Digite o domínio: **`flygames.app`** (sem `https://` nem `www`).
4. Clique em **Add**.

O Resend vai mostrar **2 registros DNS** para você criar no seu provedor de domínio (ex.: Vercel Domains, Cloudflare, Registro.br, GoDaddy, etc.):

| Tipo | Nome / Host | Valor (exemplo – use o que o Resend mostrar) |
|------|-------------|------------------------------------------------|
| **TXT** (SPF) | `send` ou `send.flygames.app` | Algo como `v=spf1 include:amazonses.com ~all` |
| **TXT** (DKIM) | nome que o Resend indicar | Uma string longa (chave pública DKIM) |

**Onde configurar o DNS:**

- Se o domínio está na **Vercel**: **Storage** → **Domains** → clique no domínio → **Records** (ou **Configure**).
- Se está em outro provedor: painel do provedor → **DNS** / **Zone** / **Registros** do domínio `flygames.app`.

**O que fazer:**

5. No painel DNS do **flygames.app**, crie os dois registros **exatamente** como o Resend mostrar (tipo TXT, nome/host e valor).
6. Salve e aguarde a propagação (de alguns minutos a até 24–48 h).
7. No Resend, em **Domains**, clique em **Verify** no domínio `flygames.app`.
8. Quando aparecer **Verified**, você já pode usar e-mails como `no-reply@flygames.app` e `contato@flygames.app`.

---

### 1.5 Conferir no admin do portal

1. Acesse o portal como admin: **https://flygames.app/admin** (ou sua URL).
2. Vá em **E-mails** → **Configurações**.
3. Preencha:
   - **E-mail do remetente:** `no-reply@flygames.app` (ou outro do domínio verificado).
   - **URL base do app:** `https://flygames.app`
   - **E-mail de suporte:** ex.: `contato@flygames.app`
4. Clique em **Salvar**.
5. Na seção **Enviar e-mail de teste**, digite seu e-mail e clique em **Enviar teste**. Se chegar na caixa de entrada, está tudo certo.

---

### Resumo Resend

| Passo | Onde | Ação |
|------|------|------|
| 1 | resend.com | Criar conta / login |
| 2 | Resend → API Keys | Criar API Key e copiar |
| 3 | Vercel → Settings → Env Vars | Adicionar `RESEND_API_KEY` e redeploy |
| 4 | Resend → Domains | Add Domain `flygames.app` |
| 5 | DNS do flygames.app | Criar registros TXT (SPF + DKIM) que o Resend mostrar |
| 6 | Resend → Domains | Clicar em Verify |
| 7 | Portal → Admin → E-mails → Configurações | Remetente `no-reply@flygames.app`, URL base, teste |

Sem `RESEND_API_KEY` configurada na Vercel, os e-mails não são enviados (só ficam logados como falha). Sem domínio verificado, o Resend pode bloquear envio ou usar só o domínio de teste deles.

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
