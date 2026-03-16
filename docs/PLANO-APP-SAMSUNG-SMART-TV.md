# Plano: Ajustar o app para Samsung Smart TV

## Objetivo

Publicar o app Fly Games / Portal Futvar na Samsung Smart TV (Samsung Apps TV), permitindo que usuários **apenas assistam** ao conteúdo pelo televisor. **Não haverá cadastro nem login na TV**: o acesso é liberado ao escanear um QR code pelo celular (navegador ou app da Play Store), que autoriza aquele aparelho. Este documento é um **plano de trabalho** antes de iniciar o desenvolvimento e a submissão.

---

## Uso do app na TV: só assistir, acesso via QR code no celular

- **Na TV:** o usuário **só assiste** ao conteúdo. Não há tela de cadastro nem de login na TV.
- **Ao abrir o app na TV:** é exibida uma tela com um **QR code** (e, opcionalmente, um código curto tipo `ABC-123`) para liberar o acesso.
- **Liberação do acesso:** o usuário escaneia o QR code (ou acessa o link/código) pelo **celular** — no **navegador** ou no **app da Play Store** que vocês já têm. No celular ele faz login (se ainda não estiver logado) e confirma “Autorizar esta TV”. A partir daí a TV fica autorizada a reproduzir o conteúdo da conta dele por um tempo (ex.: sessão de 24 h ou até deslogar).
- **Fluxo resumido:**  
  1. TV abre app → mostra QR code (+ código curto).  
  2. Usuário escaneia com o celular (navegador ou app Fly Games).  
  3. No celular: login (se necessário) + “Autorizar esta TV”.  
  4. TV recebe a confirmação (polling ou WebSocket) e libera o catálogo/player.  
  5. Usuário assiste apenas no TV; nenhum cadastro na TV.

Isso mantém a TV “burra” em termos de conta (sem formulários de login/cadastro) e centraliza a autenticação no celular, alinhado ao que você pediu. O plano técnico abaixo detalha como implementar esse fluxo no backend e no app da TV.

---

## Situação atual do projeto

- **Plataformas existentes:** Web (Next.js) e Android (Capacitor).
- **Samsung TV:** Ainda não existe build ou projeto Tizen; será necessário criar a versão para TV e publicar pelo **Samsung Apps TV Seller Office** (seller.samsungapps.com/tv).

---

## Opções para Samsung Smart TV

| Opção | Descrição | Esforço | Recomendação |
|-------|-----------|---------|---------------|
| **Tizen Web App** | App em HTML/CSS/JS empacotado como **.wgt** (Tizen Web), com `config.xml`. Pode reutilizar lógica e UI do site, adaptada para TV (controle remoto, resolução). | Médio | **Recomendado** – reaproveita o front web. |
| **Tizen Native** | App nativo em C++/Tizen; outra base de código. | Alto | Só se precisar de APIs nativas específicas. |

**Recomendação:** seguir com **Tizen Web Application**: exportar/adaptar o front para um bundle estático (ou build específico) e empacotar como .wgt com `config.xml`, atendendo ao checklist da Samsung.

---

## Pré-requisitos (antes de codar)

1. **Conta no Samsung Apps TV Seller Office**
   - Você já acessa: seller.samsungapps.com/tv (Tizen Application).
   - Verificar se a conta está aprovada para **distribuição** (EUA só; internacional pode exigir parceria).

2. **Self Checklist (na própria Seller Office)**
   - Em **APPLICATIONS** → **Self Checklist**: baixar/revisar a lista de itens que a Samsung exige (privileges, performance, multitasking, media playback, connection, accounts, generals).
   - Usar como guia durante o desenvolvimento para “resolver o problema em avanço”.

3. **Certificados e assinatura**
   - Apps Tizen precisam ser **assinados** (author-signature.xml, signature1.xml, etc.).
   - Ver na documentação Samsung: certificado de desenvolvedor e processo de assinatura do pacote .wgt.

