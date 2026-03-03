# App Android (download no site) e uso no iOS

O **Portal Futvar / Fly Games** é um **aplicativo web** (Next.js). Este documento trata de **app para Android** (download direto no site) e do **uso no iOS** (navegador), e guarda referência sobre lojas (Play Store / App Store) para o caso de mudança de estratégia no futuro.

---

## Decisão atual: não vamos publicar nas lojas

| Plataforma | O que vamos fazer | O que não vamos fazer |
|------------|-------------------|------------------------|
| **iOS (iPhone/iPad)** | Usuário usa o **navegador** (site leve e simples). | **Não** publicar app na App Store. |
| **Android** | App disponível para **baixar direto no site** (APK na nossa página, ex.: `/baixar`). | **Não** publicar na Play Store. |

Ou seja: **nenhum app será enviado para a Play Store nem para a App Store**. iOS = só navegador. Android = instalador (APK) oferecido no próprio site. O restante do documento mantém contexto, alternativas e o passo a passo para o **download direto no site** (Capacitor, APK assinado, página de download, redução de impacto de "fonte desconhecida" e Play Protect).

---

## Referência: por que não nas lojas (resumo)

Tanto a Apple quanto a Google exigem uso do sistema de pagamento delas (IAP / Google Play Billing) para assinaturas e compras digitais dentro do app, com comissão. Como mantemos o pagamento atual no site (Stripe, Woovi, etc.), **não vamos** publicar nas lojas; em vez disso, Android por download no site e iOS no navegador.

---

**Foco atual (fora das lojas):** **iOS** = navegador. **Android** = app para download no site (APK). Depois: **Smart TVs (LG e Samsung)** em outro guia.

---

## O que será implementado (antes do sinal verde)

Resumo do que pretendo fazer no projeto para você analisar e dar o sinal verde. Nada será alterado até você aprovar.

### 1. Integrar Capacitor no projeto

- Instalar no repositório: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
- Rodar `npx cap init` com nome do app (ex.: Fly Games), ID do pacote (ex.: `app.flygames.portal`) e pasta do web (ex.: `out` ou apontando para URL — ver abaixo).
- Adicionar plataforma Android: `npx cap add android`.
- **Não** adicionar iOS (não vamos publicar na App Store; uso no iPhone é só navegador).

### 2. App Android abrindo a URL do site

- Configurar o Capacitor para o app **carregar a URL do site em produção** (ex.: `https://flygames.app` ou a que você indicar). Assim o app é só uma “casca” (WebView); todo o conteúdo, login, pagamentos e funções vêm do site.
- Ajustar `capacitor.config.ts` (ou equivalente) com essa URL para que, ao abrir o app no celular, ele mostre o site.

### 3. Build do APK (release, assinado)

- Configurar o projeto Android (`android/`) para gerar **APK de release** (não AAB, pois não vamos enviar à Play Store).
- Criar um **keystore** para assinar o APK (ou documentar o comando para você gerar e guardar o arquivo e a senha em segurança). O APK será assinado com esse keystore para passar mais confiança e permitir atualizações futuras com a mesma assinatura.
- Incluir no `package.json` (ou em um README do Capacitor) um script/instrução do tipo: “gerar APK de release” (ex.: `npx cap build android` ou passo a passo pelo Android Studio).

### 4. Informativo na página inicial (sem página nova)

- **Não** criar rota `/baixar`. Em vez disso, colocar na **página inicial** (home) um informativo em que o usuário **toca e baixa** o app.
- Na home: um bloco visível (banner, card ou faixa) com texto tipo “Baixe o app Fly Games para Android” e um **botão/link** que, ao tocar, inicia o download do APK (ex.: link para `/download/flygames.apk`).
- No mesmo bloco (ou em “Como instalar?” expansível): instruções curtas — (1) Permitir “instalação de fontes desconhecidas” se o Android pedir; (2) Se aparecer o Play Protect, tocar em “Instalar mesmo assim” (é o app oficial Fly Games). Assim quem precisar vê na hora, sem sair da home.
- Opcional no bloco: “Prefere não instalar? Use no navegador ou adicione à tela inicial” (link para a home ou dica de PWA). Link para a **Política de Privacidade** pode ficar no Footer (já existe) ou num link discreto no próprio bloco.
- O informativo só precisa aparecer para **Android** (detectar pelo user-agent); em iPhone/desktop pode não exibir o bloco ou exibir mensagem tipo “No iPhone use o navegador; no Android baixe o app” com foco em mobile Android para o download.

