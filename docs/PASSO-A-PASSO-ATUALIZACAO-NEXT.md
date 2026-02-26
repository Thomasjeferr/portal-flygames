# Passo a passo: atualização Next.js (e dependências) sem perder o projeto

Siga **na ordem**. Se algo der errado, use a seção "Como voltar atrás" no final.

---

## O que vamos fazer

1. Garantir que você pode **voltar atrás** a qualquer momento (backup no Git).
2. Fazer a atualização em uma **branch separada** (o projeto atual fica intacto na `main`).
3. Atualizar o Next.js e, se necessário, o `@vercel/blob`.
4. Testar o build; se quebrar, corrigir ou desistir e voltar.

**Versões atuais do seu projeto:** Next.js `14.2.35`, `@vercel/blob` `^0.25.0`.

---

## Parte 1 — Backup e preparação (obrigatório)

### Passo 1.1 — Salvar e enviar o estado atual

No PowerShell, na pasta do projeto:

```powershell
cd "c:\Users\thoma\OneDrive\Área de Trabalho\Portal Futvar"
```

Confira se não há alterações não commitadas:

```powershell
git status
```

- Se aparecerem arquivos em "Changes not staged" ou "Untracked" e você quiser guardá-los, faça:
  ```powershell
  git add -A
  git commit -m "Salvar estado antes da atualização Next"
  ```

Envie tudo para o GitHub (backup remoto):

```powershell
git push origin main
```

Assim, mesmo que algo dê errado no PC, o código atual estará no GitHub.

### Passo 1.2 — Criar uma tag de backup (ponto de restauração)

Isso cria um “marco” para você voltar exatamente a este estado:

```powershell
git tag -a backup-antes-next-upgrade -m "Backup antes de atualizar Next.js"
git push origin backup-antes-next-upgrade
```

Se um dia quiser voltar a esse ponto, você usa essa tag (explicado no final).

### Passo 1.3 — Criar a branch de trabalho para a atualização

Agora você vai trabalhar em uma **cópia** da `main`. A `main` não é alterada até você fazer merge.

```powershell
git checkout -b upgrade-next-16
```

Você está agora na branch `upgrade-next-16`. Todo o próximo trabalho (editar `package.json`, instalar, build) deve ser feito nessa branch.

---

## Parte 2 — Atualizar dependências

### Passo 2.1 — Atualizar o Next.js para a versão 15 (menos arriscado primeiro)

Em vez de pular direto para o 16, é mais seguro tentar primeiro o **Next 15** (última 15.x estável). O aviso do `npm audit` diz que as versões afetadas vão até a 15.5.9; a 15.5.10 (ou superior na linha 15) costuma já ter os patches de segurança.

1. Abra o arquivo **`package.json`** na raiz do projeto.
2. Na linha onde está `"next": "14.2.35"`, troque para:
   ```json
   "next": "15.0.3"
   ```
   (Ou use `"15.5.10"` se existir no npm — 15.0.3 é uma versão estável conhecida da linha 15.)
3. Salve o arquivo.

**Por que 15 e não 16?** Next 16 traz mudanças maiores (breaking changes). Next 15 ainda é mais próximo do 14; se o 15 rodar bem, você reduz o risco e já pode corrigir vulnerabilidades. Depois podemos avaliar o 16.

### Passo 2.2 — Atualizar o @vercel/blob (vulnerabilidade do undici)

O `npm audit` apontou que o `undici` (usado pelo `@vercel/blob`) está vulnerável. Atualizar o `@vercel/blob` para uma versão que use `undici` corrigido.

1. No mesmo **`package.json`**, localize:
   ```json
   "@vercel/blob": "^0.25.0"
   ```
2. Troque para uma versão mais nova que ainda seja compatível. Por exemplo:
   ```json
   "@vercel/blob": "^0.26.0"
   ```
   Ou, se a documentação do Vercel recomendar para Next 15, use a versão indicada (ex.: `^0.27.0`).  
   **Não** use `2.3.0` ainda, pois o npm audit disse que é breaking change; primeiro vamos estabilizar o Next 15.
3. Salve o arquivo.

### Passo 2.3 — Instalar as dependências

No PowerShell, ainda na pasta do projeto e na branch `upgrade-next-16`:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

- Apagar `node_modules` e `package-lock.json` evita conflitos de versões antigas.
- Se der erro de permissão ao apagar `node_modules`, feche o Cursor/VS Code e qualquer terminal que use a pasta e tente de novo.

---

## Parte 3 — Testar o build

### Passo 3.1 — Gerar o Prisma e rodar o build

```powershell
npm run build
```

- Se **passar**: vá para o Passo 3.2.
- Se **der erro**: anote a mensagem (ou tire print). Dependendo do erro:
  - Pode ser coisa simples (ex.: import ou tipo do Next 15). Podemos corrigir.
  - Se for muitas quebras e você quiser **abortar**, pule para a seção **"Como voltar atrás"** e volte para a `main`; o projeto fica como estava.

### Passo 3.2 — Testar em modo desenvolvimento (recomendado)

```powershell
npm run dev
```

Abra no navegador: `http://localhost:3000`.  
Use o **checklist abaixo** para não esquecer nada.

### Checklist de testes manuais (após o upgrade Next 15)

Marque conforme for testando.

**Build e dev**
- [ ] `npm run build` conclui sem erro.
- [ ] `npm run dev` sobe e a home abre em `http://localhost:3000`.

**Páginas públicas**
- [ ] **Home** carrega (hero, conteúdo, rodapé).
- [ ] **Seção de patrocinadores** na home: carrossel aparece, não dá erro de hydration no console, links (site/Instagram/WhatsApp) funcionam.
- [ ] **Página de um jogo** (ex.: `/jogos/...`) abre e exibe dados.
- [ ] **Outras páginas** que você usa (times, categorias, etc.) abrem normalmente.

