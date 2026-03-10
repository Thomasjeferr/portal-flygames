# Análise: e-mail automático ao lançar campeonato para o responsável do time

**Data:** 26/02/2026  
**Objetivo:** Verificar se, ao lançar/publicar um campeonato, um e-mail automático é enviado ao responsável do time para que ele fique sabendo do campeonato.

---

## Resultado da análise

**Não existe hoje envio automático de e-mail ao lançar/publicar um campeonato.**

Nenhum fluxo do sistema envia e-mail para responsáveis de times quando um campeonato (torneio) é criado ou quando seu status passa para "Publicado".

---

## Onde o campeonato é “lançado”

1. **Criação (novo campeonato)**  
   - **API:** `POST /api/admin/tournaments`  
   - **Arquivo:** `src/app/api/admin/tournaments/route.ts`  
   - Cria o torneio com `status: 'DRAFT'` (rascunho) por padrão.  
   - **E-mail:** não há envio de e-mail.

2. **Publicação / “lançamento”**  
   - **API:** `PATCH /api/admin/tournaments/[id]`  
   - **Arquivo:** `src/app/api/admin/tournaments/[id]/route.ts`  
   - O admin pode alterar `status` para `'PUBLISHED'` (Publicado).  
   - Só torneios com `status: 'PUBLISHED'` aparecem na listagem pública e podem receber inscrições de times.  
   - **E-mail:** não há envio de e-mail quando o status muda para `PUBLISHED`.

Ou seja: nem na criação nem na publicação há notificação por e-mail.

---

## O que já existe no projeto (para reutilizar)

- **E-mail para responsável do time**  
  - **Função:** `getTeamResponsibleEmails(teamId)` em `src/lib/email/teamEmails.ts`  
  - Retorna os e-mails do responsável (`responsibleEmail`) e dos gestores do painel (`managers` → `user.email`), sem duplicatas.  
  - Já é usada em outros fluxos (ex.: aprovação/rejeição de time).

- **Envio em massa**  
  - **Função:** `sendEmailToMany(to: string[], subject, html)` em `src/lib/email/emailService.ts`  
  - Usa Resend (`RESEND_API_KEY`).  
  - Já usada em: aprovação de time, rejeição de time, parceiros, etc.

- **Exemplo de e-mail ao responsável**  
  - Em `src/app/api/admin/teams/[id]/approve/route.ts`: ao aprovar o time, o sistema envia e-mail ao responsável e gestores com link para entrar e acessar o painel.  
  - Pode servir de modelo para o texto do e-mail de “novo campeonato”.

---

## O que seria necessário implementar (resumo)

Para passar a avisar o responsável do time por e-mail quando um campeonato for lançado:

1. **Momento do envio**  
   - No **PATCH** de torneio (`src/app/api/admin/tournaments/[id]/route.ts`), quando `data.status` for `'PUBLISHED'` (e o status anterior não era `'PUBLISHED'`), disparar a lógica de e-mail.

2. **Destinatários**  
   - Definir para quem enviar. Duas opções comuns:  
     - **Opção A:** Todos os times **aprovados** (`approvalStatus === 'approved'`). Para cada time, obter os e-mails com `getTeamResponsibleEmails(teamId)` e enviar um e-mail por responsável (evitando duplicata por e-mail).  
     - **Opção B:** Apenas times que atendam a algum critério (ex.: região do campeonato, categoria). Exige campo/critério no modelo e filtro na query.

3. **Conteúdo do e-mail**  
   - Assunto e corpo informando que um novo campeonato foi publicado, nome do campeonato, link para a página do campeonato (ex.: `https://flygames.app/torneios/[slug]`) e/ou para a listagem de campeonatos do painel do time (ex.: `/painel-time/times/[id]/campeonatos`).

4. **Tratamento de erro**  
   - Envio de e-mail em segundo plano ou com `.catch()` para não falhar o PATCH se o Resend falhar; registrar em log em caso de erro.

5. **Não enviar na criação**  
   - Se o fluxo for “criar em rascunho e depois publicar”, faz sentido enviar e-mail só na **publicação** (PATCH com `status: 'PUBLISHED'`), não no POST de criação.

---

## Decisões antes de implementar

- **Quem recebe o e-mail:** todos os times aprovados (Opção A) ou apenas times filtrados (ex.: por região/categoria)?  
- **Um e-mail por responsável ou um e-mail por time?** Recomendação: um e-mail por endereço (agrupar destinatários e usar `sendEmailToMany` sem duplicatas).  
- **Enviar também quando o campeonato já estava publicado e foi editado?** Recomendação: enviar apenas na **transição para PUBLISHED** (primeira publicação), não a cada edição.

---

## Conclusão

- **Hoje:** ao lançar/publicar um campeonato, **não** é enviado e-mail automático ao responsável do time.  
- **Para ter o comportamento desejado:** é preciso implementar o envio no PATCH do torneio quando `status` passar a `'PUBLISHED'`, usando `getTeamResponsibleEmails` e `sendEmailToMany`, conforme as decisões acima.