### 5. Onde o APK fica e como é servido

- O arquivo **APK** precisa estar acessível por uma URL. Duas opções:
  - **Opção A:** Colocar o APK em `public/download/flygames.apk` (ou outro nome). Quem faz o build do app gera o APK, assina e coloca nessa pasta; o deploy do site passa a servir o arquivo. O botão na **página inicial** aponta para `/download/flygames.apk`.
  - **Opção B:** Hospedar o APK em outro lugar (ex.: storage, CDN) e usar esse link no botão da home.
- Recomendo **Opção A**: pasta `public/download/`, e no README ou em docs explicar que, após gerar o APK assinado, ele deve ser copiado para essa pasta. O informativo na home terá link para `/download/flygames.apk` (ou o nome que definirmos).

### 6. Onde fica o informativo na home

- O bloco “Baixe o app” ficará na **página inicial** (no layout da home, em um lugar visível — ex.: logo abaixo do hero, ou em uma faixa fixa no topo/inferior em mobile). Não será criado link no Header/Footer para uma página `/baixar`, já que não existe mais essa página.

### 7. PWA (opcional, para “Adicionar à tela inicial”)

- Adicionar um **manifest** (ex.: `manifest.json` ou `manifest.webmanifest`) com nome do app, ícones e `display: standalone` (ou `fullscreen`), e linkar no `<head>` do layout.
- No **informativo da página inicial**, reforçar a alternativa: “Prefere não instalar o APK? Adicione o site à tela inicial” com uma frase explicando como (menu do navegador → “Adicionar à tela inicial”). Ajuda quem desiste do APK e também usuários no iOS (Safari → Adicionar à Tela de Início).

### O que você precisa me informar / fazer

- **URL do site em produção** que o app deve abrir (ex.: `https://flygames.app`). Se for outra, qual?
- **Nome do app** e **ID do pacote** que prefere (ex.: “Fly Games” e `app.flygames.portal`). Se não tiver preferência, uso esses.
- **Confirmação** de onde o APK será hospedado: Opção A (pasta `public/download/`) ou Opção B (URL externa). Se for B, qual a URL base do APK?
- Depois da implementação: **gerar o keystore** (se quiser fazer aí) ou seguir o passo a passo que eu deixar para gerar e guardar em segurança; **gerar o APK de release** e colocar em `public/download/` (ou no lugar definido).

### O que não será feito (escopo)

- Não será adicionada plataforma iOS no Capacitor (uso no iPhone = navegador).
- Não será feita publicação na Play Store nem na App Store.
- Não será integrado IAP nem Google Play Billing; o pagamento continua só no site.
- Vídeo ou GIF do fluxo de instalação não entra no escopo inicial; podemos deixar um espaço na página para você incluir depois.

---

Se estiver de acordo com isso, é só dar o **sinal verde** e sigo para a implementação nessa ordem. Se quiser mudar algo (URL, nome do app, opção de hospedagem do APK, ou incluir/remover PWA), diga antes de eu começar.

---

## Parte 1 — Começar: Play Store e iOS (app com todas as funções)

**Objetivo:** Usuário entra na loja (Play Store ou App Store), **baixa**, **instala** e tem o **app na mão**. Dentro do app: **o mesmo projeto**, com **todas as funções** — criar conta, login, comprar jogos, ser patrocinador, área do time, o que já existe hoje no site.

**Como:** Um app nativo (Capacitor) que abre o seu site em produção (ou o build do Next.js). Não é um app “só de leitura” — é o **portal completo**: autenticação, pagamentos, patrocínio, jogos, etc. Tudo que funciona no navegador funciona dentro do app.

**Resumo do fluxo:**

| Quem | O que faz |
|------|-----------|
| **Você** | Publica um app na Play Store (Android) e um na App Store (iOS), gerados pelo Capacitor a partir do mesmo projeto Next.js. |
| **Usuário** | Abre a loja → procura o app → baixa → instala → abre o app e usa **todas as funções** (conta, jogos, patrocinador, etc.). |