4. **Documentação oficial**
   - [Samsung TV Developer – Quick start / Publishing](https://developer.samsung.com/smarttv/develop/getting-started/quick-start-guide.html)
   - [Launch Checklist](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html)
   - [Configuring Web Applications (config.xml)](https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html)

---

## Ajustes técnicos necessários (visão geral)

### 1. Build e empacotamento para Tizen

- **Artefato:** aplicação web empacotada como **.wgt** (Tizen Web).
- **config.xml (ou tizen-manifest.xml):**
  - Application ID único (não duplicar IDs existentes).
  - Versão no formato exigido: [0-255].[0-255].[0-65535].
  - Declaração de **privileges** (APIs que o app usa).
  - **Screen-size** e recursos de TV (resolução, D-pad).
  - Ponto de entrada: arquivo HTML inicial (ex.: index.html).
- **Assinatura:** gerar signature1.xml e author-signature.xml conforme guia Samsung.
- **Package ID:** único, sem caracteres especiais.

### 2. UX para TV (controle remoto)

- Navegação por **D-pad / setas** (sem mouse ou touch).
- Foco visível em todos os elementos interativos (botões, links, cards).
- Evitar hover; usar **foco** e tecla **Enter/OK** para ativar.
- Tecla **Voltar** do controle: comportamento consistente (ex.: voltar tela anterior ou sair do app, conforme guidelines).

### 3. Resolução e layout

- Resoluções típicas de TV (1920x1080 e variantes).
- Layout que não dependa de viewport pequeno; evitar colunas muito estreitas ou texto ilegível à distância.
- Player de vídeo em destaque e compatível com requisitos de **Media Playback** do checklist.

### 4. Autorização da TV via QR code (celular: navegador ou app Play Store)

- **Tela inicial na TV:** exibir apenas um QR code (e, se desejado, um código curto tipo `ABC-123`). Sem campos de login/cadastro na TV.
- **QR code:** deve apontar para uma URL do portal que identifique a “sessão TV” (ex.: `https://flygames.app/tv?code=ABC123` ou `/tv/ativar?c=ABC123`). O mesmo link pode ser aberto no **navegador** do celular ou **deep link** no **app da Play Store** (app Android).
- **No celular (navegador ou app):**
  - Se o usuário não estiver logado → redirecionar para login e, após login, voltar para a página de “Autorizar TV”.
  - Na página de autorização: texto do tipo “Você está autorizando uma Samsung TV a assistir ao seu conteúdo. Válido por X horas.” e botão “Autorizar esta TV”.
  - Ao clicar em “Autorizar”, o backend associa o **código** exibido na TV ao **userId** da sessão do celular e gera um **token de sessão para a TV** (ex.: `tvSessionToken`), com validade limitada (ex.: 24 h). O código de uso único deixa de ser válido após uso.
- **Na TV:**
  - A TV chama periodicamente uma API (polling), ex.: `GET /api/tv/status?code=ABC123`, até a resposta indicar “autorizado” e retornar um **tvSessionToken** (ou a TV já exibe o código e, após o usuário autorizar no celular, a próxima chamada de status devolve o token).
  - A TV armazena o token localmente (ex.: localStorage ou equivalente Tizen) e usa em todas as requisições de **stream-playback** (ex.: `GET /api/video/stream-playback?gameSlug=...&tvSessionToken=...`). O backend deve aceitar `tvSessionToken` como alternativa à sessão por cookie para identificar o usuário e aplicar as mesmas regras de acesso e limite de telas.
- **Backend (a implementar):**
  - **Gerar código de TV:** endpoint ou lógica que a TV (ou a página da TV) chama para obter um código curto de uso único (ex.: 6 caracteres) com validade (ex.: 10–15 min). Armazenar em tabela ou cache (ex.: `TvAuthCode`: code, expiresAt, usado ou não).
  - **Página no site:** rota `/tv` ou `/tv/ativar` que recebe `code=XXX`, mostra a tela “Autorizar esta TV” e, ao confirmar, chama **POST /api/tv/activate** com o código e a sessão (cookie). O backend valida o código, associa ao userId, gera `tvSessionToken` (e opcionalmente um “deviceId” fixo para essa TV, para limite de telas), grava em `TvSession` ou equivalente (userId, token, expiresAt, deviceId) e invalida o código.
  - **GET /api/tv/status?code=XXX:** a TV chama em polling. Enquanto o código não for ativado, retorna `{ status: 'pending' }`. Quando ativado, retorna `{ status: 'authorized', tvSessionToken: '...', expiresAt: '...' }` e o código deixa de ser válido para novas ativações.
  - **stream-playback:** além de cookie e `sessionToken` (pré-estreia), aceitar parâmetro `tvSessionToken`. Se presente, resolver userId (e deviceId) a partir da tabela de sessões TV e aplicar a mesma lógica de acesso (canAccessGameBySlug, limite de telas, etc.).
- **App da Play Store:** a mesma URL do QR code (ex.: `https://flygames.app/tv?code=ABC123`) deve abrir no app Android (deep link ou App Link) na tela de “Autorizar esta TV”, reutilizando a mesma lógica do navegador (login se necessário + botão autorizar). Assim o usuário pode escanear o QR code e ser levado ao app já instalado no celular.

### 5. Conteúdo e funcionalidades (geral)

- **Contas na TV:** não há login/cadastro na TV; apenas o fluxo de autorização via QR code acima. No checklist Samsung (Accounts), descrever que o login é feito no dispositivo móvel e a TV age como “dispositivo autorizado”.
- **Rede:** declarar permissões de rede necessárias no config.xml (privileges).
- **Reprodução de mídia:** atender aos requisitos de **Media Playback** e **Connection** do Self Checklist (formato, DRM se houver, etc.).

### 6. Performance e multitasking

- **Performance:** app responsivo; evitar travamentos.
- **Multitasking:** comportamento em segundo plano conforme guidelines (ex.: áudio, notificações).

---

## Passos de submissão no Seller Office (resumo)

1. **Create App** – Criar o app (nome, tipo, idioma).
2. **Upload** – Enviar o pacote (.wgt); extensão em minúsculas; sem caracteres especiais no nome; até 10 pacotes por tipo se multi-arquitetura.
3. **Pre-test** – Passar na validação automática (privileges, formato, etc.).
4. **Test information e descrição** – Preencher informações de teste e descrição do app.
5. **Preview e certificação** – Revisar e enviar para certificação Samsung.

---

## Ordem sugerida de trabalho (plano em fases)

| Fase | O que fazer |
|------|-------------|
| **1. Pesquisa e checklist** | Preencher o **Self Checklist** no Seller Office (em branco) e ler a **Launch Checklist** da Samsung; listar gaps do app atual em relação a TV (navegação, resolução, mídia, privileges). |
| **2. Decisão de arquitetura** | Definir se o build para TV será: (A) build estático Next.js exportado e servido como SPA dentro do .wgt, ou (B) projeto Tizen Web separado que consome a mesma API. Garantir que o ponto de entrada (index.html) e recursos estejam dentro do pacote. |
| **3. Autorização TV via QR code** | Implementar no **backend**: geração de código de TV (curto, de uso único), tabela/cache de códigos e sessões TV; **GET /api/tv/status?code=** (polling); **POST /api/tv/activate** (celular autoriza); aceitar **tvSessionToken** em **stream-playback**. No **site**: página `/tv` ou `/tv/ativar` com QR/link e botão “Autorizar esta TV”. No **app Android**: deep link para a mesma URL para abrir pelo app ao escanear o QR. Na **app TV**: tela inicial apenas com QR code (+ código curto) e polling até receber `tvSessionToken`; usar o token em todas as chamadas de vídeo. |
| **4. config.xml e empacotamento** | Criar config.xml com Application ID, version, privileges, screen-size, arquivo de entrada; configurar pipeline (script ou ferramenta) para gerar .wgt e assinaturas. |
| **5. Ajustes de UX para TV** | Implementar navegação por D-pad, foco visível, tecla Voltar; testar em emulador ou TV de desenvolvimento. |
| **6. Mídia e rede** | Garantir que o player e as chamadas de API atendam ao checklist (Media Playback, Connection); declarar privileges corretos. |
| **7. Testes e pre-test** | Testar em dispositivo/emulador Tizen; rodar pre-test do Seller Office; corrigir falhas até passar. |
| **8. Submissão** | Create App → Upload → preencher informações → enviar para certificação. |

---

## Sugestões para facilitar (recomendações extras)

- **Sempre mostrar código curto junto do QR code**  
  Na tela da TV, exibir também um código tipo `ABC-123` (ou 6 caracteres). Se a câmera do celular falhar ou o usuário preferir, ele pode abrir manualmente `flygames.app/tv` e digitar o código. Reduz frustração e suporte.

- **Mensagem clara no celular após autorizar**  
  Na página do celular, depois de “Autorizar esta TV”, mostrar algo como: “TV autorizada! Volte ao televisor — o catálogo já está disponível.” Assim o usuário sabe que pode largar o celular e usar a TV.

- **Sessão expirada na TV**  
  Quando o `tvSessionToken` expirar (ex.: 24 h), na TV voltar automaticamente para a tela do QR code com o texto: “Sessão encerrada. Escaneie o QR code novamente para continuar.” Evita tela de erro genérica e deixa o fluxo óbvio.

- **App da TV carregando conteúdo por URL (Cenário A)**  
  Se o app na TV for uma **SPA que carrega o HTML/JS de um servidor** (URL remota no config.xml), atualizações de layout e correções passam a valer para todos sem nova submissão na loja. Se for tudo empacotado no .wgt (Cenário B), cada mudança exige novo build e nova publicação. Vale priorizar arquitetura que permita carregar da web quando possível, dentro do que a Samsung permite.

- **Deep link no Android já configurado**  
  Garantir que o domínio (ex.: `flygames.com.br` ou `flygames.app`) tenha **App Links / Digital Asset Links** configurados para a URL `/tv` (e variantes). Assim, ao escanear o QR code, quem tem o app instalado cai direto no app em “Autorizar esta TV”, sem escolher “abrir no navegador”.

- **Fase de autorização antes do build Tizen**  
  Implementar a **Fase 3 (autorização via QR)** no backend e no site (e no app Android) **antes** de fechar o build .wgt da TV. Assim dá para testar o fluxo completo no navegador (simulando a TV com polling) e só depois empacotar o app TV já integrado ao mesmo backend.

- **Preparar assets da loja com antecedência**  
  Para a submissão no Seller Office, a Samsung costuma pedir ícones (vários tamanhos), screenshots e às vezes vídeo. Deixar ícones e telas (incluindo a tela do QR code) prontos na fase de UX/UI reduz atrasos na **Fase 8**.

- **Um “deviceId” fixo por TV**  
  Ao ativar o código no celular, o backend pode gerar um `deviceId` estável para aquela TV (ex.: baseado em um ID que a TV envia na primeira chamada, ou em “tv_” + hash do token). Assim o limite de telas conta “uma TV” por usuário de forma estável, e não várias “TVs” cada vez que ele escaneia de novo.

- **Rate limit e segurança**  
  Limitar a geração de códigos de TV por IP ou por dispositivo (ex.: no máximo 1 código novo a cada 1–2 minutos por TV) para evitar abuso. Código de uso único e validade curta (10–15 min) já estão no plano; o rate limit complementa.

- **Documentar “Accounts” para o checklist Samsung**  
  No Self Checklist, no item de contas/login, deixar anotado: “Login não é feito na TV. O usuário autoriza a TV pelo celular (navegador ou app); a TV atua como dispositivo autorizado, sem coleta de credenciais no televisor.” Isso evita dúvidas na certificação.

---

## Pontos de atenção

- **Privileges:** usar apenas APIs **public** a menos que tenha autorização **partner**; uso indevido bloqueia na pré-análise.
- **Distribuição:** conta “public” pode ter limitação (ex.: só EUA); distribuição internacional pode exigir parceria com a Samsung.
- **Certificados:** não pular a etapa de assinatura; pacotes não assinados não são aceitos.

---

## Próximo passo imediato

1. Abrir o **Self Checklist** no Seller Office (botão “Self Checklist” na tela APPLICATIONS) e baixar/revisar os itens.
2. Ler a **Launch Checklist** em: https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html
3. Com a lista em mãos, fazer uma **primeira passada** no app atual (web) anotando o que já atende e o que precisa ser adaptado para TV (navegação, foco, resolução, mídia, config.xml).

Quando quiser, podemos detalhar a **Fase 2** (arquitetura do build para .wgt) ou a **Fase 4** (UX com D-pad) em cima do código do Portal Futvar.
