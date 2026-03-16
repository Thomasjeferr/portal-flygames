# Fly Games – App LG Smart TV (webOS)

App web para LG Smart TV (webOS). Mesmo fluxo do app Samsung: autorização via QR no celular, catálogo de jogos e player HLS. As chamadas de API usam `https://flygames.app` quando o app roda instalado no .ipk.

## Ícones obrigatórios

Antes de gerar o .ipk, coloque nesta pasta dois ícones PNG:

- **icon_80x80.png** – 80×80 pixels (ícone na Home da TV)
- **icon_130x130.png** – 130×130 pixels (ícone grande)

Você pode redimensionar seu logo (ex.: do site ou da Samsung) para esses tamanhos. Para a loja LG (imagem de exibição), use 400×400 PNG se solicitado.

## Gerar o .ipk

1. **Instalar o webOS CLI**  
   - **Requisitos**: Node.js 14.15.1–16.20.2 (ou compatível), npm. Windows 10+ 64 bits.  
   - Se você tinha a CLI antiga (webOS TV ou webOS OSE), desinstale antes (veja a seção “Preparação” na [documentação LG](https://webostv.developer.lge.com/develop/tools/cli-installation)).  
   - Instale globalmente:
     ```bash
     npm install -g @webos-tools/cli
     ```
   - Confirme: `ares -V` (deve mostrar a versão instalada).

2. **Na raiz do projeto** (onde está a pasta `lg-tv-app`):

   ```bash
   ares-package lg-tv-app
   ```

   Isso gera um arquivo `.ipk` na pasta atual (ex.: `com.flygames.app.tv_1.0.0_all.ipk`).

3. **Upload no LG Seller Lounge**  
   - Acesse [LG Seller Lounge](https://seller.lge.com/) e entre no seu app (ex.: **flygames-tv**, plataforma **webOS**).  
   - Vá em **Envio de arquivo** e faça o upload do `.ipk` gerado.  
   - Preencha as informações da versão e envie para revisão.

## Estrutura

- **appinfo.json** – ID `com.flygames.app.tv`, título "Fly Games", resolução 1920×1080.  
- **index.html** – Entrada do app (QR, catálogo, player).  
- **css/style.css**, **js/app.js** – Estilos e lógica (API em flygames.app, D-pad, tecla Back).

## Tecla Back (webOS)

No controle remoto LG, a tecla "Back" envia o evento `key === 'Back'`. O app já trata: no player volta ao catálogo; no catálogo volta à tela de QR.

## Referência

Plano completo: `docs/PLANO-APP-LG-SMART-TV.md`.
