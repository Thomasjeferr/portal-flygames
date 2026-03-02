# E-mail automático: regulamento ao inscrever no campeonato

Objetivo: assim que o **responsável do time** envia a **inscrição** para um campeonato, enviar um **e-mail automático** com as **regras/regulamento** daquele campeonato.

---

## 1. Onde estão as regras hoje

- No **admin**, ao criar/editar campeonato, existem dois campos opcionais:
  - **URL do regulamento** (`regulamentoUrl`) – link externo (ex.: PDF no Google Drive).
  - **Texto do regulamento** (`regulamentoTexto`) – texto livre no banco.
- No **model** `Tournament` (Prisma): `regulamentoUrl` e `regulamentoTexto` (ambos opcionais).
- O responsável já **confirma** no popup que leu e aceita o regulamento antes de clicar em "Confirmar e inscrever".

---

## 2. Onde a inscrição é processada

- **Rota:** `POST /api/team-portal/teams/[id]/tournaments/[tournamentId]/participar`
- **Arquivo:** `src/app/api/team-portal/teams/[id]/tournaments/[tournamentId]/participar/route.ts`
- **Fluxo atual:** valida acesso → time aprovado → campeonato publicado → não inscrito → vagas → cria `TournamentTeam` → retorna JSON (e, se for pago, o front redireciona para pagar).
- **Momento certo para disparar o e-mail:** logo **após** criar o `TournamentTeam` com sucesso (antes do `return`), para o **time que acabou de se inscrever**.

---

## 3. Para quem enviar o e-mail

- Usar a mesma lógica dos outros e-mails do painel do time: **e-mails dos responsáveis pelo time**.
- Função já existente: **`getTeamResponsibleEmails(teamId)`** (`src/lib/email/teamEmails.ts`).
- Ela retorna: `responsibleEmail` do time + e-mails dos usuários vinculados como gestores (TeamManager).
- Enviar **um e-mail por endereço** (como na súmula), para cada um desses e-mails.

---

## 4. Conteúdo do e-mail (opções)

| Abordagem | Prós | Contras |
|-----------|------|--------|
| **A) Só link para o painel** | Simples; regulamento sempre igual ao que está no site. | Usuário precisa abrir o painel para ver o regulamento. |
| **B) Link do regulamento (URL) + link do painel** | Se existir `regulamentoUrl`, um clique leva direto ao PDF/página. | Quando só há `regulamentoTexto`, não resolve sozinho. |
| **C) Incluir o texto no corpo do e-mail** | Não precisa sair do e-mail para ler o texto. | Textos longos poluem o e-mail; quebra de linha/formatação exigem cuidado (escapar HTML, etc.). |
| **D) Híbrido: link quando for URL; trecho + “ver completo no painel” quando for texto** | Equilibra clareza e não sobrecarregar o e-mail. | Implementação um pouco mais rica. |

**Recomendação:** **D (híbrido)**  
- Se o campeonato tiver **`regulamentoUrl`**: no e-mail, botão/link “Acessar regulamento” apontando para essa URL.  
- Se tiver **`regulamentoTexto`**: no e-mail, um trecho (ex.: primeiras 400 caracteres) + “Para ver o regulamento completo, acesse o painel do seu time.” com link para a página de campeonatos do time.  
- Sempre incluir **link para o painel** (página de campeonatos daquele time), para ver o campeonato e o botão “Ver regras” que já existe.

Assim o e-mail fica útil mesmo quando não há URL externa e evita colar regulamentos enormes no corpo.

---

## 5. Forma de envio: template vs HTML no código

No projeto hoje há dois padrões:

- **Templates (EmailTemplate + `sendTransactionalEmail`):** assunto e corpo vêm do banco; variáveis tipo `{{nome}}`; editável no admin.
- **HTML no código (`sendEmailToMany`):** assunto e HTML montados na rota; não editável pelo admin.

**Recomendação:** usar **template** (novo `EmailTemplateKey` + registro na tabela `EmailTemplate`).

