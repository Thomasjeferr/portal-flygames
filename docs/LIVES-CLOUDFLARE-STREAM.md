# Como funciona a Live com Cloudflare Stream

Fluxo resumido: você **cria a live no admin** → o portal usa o **Cloudflare Stream** para receber o vídeo do OBS e entregar para quem assiste.

---

## Dois caminhos no formulário "Criar Live"

### Opção A: Deixar o portal criar tudo (recomendado)

1. **"ID da entrada ao vivo (Cloudflare)"** — deixe **em branco**.
2. Marque **"Criar credenciais OBS agora (URL e chave para o Cloudflare Stream)"**.
3. Preencha título, datas, etc. e clique em **Criar Live**.

**O que acontece:**

- O portal chama a **API do Cloudflare** e cria um **Live Input** (uma “entrada” de transmissão) na sua conta Stream.
- O Cloudflare devolve uma **URL de ingestão** (RTMPS) e uma **chave de transmissão (stream key)**.
- O formulário mostra essa **URL** e a **chave** na tela (e você pode copiar).
- No **OBS Studio**: em “Configurações → Transmissão”, você cola:
  - **Serviço:** Custom…
  - **Servidor:** a URL que o portal mostrou (ou só o host RTMPS).
  - **Chave de transmissão:** a stream key que o portal mostrou.
- Quando você clica em “Iniciar transmissão” no OBS, o vídeo vai para o **Cloudflare Stream**. O portal usa o **ID dessa entrada** para montar o player e exibir a live para quem acessar a página da live no site.

Resumo: **portal cria a entrada no Cloudflare e te dá URL + chave para colar no OBS.**

---

### Opção B: Você já criou a entrada no Cloudflare

1. No **dashboard do Cloudflare** (Stream → Live Inputs), você criou uma “Live Input” e anotou o **ID da entrada ao vivo**.
2. No formulário do portal, **cole esse ID** no campo **"ID da entrada ao vivo (Cloudflare)"**.
3. Pode **desmarcar** “Criar credenciais OBS agora” (a URL e a chave você já vê no dashboard do Cloudflare).
4. Clique em **Criar Live**.

**O que acontece:**

- O portal **não** chama a API para criar entrada; ele só **associa** essa live do admin ao ID que você colou.
- A **URL e a chave** para o OBS são as que o Cloudflare mostra naquele Live Input (no dashboard).
- O restante é igual: você configura o OBS com essa URL e chave; o portal usa o mesmo ID para exibir o player da live.

Resumo: **portal só vincula a live ao Live Input que você já criou no Cloudflare.**

---

## Fluxo geral (quem transmite e quem assiste)

```
[Você]  OBS Studio  →  envia vídeo (RTMPS + stream key)  →  Cloudflare Stream
                                                                  ↓
[Visitante]  Site (flygames.app/live/xxx)  →  player pede o HLS  →  Cloudflare Stream
                                                                  ↓
                                                        entrega o vídeo ao player
```

- **Quem transmite:** usa no OBS a **URL de ingestão** e a **stream key** (geradas pelo portal na Opção A ou vistas no dashboard na Opção B).
- **Quem assiste:** abre a página da live no site; o player carrega o **HLS** do Cloudflare (o portal usa o `cloudflareLiveInputId` da live para montar a URL do vídeo).

---

## O que precisa estar configurado

- No **Vercel** (ou no seu `.env`): `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_STREAM_API_TOKEN` com permissão para **Stream** (e Live Inputs).
- No **Cloudflare**: conta com **Stream** ativo (incluindo Live).

Se algo falhar ao criar a live (por exemplo “Erro ao criar Live Input”), confira essas variáveis e as permissões do token no Cloudflare.