**Próximos passos (por partes):**

1. **Integrar Capacitor** no projeto (app abre a URL do site em produção ou o build estático).
2. **Play Store:** criar conta Google Play Console, gerar AAB assinado, enviar e preencher ficha (ícones, screenshots, política de privacidade).
3. **iOS:** criar conta Apple Developer, gerar build no Xcode, enviar ao App Store Connect e preencher ficha.

**Quando inserimos o Capacitor (e o app abrindo a URL), o app já fica apto a publicar nas lojas?**  
**Quase.** Fica pronto o **lado técnico**: você passa a ter um **build** (AAB para Android, IPA para iOS) que pode ser enviado às lojas. Para **realmente publicar** e o app aparecer na Play Store e na App Store, ainda é obrigatório:
- **Contas:** Google Play Console (taxa única) e Apple Developer (anual).
- **Ficha na loja:** nome do app, descrição, screenshots, ícone, política de privacidade (URL), classificação etária, etc.
- **Build assinado:** keystore no Android, certificado e provisioning no iOS.

Resumindo: **inserir o Capacitor** = app instalável e **apto a ser enviado**. **Publicar** = enviar esse build + ter conta + preencher a ficha de cada loja e passar na revisão.

**Foco:** só **Play Store** e **iOS**. Celulares Samsung e LG baixam apps pela Play Store — esquece loja separada para eles. Depois que Play Store e iOS estiverem no ar, o próximo passo é **Smart TVs (LG e Samsung)**, que é outra coisa (outra plataforma, outro guia).

**Funções que o app deve ter (o mesmo que o site hoje):**

- Criar conta / login / recuperar senha  
- Comprar jogos (fluxo de compra existente)  
- Ser patrocinador (planos, pedidos, área do patrocinador)  
- Área do time, elenco, sumula, torneios — tudo que o projeto já oferece  
- Qualquer outra tela e fluxo que já funcionam no site  

Ou seja: **aproveitar o projeto inteiro**; o app é só a “embalagem” (WebView) que abre esse mesmo site. Nada de refazer funções — uma base de código, um app na loja.

**Não perdemos nada do que já foi feito?**  
Não. O app **usa o mesmo projeto** (mesmo código, mesmo backend, mesmas APIs). Nada é descartado; só se adiciona o wrapper (Capacitor) para gerar o instalável da loja.

**Toda atualização atualiza no app da Play Store e do iOS?**  
Sim, **desde que o app abra a URL do site em produção** (ex.: `https://flygames.app`). Nessa configuração:
- Você atualiza o site (deploy no servidor) → na próxima vez que o usuário **abrir o app**, ele carrega o site atualizado. Ou seja, **nova função, novo layout, correção** aparecem para todos sem precisar publicar nova versão na loja.
- Publicar de novo na Play Store / App Store só é necessário quando você mudar algo **do app nativo**: ícone, nome do app, permissões, versão do Capacitor, etc.

Se o app fosse configurado para **embutir** o build estático dentro do instalável, aí sim cada mudança no conteúdo exigiria novo build e nova publicação nas lojas. Por isso a recomendação é: **app carregando a URL ao vivo** — assim toda atualização do site vira atualização do app automaticamente.

---

## Importante: Apple e Google — assinaturas e sistema de pagamento

Tanto a **App Store (Apple)** quanto a **Play Store (Google)** exigem que **assinaturas e compras de conteúdo digital** feitas **dentro do app** usem o **sistema de pagamento da própria loja**:

| Loja | Sistema obrigatório | Comissão da loja |
|------|----------------------|-------------------|
| **App Store** | In-App Purchase (IAP) | Em geral 15% ou 30% |
| **Play Store** | Google Play Billing | Em geral 15% ou 30% |

**O que temos hoje** (Stripe, Woovi, etc. no site) **não pode ser usado dentro do app** publicado em nenhuma das duas lojas para essas compras — ambas podem rejeitar o app ou exigir o uso do billing delas.

**Consequência:** Publicar um app na App Store ou na Play Store que abre o site e deixa o usuário assinar/comprar pelo fluxo atual (cartão no site) **não é permitido** em nenhuma das duas. As opções são:

- **Integrar IAP (Apple) e/ou Google Play Billing** no app para assinaturas/compras digitais → cada loja cobra a comissão e você precisa manter fluxos separados (site = Stripe/Woovi; app = billing da loja), ou  
- **Não oferecer compra/assinatura dentro do app** (ex.: “Para assinar, acesse flygames.app no navegador”) → ambas as lojas podem considerar isso desvio de pagamento e **rejeitar** o app.

Ou seja: **com o modelo de pagamento que temos hoje, um app nas lojas “igual ao site” (com compra/assinatura dentro do app) não dá em nenhuma das duas** — a não ser que se aceite usar o billing de cada loja e as comissões. A alternativa sem mudar pagamento é **distribuir o app fora das lojas**: por exemplo **APK para download direto no seu site** (Android); no iOS não há equivalente para o público geral.

---

## Checklist: o que já temos e o que falta para ser aprovado nas lojas

Verificação no projeto atual (Play Store e App Store).

### Já temos no projeto (bom para aprovação)

| Item | Status | Observação |
|------|--------|------------|
| **Política de privacidade** | OK | Página completa em `/politica-de-privacidade`: LGPD, dados coletados, finalidades, compartilhamento, cookies, segurança, retenção, direitos do titular, contato (contato@flygames.app). Basta garantir que a URL esteja acessível em produção (ex.: `https://flygames.app/politica-de-privacidade`). |
| **Termos de uso** | OK | Página em `/termos-de-uso`, com referência à política de privacidade. Útil para a ficha e para a revisão. |
| **Link no site** | OK | Footer já linka "Política de privacidade" para `/politica-de-privacidade`. |
| **Ícone de referência** | OK | Favicon em `public/uploads/favicon-fly.png` (referenciado no `layout.tsx`). Serve de base para gerar os ícones nos tamanhos exigidos pelas lojas. |
| **Nome e descrição** | OK | Metadata no layout: título "Fly Games - Futebol de Várzea Filmado com Drones" e descrição. Podem ser usados na ficha da loja. |

Nenhuma dessas funcionalidades é perdida; o app vai abrir o site que já contém tudo isso.

### Ainda falta (para enviar e ser aprovado)

| Item | O que fazer |
|------|-------------|
| **Capacitor** | Integrar no projeto (app que abre a URL do site). Sem isso não existe build (AAB/IPA) para enviar. |
| **Ícones nos tamanhos das lojas** | A partir do favicon/logo atual, gerar: **Play Store** — 512x512 (ficha) + ícones para densidades (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi); **App Store** — até 1024x1024 e conjunto para o Xcode. |
| **Screenshots** | Capturas de tela do app em funcionamento (celular e, se quiser, tablet) para colocar na ficha. Não ficam no código; são feitas na hora de publicar. |
| **Contas** | Google Play Console (taxa única) e Apple Developer (anual). |
| **Build assinado** | Depois do Capacitor: keystore no Android (AAB assinado) e certificado + provisioning profile no iOS. |
| **Ficha na loja** | Em cada loja: nome, descrição curta/longa, categoria, classificação etária, URL da política de privacidade, feature graphic (Play Store). |
| **URL da política em produção** | Garantir que `https://[seu-dominio]/politica-de-privacidade` está no ar e acessível; as lojas exigem link válido. |

Resumo: **para aprovação**, o projeto já tem o essencial de **conteúdo** (política de privacidade e termos). Falta o **app instalável** (Capacitor + builds assinados), os **ícones nos tamanhos corretos**, as **contas** e o **preenchimento da ficha** de cada loja na hora de publicar.

---

## Alternativa: instaladores para download direto no seu site (sem lojas)

Em vez de publicar na Play Store e na App Store, você pode **gerar os instaláveis** (com o mesmo Capacitor) e **disponibilizar para download direto no seu site**. A análise abaixo mostra o que é possível em cada plataforma.

### Android: dá para fazer

No Android é **permitido** instalar apps baixados de fora da Play Store (fontes desconhecidas).