- Motivos: consistência com outros e-mails do produto; admin pode ajustar texto e links sem deploy; variáveis permitem “nome do campeonato”, “nome do time”, “link do regulamento”, “link do painel”, “trecho do regulamento” (quando houver).
- Nome sugerido do template: **`TOURNAMENT_INSCRICAO_REGULAMENTO`** (ou `CAMPEONATO_INSCRICAO_REGULAMENTO`).

Variáveis sugeridas para o template:

| Variável | Uso |
|----------|-----|
| `tournament_name` | Nome do campeonato. |
| `team_name` | Nome do time. |
| `regulamento_url` | Preenchida se existir `regulamentoUrl`; link “Acessar regulamento” no e-mail. |
| `regulamento_trecho` | Preenchida se existir `regulamentoTexto`; primeiros X caracteres (ex.: 400), escapados para HTML. |
| `painel_url` | Link para a página de campeonatos do time no painel (ex.: `{appBaseUrl}/painel-time/times/{teamId}/campeonatos`). |

No template (HTML do banco), usar condicionalmente:  
se `regulamento_url` existir, mostrar botão/link; se `regulamento_trecho` existir, mostrar o trecho + frase “ver completo no painel” com `painel_url`.

---

## 6. Fluxo desenhado (resumo)

```
[Responsável do time]
        │
        ▼
Clica "Participar agora" no campeonato
        │
        ▼
Popup: "Li e aceito o regulamento" → Confirma
        │
        ▼
Front chama POST .../participar
        │
        ▼
API (participar/route.ts):
  1. Valida acesso, time, campeonato, vagas
  2. Cria TournamentTeam
  3. [NOVO] Busca dados do campeonato (nome, regulamentoUrl, regulamentoTexto)
  4. [NOVO] Obtém lista de e-mails: getTeamResponsibleEmails(teamId)
  5. [NOVO] Para cada e-mail:
         - Monta vars: tournament_name, team_name, painel_url,
           regulamento_url (se houver), regulamento_trecho (se houver, truncado)
         - sendTransactionalEmail(to, 'TOURNAMENT_INSCRICAO_REGULAMENTO', vars)
  6. Retorna JSON (needsPayment, etc.) como hoje
        │
        ▼
Front: redireciona para pagamento (se PAID) ou atualiza lista
```

- O envio do e-mail é **após** criar a inscrição e **antes** de devolver a resposta.
- Não bloquear a resposta da API pelo envio: usar `Promise.all` ou `sendTransactionalEmail(...).catch(...)` para não falhar a inscrição se o e-mail der erro (e, se quiser, logar o erro).

---

## 7. Quando não enviar

- Se o campeonato **não tiver** nem `regulamentoUrl` nem `regulamentoTexto`: ainda faz sentido enviar o e-mail (“Sua inscrição no campeonato X foi recebida”), só sem bloco de regulamento; ou pode decidir **não** enviar nesse caso. Recomendação: **enviar sempre** que houver inscrição, com o template deixando o bloco de regulamento opcional (variáveis vazias = não mostrar link nem trecho).
- Se **não houver** e-mails de responsáveis: não chamar envio; não dar erro na API.

---

## 8. Resumo antes de implementar

| Item | Decisão |
|------|--------|
| **Quando disparar** | Logo após criar `TournamentTeam` com sucesso na rota `participar`. |
| **Destinatários** | `getTeamResponsibleEmails(teamId)` (time que se inscreveu). |
| **Conteúdo** | Template `TOURNAMENT_INSCRICAO_REGULAMENTO` com: nome do campeonato, nome do time, link do painel; se tiver URL do regulamento → link no e-mail; se tiver texto → trecho + “ver completo no painel”. |
| **Falha no envio** | Não falhar a inscrição; logar erro e seguir (como em outros e-mails transacionais). |
| **Próximos passos** | 1) Adicionar chave em `EmailTemplateKey` e seed do template; 2) Na rota `participar`, após criar `TournamentTeam`, buscar regulamento, montar vars e chamar `sendTransactionalEmail` para cada e-mail. |

Se estiver de acordo com esse fluxo, o próximo passo é implementar: tipo no emailService, seed do template e a lógica na rota `participar`.
