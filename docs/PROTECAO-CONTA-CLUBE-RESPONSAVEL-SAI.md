# Proteção da conta do clube quando o responsável sai ou não repassa acesso

Contexto: na área do time (varzea), o **responsável** é quem tem acesso ao painel (elenco, comissões, etc.). Se ele brigar com o time ou sair e **não passar as credenciais** para outro membro, o clube perde o acesso ao painel. Como se precaver?

---

## Como está hoje

- **Acesso ao painel:** quem está em **TeamManager** (userId + teamId) **ou** quem tem e-mail igual a **Team.responsibleEmail** (time aprovado) pode acessar o painel.
- **Cadastro:** ao cadastrar o time, o usuário logado vira **OWNER** em TeamManager e o `responsibleEmail` do time é o e-mail dele.
- **Aprovação:** ao aprovar, o admin pode criar TeamManager OWNER para o usuário que tem o mesmo e-mail do `responsibleEmail` (se ainda não houver gestor).
- **Admin hoje pode:** na edição do time, alterar **nome e e-mail do responsável** e enviar **“Enviar redefinição de senha ao e-mail acima”**. Não há tela para listar/remover/adicionar gestores (TeamManager).

Ou seja: se o responsável sair e não repassar a senha, o admin pode **trocar o e-mail do responsável** para o novo membro e enviar reset de senha. Mas (1) o **antigo** responsável pode continuar com acesso se ainda existir registro em **TeamManager**; (2) o **novo** só ganha acesso se **já tiver conta** no site com esse e-mail (ou o admin precisar “adicionar” esse usuário como gestor de outra forma). Falta um fluxo claro de “trocar responsável” e, se quiser, “mais de um gestor”.

---

## Sugestões para proteger a conta do clube

### 1. **Admin: trocar responsável de forma explícita (mínimo)**

- Na **edição do time** (admin), ao alterar o **e-mail do responsável** e salvar:
  - Atualizar `Team.responsibleEmail` (já existe).
  - **Remover** da tabela **TeamManager** qualquer usuário cujo e-mail **não** seja mais o novo `responsibleEmail` (ou remover todos e recriar só o do novo e-mail).
  - Se existir **User** com o novo e-mail: garantir que ele tenha um **TeamManager** (OWNER) para esse time.
- Texto na tela: “Ao alterar o e-mail do responsável e salvar, o acesso ao painel será do novo e-mail. O responsável anterior perderá o acesso. Envie o link de redefinição de senha ao novo e-mail se ele ainda não tiver conta.”
- **Resultado:** o admin consegue “passar o bastão” para outro membro: muda o e-mail, salva, envia reset para o novo. O antigo deixa de acessar (desde que a lógica de TeamManager seja ajustada ao trocar responsável).

---

### 2. **Vários gestores (OWNER + ASSISTANT)**

- Permitir **mais de um** gestor por time: hoje já existe **role** em TeamManager (OWNER | ASSISTANT).
- **No painel do time:** o OWNER pode ter uma seção “Gestores do time” onde:
  - Lista quem tem acesso (e-mail, nome, role).
  - “Convidar outro gestor”: informa o e-mail; o sistema envia convite por e-mail (“Você foi convidado a ser gestor do time X. Crie uma conta ou faça login e você terá acesso ao painel.”). Ao ter conta, o admin ou o próprio sistema pode adicionar esse usuário como **TeamManager** (ASSISTANT).
- **Ou no admin:** em “Times > [id] > Editar”, seção “Gestores do painel”: listar TeamManagers, adicionar por e-mail (cria TeamManager para o User com esse e-mail), remover gestor (exceto deixar pelo menos um).
- **Resultado:** se o responsável (OWNER) sair, outro gestor (ASSISTANT) já tem acesso e pode seguir tocando o painel. Opcionalmente: permitir que um ASSISTANT seja “promovido” a OWNER ou que o admin defina quem é o “responsável principal” (responsibleEmail).

---

### 3. **Admin: “Enviar redefinição de senha” + “Definir novo responsável”**

- Manter o botão **“Enviar redefinição de senha ao e-mail acima”** (já existe).
- Deixar explícito na tela: “Se o responsável saiu e não repassou o acesso, altere o e-mail acima para o novo responsável, salve e depois clique em ‘Enviar redefinição de senha’. O novo responsável precisará ter (ou criar) uma conta com esse e-mail.”
- Garantir que, ao trocar o e-mail e salvar, a lógica de acesso (TeamManager / responsibleEmail) reflita só o novo responsável (ver item 1).

---

### 4. **Conta de pré-estreia (clube) separada do painel**

- A **conta de visualização** (usuário/senha para assistir pré-estreia) é **só para assistir**; não acessa painel do time.
- Quando implementarmos “um login por clube para todos os jogos”, essa conta será **por clube** (ex.: por e-mail do responsável que pagou), **não** a conta pessoal do responsável. Assim, mesmo que o responsável mude ou saia, o **time** continua com o mesmo usuário/senha de clube para assistir; só o **painel** que precisa ser reassignado (itens 1–3).

---

## Resumo recomendado

| O quê | Ação |
|-------|------|
| **Trocar responsável** | Admin altera o e-mail do responsável na edição do time e salva; ao salvar, atualizar TeamManager (remover antigo, garantir novo como OWNER) para que só o novo e-mail tenha acesso. |
| **Reset de senha** | Manter botão “Enviar redefinição de senha ao e-mail acima” e orientar: “Se o responsável saiu, coloque o e-mail do novo responsável, salve e envie o reset.” |
| **Mais de um gestor** | Permitir adicionar ASSISTANT (no painel pelo OWNER ou no admin por e-mail), para o time não depender de uma única pessoa. |
| **Pré-estreia** | Manter conta “clube” separada (um login por clube para jogos); não vincular ao painel, assim a troca de responsável não tira o acesso à pré-estreia do time. |

Assim o clube fica protegido: (1) admin consegue passar o painel para outro membro; (2) opcionalmente há mais de um gestor; (3) a conta de assistir à pré-estreia continua do clube, não do responsável.