| Aspecto | Como funciona |
|--------|----------------|
| **Build** | Mesmo processo com Capacitor: você gera um **APK** (ou AAB convertido em APK para distribuição direta). Assina com seu keystore. |
| **Onde colocar** | Hospedar o APK no seu site, por exemplo: `https://flygames.app/baixar` ou `https://flygames.app/download/flygames.apk`. Pode ter uma página explicando “Baixe o app” com botão de download. |
| **Usuário** | Abre o link no celular Android, baixa o APK, abre o arquivo e instala. O sistema pede para **permitir instalação de fontes desconhecidas** (ou “instalar apps desconhecidos”) para o navegador ou gerenciador de arquivos — o usuário precisa aceitar. |
| **Vantagens** | Sem revisão da Google, sem taxa de loja, você controla quando publica atualizações (troca o APK no servidor). Mesmo app (WebView com sua URL), mesmas funções. |
| **Desvantagens** | Menor visibilidade (quem não conhece o site não descobre o app na Play Store). Parte dos usuários desconfia de “instalar de fonte desconhecida”. Alguns antivírus ou redes podem sinalizar ou bloquear. Atualizações não são automáticas pela loja — ou você avisa “baixe a nova versão” ou implementa um mecanismo próprio de aviso no app. |

**Conclusão Android:** É viável ter **um instalador Android para download direto no site**. Você continua usando Capacitor e o mesmo projeto; só não envia o app para a Play Store.

---

### iOS: praticamente não dá (para público geral)

No **iPhone e iPad**, a Apple **não permite** instalar apps baixados de um site como no Android. O modelo deles é: app para usuário final = **App Store** (ou canais muito restritos abaixo).

| Opção | O que é | Serve para “baixar do meu site”? |
|-------|---------|-----------------------------------|
| **App Store** | Publicar na loja da Apple. | Sim — é o jeito normal de distribuir para qualquer pessoa. |
| **TestFlight** | Beta da Apple: você convida testadores, eles instalam pelo app TestFlight. | Só para **teste** (até 90 dias por build). Não substitui “baixar do site” para uso definitivo. |
| **Ad Hoc** | Build assinado para dispositivos registrados no seu Apple Developer. | Não — limite de 100 dispositivos/ano, e você precisa registrar o UDID de cada um. Não é “qualquer um acessa o site e instala”. |
| **Enterprise** | Programa Apple Developer Enterprise (empresas, uso interno). | Não — é para apps internos da empresa, com regras rígidas. Não é para distribuir ao público pelo seu site. |

**Conclusão iOS:** Para **usuários comuns** que você quer que “entrem no site e baixem o app”, **não existe** distribuição direta pelo site no iOS. O caminho é a **App Store**. Quem tem iPhone e você quer que use o app instalado, precisa baixar pela App Store (ou usar o site no Safari / “Adicionar à tela inicial” como PWA).

---

### Resumo da alternativa “download direto no site”

| Plataforma | Instalador no seu site? | Observação |
|------------|-------------------------|------------|
| **Android** | **Sim** | APK no site; usuário permite “fontes desconhecidas” e instala. Mesmo Capacitor, mesmo app. |
| **iOS** | **Não** (para público geral) | Apple exige App Store (ou TestFlight/Ad Hoc para casos limitados). Não há “baixar do site e instalar” como no Android. |

**Recomendações:**

- Se quiser **só Android** sem passar pela Play Store: use Capacitor, gere o APK, assine, coloque em uma página tipo “Baixe o app” no seu site (ex.: `/baixar`). Avise o usuário que precisa permitir instalação de fontes desconhecidas.
- Se quiser **também iPhone**: para esses usuários o caminho continua sendo **App Store** (ou usar o site no navegador / PWA). Não há equivalente ao “download direto” do Android no iOS.
- É possível **combinar**: Android por download direto no site **e** iOS (e Android também, se quiser) na Play Store e na App Store, para quem preferir buscar na loja.

---

## Decisão: iOS no navegador, Android por download no site

**Resumo da decisão:**
- **iOS:** Usuário usa o **navegador** (site leve e simples). Sem app na App Store.
- **Android:** App disponível para **baixar direto no site** (APK), sem publicar na Play Store.

**Problema:** No Android o usuário vai ver **“Instalação de fonte desconhecida”** e pode aparecer **alerta do Play Protect** (“pode ser nocivo”). Isso **reduz bastante a conversão**. Abaixo: o que fazer para amenizar.

