# Passo a passo: publicar o app Fly Games na Samsung Smart TV no Brasil

Este guia usa o **Samsung Apps TV Seller Office** (seller.samsungapps.com/tv) e considera a publicação **no Brasil**.

---

## Importante: distribuição no Brasil

- Contas **Grupo Público** (Public Seller) costumam ter distribuição apenas nos **Estados Unidos**.
- Para publicar **no Brasil**, em geral é necessário ser **Partner Seller** (parceria com a Samsung, contrato offline e aprovação do Content Manager).
- **O que fazer:** no Seller Office, no menu à esquerda, abra **Guia** e consulte a documentação oficial sobre “Service Country” / “País de serviço” e “Partner”. Se o seu perfil já permitir escolher Brasil ao cadastrar o app, siga os passos abaixo. Caso só apareça EUA, entre em contato com o suporte Samsung (ou use **Sessão de perguntas e respostas individual**) para solicitar distribuição no Brasil / parceria.

---

## Antes de começar no Seller Office

1. **Pacote do app (.wgt)**  
   - Build Tizen Web assinado (author-signature.xml, signature1.xml).  
   - Gerado no Tizen Studio ou com a ferramenta de assinatura Samsung.  
   - Extensão em minúsculas: `.wgt`.  
   - Nome do arquivo: sem caracteres especiais (apenas letras, números, espaço e underscore), até 100 bytes.

2. **Ícones**  
   - 1920x1080 px (PNG).  
   - 512x423 px (PNG).

3. **Screenshots**  
   - 1280x720 ou 1920x1080 px, JPG.  
   - Sugestão: tela do QR code, catálogo, player, “Sessão encerrada”.

4. **Texto em português (Brasil)**  
   - Nome do app como aparece na TV.  
   - Descrição do app (o que faz, que o usuário autoriza via QR no celular, etc.).

5. **Documento de UI (opcional mas útil)**  
   - PPTX descrevendo as telas (QR, catálogo, player) para a certificação.

---

## Passo 1: Abrir Aplicações e criar o app

1. Acesse **https://seller.samsungapps.com/tv** e faça login.
2. No menu à esquerda, clique em **Aplicações**.
3. Clique no botão **Create App** (Criar aplicativo).
4. Preencha:
   - **Application Name:** nome para uso interno no Seller Office (ex.: Fly Games TV). Não poderá ser alterado depois.
   - **App Type:** **Tizen Web Application**.
   - **Default Language:** **Portuguese (Brazil)** ou o idioma padrão que for usar.
5. Clique em **Done**. Será gerado um Application ID (para uso no sistema; é diferente do Tizen ID do .wgt).

---

## Passo 2: Enviar o pacote (.wgt)

1. Na página do app criado, vá em **App Package** (Pacote do aplicativo).
2. Clique em **Upload**.
3. Selecione o arquivo **.wgt** do Fly Games (extensão em minúsculas, nome sem caracteres especiais).
4. Aguarde o upload. O **pre-test** roda automaticamente.
5. Se o pre-test **Pass**: o pacote fica registrado e você pode seguir.
6. Se **Fail**: leia a mensagem (ex.: config.xml, assinatura, versão). Corrija o .wgt e faça upload de novo.

**Dicas:**  
- Versão no config.xml no formato [0-255].[0-255].[0-65535] (ex.: 1.0.0).  
- O pacote deve conter **config.xml**, **author-signature.xml** e **signature1.xml**.

---

## Passo 3: Informações do aplicativo e país de serviço

1. Ainda no app, abra a seção de **informações do aplicativo** (Application Information / Entering Application Information).
2. Preencha:
   - **Título** (como aparece na TV): ex. **Fly Games**.
   - **Descrição** em português do Brasil (ex.: “Assista aos jogos na TV. Abra o app, escaneie o QR code com a câmera do celular e autorize para começar.”).
   - **Categoria** adequada (ex.: Esportes ou Entretenimento).
   - **Ícones** (1920x1080 e 512x423).
   - **Screenshots** (1280x720 ou 1920x1080).
3. Em **Service Country** / **País de serviço** (ou equivalente):
   - Se **Brasil** estiver disponível na lista, selecione **Brasil** (e outros países se quiser).
   - Se só aparecer EUA, sua conta é provavelmente Public e precisará de parceria para Brasil; use o **Guia** ou a **Sessão de perguntas e respostas individual** para perguntar como habilitar Brasil.

---

## Passo 4: Conta / login (checklist Samsung)

Na documentação (Self Checklist / Launch Checklist), costuma haver um item sobre **Accounts**. Para o Fly Games:

- **Não há login na TV.** O usuário só escaneia o QR code no celular e autoriza.  
- Sugestão de texto para descrever na submissão: “O login não é feito na TV. O usuário autoriza o dispositivo TV pelo celular (navegador ou app); a TV atua como dispositivo autorizado, sem coleta de credenciais no televisor.”

Use esse texto (ou similar) onde o Seller Office pedir explicação sobre contas/login.

---

## Passo 5: Self Checklist e testes

1. No menu à esquerda, em **Aplicações**, use o **Self Checklist** (se disponível) e marque/atenda os itens.
2. Garanta que:
   - Navegação por D-pad (setas, Enter, Voltar).
   - Foco visível em elementos interativos.
   - Reprodução de mídia e rede conforme o checklist.

---

## Passo 6: Pedir liberação e certificação

1. Na lista de **App Package**, selecione a versão que passou no pre-test (status **Ready to Submit**).
2. Clique em **Submit** / **Request Release** (ou equivalente) para enviar à certificação Samsung.
3. O status passará para algo como **Submitted** ou **In Review**.
4. Acompanhe em **Notificação** (9 não lidas na sua tela — vale abrir para ver se há algo sobre o app ou sobre país).

---

## Passo 7: Depois do envio

- **Relatórios > Painel:** acompanhe “Minha candidatura” (EM REVISÃO, APROVADO, REJEITADO, etc.) e “Serviço de Aplicativos” (EM SERVIÇO quando publicado).
- Se aparecer **Revisão de retorno** ou **Rejeitado**, abra a notificação/mensagem e corrija o que a Samsung indicar (pacote, texto, país, etc.) e reenvie.
- **Brasil:** se tiver selecionado Brasil e a conta for aprovada para o país, o app ficará disponível nas Smart TVs Samsung no Brasil após a aprovação.

---

## Resumo rápido

| # | Ação |
|---|------|
| 1 | **Aplicações** → Create App → Nome, Tizen Web, idioma (ex.: PT-BR). |
| 2 | **App Package** → Upload do .wgt → conferir pre-test Pass. |
| 3 | Preencher **informações do app** (título, descrição, ícones, screenshots) e **país de serviço** (Brasil, se disponível). |
| 4 | Explicar **Accounts**: login só no celular, TV apenas autorizada. |
| 5 | Usar **Self Checklist** e garantir D-pad, foco, mídia. |
| 6 | **Submit** / Request Release para certificação. |
| 7 | Acompanhar **Notificação** e **Relatórios > Painel** até “Em serviço” no Brasil. |

---

## Links úteis

- Seller Office: https://seller.samsungapps.com/tv  
- Guia (menu **Guia** no Seller Office)  
- Registro de aplicativo: https://developer.samsung.com/tv-seller-office/guides/applications/registering-application.html  
- Informações do aplicativo: https://developer.samsung.com/tv-seller-office/guides/applications/entering-application-information.html  

Se o Brasil não aparecer como país de serviço, use **Guia** ou **Sessão de perguntas e respostas individual** no Seller Office para perguntar como publicar no Brasil (possível necessidade de Partner Seller).