**Admin (área logada)**
- [ ] **Login admin** (`/admin` ou rota de login): consegue entrar.
- [ ] **Dashboard / analytics** (`/admin/analytics`): página abre, **mapa** carrega sem erro “Map container is already initialized”, troca de período (24h, 7 dias, etc.) recarrega dados e mapa.
- [ ] **Listagens com paginação** (categorias, jogos, partners, planos, saques, sponsor-orders, sponsors, times, usuários): abrem, troca de página funciona, não dá erro no console.
- [ ] **Criar/editar** algo no admin (ex.: um sponsor, um jogo): salva e redireciona/listagem atualiza.

**Funções no site (fluxos que usam formulários e ações)**
- [ ] **Cadastro** (`/cadastro`): preencher e enviar; confirmação/redirecionamento ou mensagem de erro esperada.
- [ ] **Entrar** (`/entrar`): login com e-mail/senha; redireciona para conta ou painel.
- [ ] **Recuperar senha** (`/recuperar-senha`): enviar e-mail; mensagem de confirmação ou erro.
- [ ] **Listagem de jogos** (`/jogos`): filtros (categoria, data, etc.) funcionam; clicar em um jogo abre a página do jogo.
- [ ] **Patrocinar** (`/patrocinar` ou `/patrocinar/comprar`): fluxo de escolha/compra até confirmação ou checkout (conforme existir no projeto).
- [ ] **Painel do time** (se usar): login do time, ver dados, comissões ou súmulas (abrir e salvar).
- [ ] **Admin – uma ação de criar**: ex.: novo jogo, nova categoria ou novo sponsor; preencher formulário, salvar; item aparece na listagem.
- [ ] **Admin – uma ação de editar**: abrir um item existente, alterar um campo, salvar; alteração persiste ao recarregar.
- [ ] **Admin – saques** (se usar): listar e, se houver, aprovar/rejeitar um saque; estado atualiza.

**Console e erros**
- [ ] Nenhum erro vermelho no console do navegador nas páginas que você testou (hydration, “Map container…”, etc.).

Se algo quebrar (tela em branco, erro no console, página que não abre), anote **onde** e **a mensagem** (ou print) para corrigir antes de fazer merge na `main`.

---

## Parte 4 — Se deu certo: guardar e (opcional) integrar

### Passo 4.1 — Commit e push da branch de atualização

Se o build e os testes manuais estiverem ok:

```powershell
git add package.json package-lock.json
git commit -m "chore: atualizar Next.js para 15 e @vercel/blob para reduzir vulnerabilidades"
git push origin upgrade-next-16
```

Assim você tem a atualização salva no GitHub na branch `upgrade-next-16`.

### Passo 4.2 — (Opcional) Trazer as mudanças para a main

Só faça isso se estiver tudo estável e você quiser que o projeto “oficial” use a nova versão:

```powershell
git checkout main
git merge upgrade-next-16
git push origin main
```

Depois disso, a `main` estará com Next 15 e o blob atualizado. O deploy (ex.: Vercel) usará esse código na próxima vez que fizer deploy da `main`.

---

## Como voltar atrás (recuperar o projeto)

Use **uma** das opções abaixo.

### Opção A — Descartar a branch e voltar para a main

Se você está na branch `upgrade-next-16` e quer **desistir** da atualização e voltar ao estado da `main`:

```powershell
git checkout main
```

A partir daí você trabalha de novo na `main`; a branch `upgrade-next-16` continua existindo, mas você não está nela. O projeto volta a ser o que estava antes da atualização (desde que você não tenha feito merge na main).

### Opção B — Restaurar a partir da tag de backup

Se você fez a tag `backup-antes-next-upgrade` e quer **voltar o código exatamente** ao estado daquele momento:

```powershell
git checkout main
git reset --hard backup-antes-next-upgrade
```

**Cuidado:** `reset --hard` apaga as alterações locais na `main` desde essa tag. Use só se tiver certeza. Depois:

```powershell
git push origin main --force
```

(Só faça o `--force` se você tem certeza de que ninguém mais depende do histórico atual da `main`.)

### Opção C — Recuperar a partir do GitHub

Se você **não** tiver feito merge da `upgrade-next-16` na `main`, no GitHub a `main` ainda está no estado antigo. Você pode:

1. No PC, ir para a pasta do projeto.
2. `git checkout main`
3. `git fetch origin`
4. `git reset --hard origin/main`

Isso deixa sua pasta igual à `main` do GitHub (estado antes da atualização).

---

## Resumo rápido (checklist)

- [ ] 1. `git status` → commit se precisar → `git push origin main`
- [ ] 2. `git tag -a backup-antes-next-upgrade -m "..."` e `git push origin backup-antes-next-upgrade`
- [ ] 3. `git checkout -b upgrade-next-16`
- [ ] 4. No `package.json`: `next` → `"15.0.3"` (ou 15.5.x se existir), `@vercel/blob` → `"^0.26.0"` (ou versão recomendada)
- [ ] 5. Apagar `node_modules` e `package-lock.json`, depois `npm install`
- [ ] 6. `npm run build` → se passar, `npm run dev` e testar no browser
- [ ] 7. Se ok: commit + push da branch `upgrade-next-16`; se quiser, merge na `main`
- [ ] 8. Se quebrar: `git checkout main` (e, se precisar, usar a tag ou `origin/main` para restaurar)

Seguindo isso, você **não perde o projeto**: o estado atual está na `main` e na tag; a tentativa de atualização fica isolada na branch.