---

## Como reduzir a queda de conversão (fonte desconhecida e Play Protect)

Não dá para eliminar totalmente o aviso de “fonte desconhecida” nem o Play Protect em APK fora da Play Store, mas dá para **reduzir o impacto** na conversão com estes pontos:

### 1. Assinar o APK corretamente (keystore de release)

- Use sempre um **keystore de release** (não debug) e assine o APK. APKs assinados e atualizados com a mesma chave passam mais confiança; em alguns dispositivos o sistema exibe o nome do “desenvolvedor” na tela de instalação.
- Guarde o keystore e a senha em local seguro; se perder, não consegue atualizar o mesmo app no futuro.

### 2. Página de download clara e que passe confiança

- **URL fixa e óbvia**, por exemplo: `https://flygames.app/baixar` ou `https://flygames.app/app`.
- **Título claro:** “Baixe o app Fly Games” / “App oficial Fly Games”.
- **Texto curto** explicando que o app é oficial, seguro e por que não está na Play Store (ex.: “Disponibilizamos o app direto aqui para você usar seu plano e pagamentos como já conhece”).
- **Link para Política de Privacidade** e **contato** (e-mail/suporte) na mesma página.
- **Botão de download** bem visível (ex.: “Baixar para Android”) e, se possível, **versão e data** do APK (ex.: “Versão 1.0 – Jan 2025”) para transparência.

### 3. Instruções passo a passo na própria página

- **Passo 1:** “Ao tocar em ‘Baixar’, o Android pode pedir para **permitir instalação de fontes desconhecidas** (ou ‘instalar apps desconhecidos’). Toque em **Permitir** ou **Configurações** e ative a permissão para o navegador ou para ‘Arquivos’.”
- **Passo 2:** “Se aparecer o **Play Protect** com ‘Este app pode ser nocivo’, é um aviso padrão para apps instalados fora da Play Store. Este é o **app oficial Fly Games**. Toque em **‘Instalar mesmo assim’** (ou **‘Mais detalhes’** e depois **‘Instalar mesmo assim’**).”
- Opcional: **vídeo curto** ou **GIF** mostrando exatamente esses passos (permitir fonte desconhecida → instalar mesmo assim no Play Protect). Isso reduz dúvida e abandono.

### 4. Oferecer PWA como alternativa (sem “fonte desconhecida”)

- No **mesmo site**, para usuários em Android (e iOS), ofereça **“Adicionar à tela inicial”** (PWA): ícone na home, abre em tela cheia, **sem** pedir “fonte desconhecida” nem passar pelo Play Protect.
- Na página de download, deixe explícito: **“Prefere não instalar? Use no navegador ou adicione à tela inicial”** com um link que leve à home ou a uma curta explicação de como adicionar à tela inicial. Quem desiste do APK ainda pode “ter o app” via PWA e a conversão geral sobe.

### 5. Reforçar que é o app oficial

- Na página: **“App oficial Fly Games. Somos nós, flygames.app.”**  
- Se tiver redes sociais ou selos (ex.: “Futebol de várzea filmado com drones”), use na página de download para reforçar identidade e confiança.

### 6. Mesmo APK, mesma assinatura, ao longo do tempo

- Manter o **mesmo certificado** em todas as versões e não trocar de keystore. Com o tempo, em parte dos dispositivos o Android pode “conhecer” melhor o app. O Play Protect não garante que deixe de avisar, mas um histórico estável ajuda.

### Resumo prático

| Ação | Objetivo |
|------|----------|
| APK assinado com keystore de release | Mais confiança; mesmo “desenvolvedor” em atualizações. |
| Página `/baixar` com texto claro + link privacidade + contato | Transparência e confiança. |
| Instruções passo a passo + “Instalar mesmo assim” | Reduz abandono quando aparece fonte desconhecida e Play Protect. |
| Vídeo ou GIF do fluxo de instalação | Usuário sabe o que esperar. |
| PWA como alternativa (“Adicionar à tela inicial”) | Quem não quiser APK ainda converte sem ver “fonte desconhecida”. |

Assim você mantém a decisão (iOS no navegador, Android por download no site) e **reduz** o impacto na conversão causado por "fonte desconhecida" e alerta do Play Protect.

