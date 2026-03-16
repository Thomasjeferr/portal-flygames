# Plano: App Fly Games na LG Smart TV (webOS)

## Objetivo

Publicar o app Fly Games na **LG Smart TV** (webOS), permitindo que usuários assistam ao conteúdo no televisor. O fluxo é o mesmo da Samsung: **sem cadastro na TV**; ao abrir o app, o usuário vê um QR code, escaneia no celular (navegador ou app) e autoriza a TV. Depois disso, catálogo e player na TV.

Este documento é um **plano de trabalho** para desenvolver e publicar na LG enquanto aguarda aprovação da classificação/parceria na Samsung.

---

## Situação atual

- **Samsung (Tizen):** app em `tv-app/` (HTML/CSS/JS), pacote .wgt, submissão no Samsung Seller Office; aguardando aprovação/parceria.
- **Backend:** APIs de TV já implementadas (código, status, activate, QR, stream-playback com tvSessionToken). **Podem ser reutilizadas** para a LG.
- **LG (webOS):** ainda não existe build nem projeto; será necessário criar a versão webOS e publicar no **LG Content Store** via **LG Seller Lounge** (seller.lgappstv.com).

---

## LG vs Samsung: diferenças principais

| Aspecto | Samsung (Tizen) | LG (webOS) |
|--------|------------------|------------|
| **Plataforma** | Tizen | webOS TV |
| **Tecnologia** | HTML/CSS/JS (Chromium) | HTML5/CSS3/JS (Chromium por versão) |
| **Pacote** | .wgt | .ipk |
| **Manifesto** | config.xml | appinfo.json |
| **Loja / Submissão** | Samsung Apps TV Seller Office | LG Content Store / LG Seller Lounge |
| **Controle** | D-pad (setas, Enter, Voltar) | Magic Remote (ponteiro + teclas) e D-pad |
| **Ferramentas** | Tizen Studio, CLI | webOS CLI (ares-*), webOS Studio |

A **lógica do app** (QR, polling, catálogo, player HLS, mesmo backend) pode ser a mesma; mudam o **empacotamento** (.ipk + appinfo.json) e os **requisitos de UX** da LG (ponteiro + teclas).

---

## O que reutilizar

- **Backend:** nenhuma alteração necessária. As rotas `/api/tv/*`, `/api/games`, `/api/video/stream-playback` e `/api/public/sponsors` já funcionam com CORS para qualquer origem (incluindo app LG).
- **Front do app TV:** a pasta `tv-app/` é HTML/CSS/JS puro. Pode ser **copiada e adaptada** para webOS:
  - Manter: index.html, fluxo de telas (auth, catálogo, player, expirado), CSS (ajustes mínimos se necessário), lógica em JS (API_BASE, token, polling, lista de jogos, HLS).
  - Adicionar: **appinfo.json** (obrigatório na LG), ícones nos tamanhos LG (80x80, 130x130; na loja 400x400).
  - Ajustar: eventos de tecla (LG usa teclas semelhantes; Magic Remote pode enviar ponteiro/clique). Garantir que **Back** feche o player ou volte à tela de QR conforme guidelines LG.

---

## Pré-requisitos (antes de codar)

1. **Conta no LG Seller Lounge**
   - Registrar em: https://seller.lgappstv.com (ou link indicado na documentação LG).
   - Verificar se a conta permite submissão para o **Brasil** (LG Content Store costuma ter distribuição no Brasil).

