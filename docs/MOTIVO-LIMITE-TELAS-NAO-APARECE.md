# Motivo: limite de telas não aparece ao abrir 3 abas

## O que acontece

O usuário tem limite de 2 telas. Ao abrir o sistema em **3 abas** e reproduzir vídeo nas três, o sistema **não exibe** a mensagem de “Limite de X tela(s) simultânea(s) atingido”.

---

## Motivo do erro

O **deviceId** usado para contar “telas simultâneas” é **guardado e lido do `localStorage`** no **mesmo domínio**. Todas as abas da mesma origem **compartilham esse mesmo `localStorage`**.

- **Onde está:** `src/components/VideoPlayer.tsx` (por volta das linhas 59–64):
  - Lê `localStorage.getItem('portal_futvar_device_id')`.
  - Se não existir, gera um `deviceId` (ex.: `web_${Date.now()}_${random}`) e grava em `localStorage`.
  - Envia esse `deviceId` na chamada a `/api/video/stream-playback`.

- **No backend** (`src/app/api/video/stream-playback/route.ts`):
  - As “telas” são contadas por **sessões ativas** na tabela `UserStreamSession`, diferenciadas por **`userId` + `deviceId`**.
  - Se todas as abas mandam o **mesmo** `deviceId`, o backend entende que é **um único dispositivo** (uma única sessão).
  - A checagem `activeSessions.length >= maxScreens && !isThisDeviceActive` nunca bloqueia, porque há só 1 registro (o mesmo `deviceId`) e `isThisDeviceActive` é `true`.

**Resumo:** Como as 3 abas usam o **mesmo** `deviceId` (vindo do `localStorage` compartilhado), o backend considera **1 tela**, não 3. Por isso o limite de 2 telas nunca é excedido e a mensagem de “limite de telas atingido” não aparece.

---

## Comportamento atual: limite por dispositivo (estilo Netflix)

- **Frontend (`src/components/VideoPlayer.tsx`):**
  - **deviceId estável por dispositivo:** usa **`localStorage`** com a chave `portal_futvar_device_id`. O mesmo navegador no mesmo aparelho (PC, celular, TV) envia sempre o mesmo ID; várias abas no mesmo PC contam como **1 dispositivo**.
  - Plano “2 telas” = no máximo **2 dispositivos diferentes** tocando ao mesmo tempo (ex.: 1 PC + 1 celular). No mesmo PC o usuário pode abrir várias abas = 1 dispositivo.
  - **Exibição do erro:** quando a API retorna 403 (limite excedido), a mensagem é exibida no player, com dica para fechar o player em outro dispositivo ou aguardar.
  - Resposta da API lida com `res.text()` + `JSON.parse` para evitar falha ao receber 403 com corpo JSON.
- **Backend:** Conta sessões por `userId` + `deviceId`; bloqueia quando há mais de `maxScreens` **dispositivos** diferentes ativos.

---

## Onde o limite é aplicado

| Local | Limite de telas | Observação |
|-------|------------------|------------|
| **Jogo (VOD)** – `/jogo/[slug]` | ✅ Sim | VideoPlayer chama `stream-playback` com `gameSlug` + `deviceId`. Backend verifica `UserStreamSession` e retorna 403 quando excede. |
| **Pré-estreia** – `/pre-estreia/assistir/[slug]` | ❌ Não | Fluxo com `preSaleSlug`/sessionToken; não usa a mesma contagem de telas. |
| **Live** – `/live/[id]` | ❌ Não | A URL HLS é obtida no servidor e passada direto ao player; não passa por `stream-playback`. Para aplicar limite em lives seria necessária uma API intermediária com deviceId. |

---

## Resumo

- **“Dispositivo”** na prática = mesmo navegador na mesma máquina (localStorage é por origem). Outro navegador no mesmo PC ou o app no celular = outro dispositivo.
- **Backend:** já bloqueia quando há mais de `maxScreens` deviceIds diferentes ativos; não é necessário alterar.