---

## 1. Visão geral: só Play Store e iOS (referência)

| Loja | O que é | Build |
|------|---------|--------|
| **Play Store (Google)** | Loja padrão em **todos** os Android — incluindo celulares **Samsung** e **LG**. Um app publicado na Play Store já aparece para usuários desses aparelhos. | **Android** (AAB). |
| **App Store (iOS)** | Loja da Apple (iPhone, iPad). | **iOS** (Xcode). |

**Resumo:** Dois builds a partir do mesmo projeto web: (1) **App Android** → só Play Store (e já cobre Samsung e LG). (2) **App iOS** → só App Store. **Depois** que isso estiver pronto: **Smart TVs LG e Samsung** (outra plataforma). *(Decisão atual: iOS no navegador; Android por download no site.)*

---

## 2. Como fazer na prática: Capacitor

- **Capacitor** (Ionic) pega seu site (Next.js) e gera um projeto **iOS** e um projeto **Android** que abrem o site numa WebView (ou na URL ao vivo).
- **Um código web** → **um app iOS** + **um app Android**.
- **Android (AAB)** → envia só na **Play Store** (Samsung e LG já usam a Play Store).

Passos em alto nível:

1. **No projeto Next.js:** build de produção; Capacitor pode carregar **URL ao vivo** (ex.: `https://flygames.app`) ou o build estático dentro do app.
2. **Adicionar Capacitor:** `npm install @capacitor/core @capacitor/cli`, `npx cap init`, `npx cap add ios`, `npx cap add android`.
3. **Build iOS:** abrir `ios/` no **Xcode**, assinatura Apple Developer, enviar ao **App Store Connect**.
4. **Build Android:** gerar **AAB**, assinar com keystore; enviar na **Play Store**.

---

## 3. O que cada loja exige (resumo)

| Exigência | iOS (App Store) | Play Store |
|-----------|------------------|------------|
| **Conta desenvolvedor** | Apple Developer (~US$ 99/ano) | Google Play Console (~US$ 25 única) |
| **Build** | IPA (Xcode) | AAB (ou APK) |
| **Política de privacidade** | URL obrigatória | URL obrigatória |
| **Ícones e screenshots** | Conjunto Apple | Conjunto Google |

---

## 4. Depois: Smart TVs (LG e Samsung)

Celulares **Samsung** e **LG** usam a **Play Store** para baixar apps — não precisamos publicar em loja separada para eles. Um único app na Play Store já atende esses aparelhos.

**Depois** de terminarmos **Play Store** e **iOS**, o próximo passo será **Smart TVs (LG e Samsung)**. É outra plataforma (TVs usam outro tipo de app / loja), então será tratado em outro guia.

---

## 5. Ordem sugerida

1. **Contas:** Apple Developer (iOS), Google Play Console (Android).
2. **Projeto:** integrar **Capacitor** no Next.js; configurar iOS (Xcode) e Android; política de privacidade e ícones/screenshots.
3. **Builds:** app **iOS** → App Store Connect; app **Android (AAB)** → Play Store. Depois, quando quiser: **Smart TVs LG e Samsung** (outro guia).

---

## 6. Resumo em uma frase

**Para ter app na Play Store e no iOS:** use **Capacitor** para gerar **um app iOS** (App Store) e **um app Android** (Play Store). Celulares Samsung e LG usam a Play Store — um app lá já cobre todos. Depois: **Smart TVs LG e Samsung** (outra plataforma, outro doc).

Se quiser, o próximo passo pode ser um guia passo a passo para integrar o Capacitor no seu projeto Next.js e gerar os projetos iOS e Android.

---

## 7. Estratégias possíveis (referência)

### A) PWA (Progressive Web App) + "Add to Home Screen"

- **O que é:** O site continua sendo um site; você adiciona **manifest** e **service worker** para que o usuário possa "Adicionar à tela inicial" no celular e abrir como app (tela cheia, ícone na home).
- **Vantagens:** Um único código (o site atual); não precisa manter app nativo; atualizações são só no servidor.
- **Limitações:**
  - **Play Store:** Dá para publicar um "app" que é o site embrulhado (TWA – Trusted Web Activity), mas exige conta de desenvolvedor e revisão.
  - **App Store (iOS):** A Apple não aceita PWAs "genéricas" como apps na loja. O usuário pode apenas **abrir o site no Safari e usar "Adicionar à Tela de Início"** manualmente — não aparece como app na App Store.

