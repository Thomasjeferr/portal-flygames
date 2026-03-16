# Fly Games - App Samsung Smart TV (Tizen)

App Tizen Web para Samsung Smart TV. O usuário **não faz login na TV**: ao abrir o app, vê um QR code e um código curto; escaneia no celular (navegador ou app Fly Games) e autoriza a TV. Depois disso pode navegar no catálogo e assistir aos jogos com o controle remoto (D-pad).

## Requisitos Samsung

- **Navegação D-pad:** setas e Enter/OK para navegar; tecla Voltar para sair do player ou voltar à tela de autorização.
- **Foco visível:** todos os itens focáveis têm outline verde (`#22c55e`).
- **Sem login na TV:** apenas tela de QR code e catálogo/player.
- **Rede:** privileges `internet` e `network.public` no config.xml.

## Estrutura

- `index.html` – entrada do app (telas: auth, catálogo, player, sessão expirada).
- `css/style.css` – estilos otimizados para TV (1920x1080, texto legível à distância).
- `js/app.js` – lógica: obter código, exibir QR, polling de status, catálogo, reprodução HLS com tvSessionToken.
- `config.xml` – manifesto Tizen (application id, version, content, privileges).

## Uso local (navegador)

Para testar no computador, sirva a pasta `tv-app` por HTTP e abra `index.html`. O app usa `window.location.origin` como API_BASE, então use o mesmo domínio do backend (ex.: `http://localhost:3000`) servindo o app em um path como `/tv-app/` no Next.js ou em outro servidor na mesma origem.

## Empacotar .wgt (Tizen)

1. **Ícone:** coloque um ícone `icon.png` (recomendado 117x117 ou 512x512) na pasta `tv-app`.
2. **Pacote:** crie um arquivo .wgt (zip) contendo:
   - `config.xml` na raiz
   - `index.html`, `icon.png` na raiz
   - pastas `css/` e `js/` com os arquivos
3. **Assinatura:** assine o .wgt com o certificado de desenvolvedor Samsung (Tizen Studio ou CLI). Sem assinatura o pacote não é aceito no Seller Office.
4. **Submissão:** envie o .wgt no Samsung Apps TV Seller Office (seller.samsungapps.com/tv).

## Script de empacotamento (exemplo)

No diretório do projeto (raiz do Portal Futvar):

```bash
cd tv-app
# Criar .wgt (sem assinatura – assinar no Tizen Studio)
zip -r ../flygames-tv.wgt . -x "*.DS_Store" "README.md"
```

Depois abra o .wgt no Tizen Studio para assinar e testar no emulador.

## Deep link no Android

Para que o QR code abra o app Fly Games (Play Store) no celular quando instalado, configure **App Links** no domínio do site para o path `/tv`:

- `assetlinks.json` em `https://flygames.app/.well-known/assetlinks.json` (ou o domínio que usar)
- No Android (Capacitor), intent-filter para `https://flygames.app/tv` (pathPrefix ou pathPattern)

Assim, ao escanear o QR code no celular, o usuário cai direto na tela "Autorizar esta TV" dentro do app.