2. **Documentação oficial LG**
   - [webOS TV Developer – Getting Started](https://webostv.developer.lge.com/develop/getting-started/build-your-first-web-app)
   - [appinfo.json](https://webostv.developer.lge.com/develop/references/appinfo-json)
   - [App Approval Process](https://webostv.developer.lge.com/distribute/app-approval-process)
   - [LG Seller Lounge](https://seller.lgappstv.com) (submissão).

3. **Ferramentas**
   - **webOS CLI** (ares-generate, ares-package, ares-install, ares-launch) para criar, empacotar e testar.
   - **webOS TV Simulator** (opcional) para testar sem TV física.
   - Opcional: **webOS Studio** (IDE).

4. **Self-checklist e documento de cenário de UX**
   - A LG exige **self-checklist** preenchido e **documento de cenário de UX** (como o usuário usa o app). Preparar com base no fluxo: abrir app → QR → escanear no celular → autorizar → catálogo → escolher jogo → player → voltar.

---

## Ajustes técnicos necessários

### 1. appinfo.json (obrigatório)

Criar na raiz do app LG, por exemplo:

```json
{
  "id": "com.flygames.app.tv",
  "title": "Fly Games",
  "main": "index.html",
  "type": "web",
  "vendor": "Fly Games",
  "version": "1.0.0",
  "icon": "icon_80x80.png",
  "largeIcon": "icon_130x130.png",
  "appDescription": "Assista aos jogos na TV. Autorize com o celular.",
  "resolution": "1920x1080"
}
```

- **id:** único, convenção reverse-DNS (ex.: com.flygames.app.tv). Não pode começar com com.lge, com.webos, com.palm.
- **version:** três números (ex.: 1.0.0); não pode repetir versão já enviada.
- **icon:** 80x80 PNG (obrigatório). Na loja, ícone 400x400 é enviado separado no Seller Lounge.

### 2. Estrutura do projeto LG

Sugestão de pasta (ex.: `lg-tv-app/` ou reutilizar `tv-app/` e gerar .ipk com script):

- `appinfo.json`
- `index.html` (entrada; pode ser cópia do tv-app com pequenos ajustes)
- `css/`, `js/` (iguais ou quase iguais ao tv-app)
- `icon_80x80.png`, `icon_130x130.png`

Não é necessário config.xml (Tizen); a LG usa só appinfo.json.

### 3. UX para LG (Magic Remote e teclado)

- **Magic Remote:** envia eventos de **ponteiro** (mouse) e **clique** (OK). O app já usa clique em cards e botões; deve funcionar com ponteiro.
- **Teclas:** setas, Enter, **Back** (importante). Garantir que a tecla Voltar feche o player ou volte à tela de autorização, sem sair do app de forma inesperada.
- **Foco visível:** manter outline/foco nos elementos interativos (como na Samsung), para quem usar apenas o controle remoto com setas.

Documentação LG: [Back Button](https://webostv.developer.lge.com/develop/guides/back-button). Pode ser necessário `disableBackHistoryAPI: true` no appinfo.json e tratar o evento Back no JS.

### 4. Empacotamento .ipk

- Com webOS CLI: `ares-package ./lg-tv-app` (ou o diretório do app).
- Gera arquivo `com.flygames.app.tv_1.0.0_all.ipk`.
- Esse .ipk é o que será enviado ao **LG Seller Lounge** (não .wgt).

### 5. Conteúdo e políticas

- **Sem oferta de compra dentro do app:** igual à Samsung; só assistir e autorizar. Compras/assinaturas no site ou app de celular.
- **Contas:** descrever no self-checklist que o login é feito no celular; a TV é apenas “dispositivo autorizado”.

---

## Passos de submissão no LG Seller Lounge (resumo)

1. **Conta e app**
   - Criar conta no LG Seller Lounge e registrar um novo app (nome, tipo web, idioma).

2. **Upload**
   - Enviar o pacote **.ipk** e os **assets** (ícone 400x400 para a loja, screenshots, etc.).

3. **Testes automáticos (pre-test)**
   - Validação de appinfo.json, ícones, formato. Corrigir até passar.

4. **Informações e documentos**
   - Preencher informações do app, **self-checklist** e **documento de cenário de UX** (fluxo do usuário).
   - Definir **países de distribuição** (incluir Brasil se disponível).

5. **Certificação**
   - LG faz pretest, teste de função e de conteúdo. Após aprovação, o app vai ao LG Content Store.

---

## Ordem sugerida de trabalho (fases)

| Fase | O que fazer |
|------|-------------|
| **1. Conta e documentação** | Registrar no LG Seller Lounge; ler o [App Approval Process](https://webostv.developer.lge.com/distribute/app-approval-process) e requisitos de self-checklist e cenário de UX. |
| **2. Projeto webOS** | Criar pasta do app LG (ex.: `lg-tv-app/`). Copiar conteúdo de `tv-app/` (index.html, css, js). Adicionar **appinfo.json** com id, title, main, type, version, icon, largeIcon, resolution. Gerar ícones 80x80 e 130x130 (e 400x400 para a loja). |
| **3. Ajustes de UX para LG** | Garantir tecla Back (e opcionalmente disableBackHistoryAPI); testar com simulador ou TV em Developer Mode. Manter foco visível e suporte a ponteiro/clique. |
| **4. Empacotamento e teste** | Instalar webOS CLI; rodar `ares-package`; testar .ipk no simulador ou em TV com Developer Mode. |
| **5. Self-checklist e cenário de UX** | Preencher self-checklist com resultado dos testes; redigir documento de cenário (passo a passo do usuário: abrir app → QR → celular → autorizar → catálogo → assistir → voltar). |
| **6. Submissão** | No Seller Lounge: criar app, enviar .ipk, ícone 400x400, screenshots, descrição, self-checklist e cenário de UX; selecionar Brasil; enviar para certificação. |

---

## Pontos de atenção

- **App ID:** não pode começar com `com.lge`, `com.webos`, `com.palm`. Usar algo como `com.flygames.app.tv`.
- **Versão:** formato três números (ex.: 1.0.0); cada versão enviada à loja deve ser única.
- **Brasil:** confirmar no Seller Lounge se o Brasil está na lista de países; LG costuma oferecer distribuição no Brasil.
- **Sem compra no app:** manter o app só para assistir e autorizar; sem links ou botões de compra/assinatura dentro do app na TV.

---

## Próximo passo imediato

1. Acessar **https://webostv.developer.lge.com** e **seller.lgappstv.com** (ou o URL atual do Seller Lounge) e criar/conferir a conta.
2. Instalar **webOS CLI** e criar um app de teste com `ares-generate -t basic ./lg-tv-app` para ver a estrutura esperada; em seguida substituir pelo conteúdo do Fly Games (index.html, css, js) e adicionar appinfo.json.

Quando quiser, podemos detalhar a **Fase 2** (estrutura do `lg-tv-app/` e conteúdo do appinfo.json) ou a **Fase 3** (tratamento da tecla Back no JS) em cima do código do projeto.