**Conclusão:** PWA não coloca o app na App Store. Para **estar na Play Store e na App Store**, use o **wrapper com Capacitor**.

---

### B) App nativo que abre o site (wrapper) — escolha para Play Store e iOS

- **O que é:** Criar um "app" mínimo (iOS e Android) que é basicamente uma **WebView** abrindo a URL do seu site (ex.: `https://flygames.app`). **Capacitor** gera esse app a partir do seu projeto web.
- **Vantagens:** Um app na **App Store**, um na **Play Store**; usuário baixa da loja e abre o mesmo site dentro do app. Celulares Samsung e LG usam a Play Store — já ficam cobertos.
- **Desvantagens:** Exige contas (Apple, Google), builds nativos e cumprir políticas de cada loja (privacidade, ícones, screenshots).

---

## 8. O que o projeto precisa (independente da estratégia)

### 8.1 Para a **Play Store** (Google)

| Item | Descrição |
|------|-----------|
| **Conta Google Play Console** | Cadastro de desenvolvedor (taxa única, hoje ~US$ 25). |
| **Política de privacidade** | URL pública (você já tem página de política no projeto; garantir que está acessível e atualizada). |
| **Ícones do app** | Vários tamanhos (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi). Ícone 512x512 para a loja. |
| **Imagens de divulgação** | Screenshots (phone/tablet), gráfico de recursos (feature graphic), texto da ficha do app. |
| **Formulário de conteúdo** | Classificação etária, questionário de anúncios (se houver), declaração de permissões. |
| **Se for TWA (PWA na loja):** | Manifest do PWA, service worker, domínio verificado (o app "aponta" para a URL do site). |
| **Se for wrapper (Capacitor):** | Build Android (AAB), assinatura com keystore, versão e nome do pacote. |

### 8.2 Para a **App Store** (Apple)

| Item | Descrição |
|------|-----------|
| **Apple Developer Program** | Assinatura anual (~US$ 99/ano). Obrigatório para publicar na App Store. |
| **Política de privacidade** | URL pública (mesma que no site). |
| **Ícones do app** | Conjunto de ícones no tamanho exigido pelo Xcode (até 1024x1024 para a App Store). |
| **Screenshots** | Vários tamanhos de iPhone e, se quiser iPad, de iPad. |
| **App Store Connect** | Ficha do app: nome, descrição, palavras-chave, categoria, classificação etária. |
| **Build nativo** | Gerado no Xcode (ou via Capacitor), assinado com certificado e provisioning profile. |
| **Revisão da Apple** | A Apple revisa cada versão; exige que o app funcione bem, tenha política de privacidade e siga as diretrizes. |

---

## 9. O que falta no projeto hoje (checklist técnico)

- [ ] **Manifest PWA** (`manifest.json` ou `manifest.webmanifest`): nome do app, ícones, cores, `display: standalone` (ou `fullscreen`) para abrir como "app".
- [ ] **Service worker** (opcional para PWA): para funcionar offline básico e "Add to Home Screen" mais robusto; no Next.js pode ser feito com `next-pwa` ou similar.
- [ ] **Meta tags e link para o manifest** no `<head>` (ex.: em `layout.tsx` ou `_document`).
- [ ] **Ícones em múltiplos tamanhos** para PWA e/ou para os builds nativos (Android e iOS).
- [ ] **Política de privacidade** acessível por URL fixa (ex.: `https://flygames.app/politica-de-privacidade`) e referenciada na ficha das lojas.
- [ ] **Se for wrapper (Capacitor):**
  - [ ] Integrar **Capacitor** no projeto (ou criar um projeto Capacitor que carrega a URL do site).
  - [ ] Configurar **iOS**: projeto Xcode, certificado, provisioning profile.
  - [ ] Configurar **Android**: keystore, `build.gradle`, formato AAB para envio à Play Store.
  - [ ] Tratar **deep links** / URL scheme, se quiser abrir o app a partir de links.
