# Android: fullscreen não segura e volta sozinho

Cenário: no **mobile Android**, ao clicar em fullscreen o vídeo entra em tela cheia mas **não segura** — volta sozinho em seguida. A ideia é que permaneça em full até o usuário girar para horizontal e, ao **voltar para vertical**, aí sim saia automaticamente.

---

## O que o código faz hoje (Android)

- **Mobile** é detectado por `ontouchstart` ou `window.innerWidth <= 768`.
- No mobile usamos, nesta ordem:
  1. **Fullscreen nativo do vídeo**: `video.webkitEnterFullscreen` / `video.webkitEnterFullScreen` / `video.requestFullscreen`.
  2. Se não existir, **fullscreen do container**: `container.requestFullscreen` (e variantes webkit/moz/ms).
- Não há nenhum listener de **orientation** nem **resize** no nosso código; só sincronizamos estado com os eventos de fullscreen do **documento** (`fullscreenchange`, `webkitfullscreenchange`, etc.).

---

## Causa provável: navegador/sistema em retrato

Em muitos dispositivos/versões do **Chrome no Android** (e em outros browsers que seguem o mesmo tipo de comportamento):

1. O usuário está em **portrait** (vertical).
2. Ele toca em fullscreen → chamamos `requestFullscreen()` (no vídeo ou no container).
3. O fullscreen **entra** (a API aceita).
4. O **navegador ou o sistema** trata fullscreen de vídeo como “modo landscape”: se a tela continua em portrait, o fullscreen é **encerrado logo em seguida** (por política do browser/Android).
5. Dispara `fullscreenchange` com `fullscreenElement === null`.
6. Nosso `onFsChange` roda e faz `setIsFullscreen(false)` — só refletimos o que já aconteceu; **não somos nós que saímos do fullscreen**.

Ou seja: **quem “volta” não é o nosso código, e sim o comportamento do Chrome/Android quando o fullscreen é solicitado/ mantido em portrait**. Não temos como “impedir” essa saída automática do fullscreen nativo a partir de JavaScript.

---

## Comportamento desejado (resumo)

- Fullscreen deve **permanecer** por um tempo (ou até o usuário girar), dando chance de colocar o celular na **horizontal**.
- Só quando o usuário **voltar a tela para vertical** é que o fullscreen deve **sair automaticamente**.

Isso implica:
- Enquanto estiver em **portrait**, não depender do fullscreen nativo (que o browser pode matar).
- Ter controle sobre “entrar/sair” de um modo full que **resista** em portrait e só saia quando detectarmos **mudança para portrait** (ou o usuário sair manualmente).

---

## Opções de ajuste (antes de implementar)

### 1. **Fullscreen “falso” (CSS) no Android em portrait** — mais alinhado ao que você descreveu

- **Quando:** Android + dispositivo em **portrait** + usuário toca em fullscreen.
- **O que fazer:** Não chamar `requestFullscreen()`; entrar num fullscreen **por CSS** (overlay `fixed` cobrindo a tela), igual ao “fake fullscreen” que já existe no desktop.
- **Vantagem:** O navegador não encerra esse overlay; ele fica “full” até a gente sair.
- **Quando sair:**
  - **Opção A:** Só ao usuário tocar de novo no botão “sair fullscreen” (como hoje).
  - **Opção B (o que você pediu):** Usar `orientationchange` / `resize`: enquanto estiver em **landscape**, manter full (fake ou, se quiser, tentar full nativo em landscape). Quando detectar **volta para portrait**, sair do full automaticamente (e, se estiver em full nativo, chamar `exitFullscreen()`).

Assim: em portrait o full “segura” (é o nosso overlay); em landscape podemos até tentar full nativo; ao voltar para vertical, saída automática.

### 2. **Só ignorar saída automática em portrait (não recomendado)**

- Quando `fullscreenchange` disparar com `fullscreenElement === null` e o dispositivo estiver em portrait, **não** atualizar estado (não chamar `setIsFullscreen(false)`) ou até tentar **reentrar** em fullscreen.
- **Problema:** O fullscreen nativo já foi encerrado pelo browser; a tela já voltou. Só estaríamos desincronizando estado da UI do estado real (e reentrar em fullscreen em portrait tende a ser fechado de novo). Não resolve o “não segura” e piora a consistência.

### 3. **Sempre fullscreen “falso” no Android**

- No Android, nunca usar Fullscreen API; sempre usar o overlay em CSS (como no desktop quando não há API).
- **Vantagem:** Controle total: podemos sair só ao toque no botão ou ao detectar **orientationchange** para portrait.
- **Desvantagem:** Em landscape não teríamos o fullscreen nativo do sistema (barra de status etc. podem continuar visíveis, dependendo do dispositivo).

---

## Resumo

| Ponto | Conclusão |
|-------|-----------|
| Quem faz o fullscreen “voltar” | Navegador/sistema ao achar que fullscreen em portrait não é permitido; não é nosso código que chama `exitFullscreen()`. |
| Nosso código | Só reage a `fullscreenchange`; não há listener de orientação hoje. |
| Objetivo | Full “segurar” (em portrait também) e sair **só** quando o usuário voltar a tela para vertical (ou ao toque no botão). |
| Caminho recomendado | Usar **fullscreen falso (CSS)** no Android quando em **portrait** e, com **orientationchange** (e/ou **resize**), **sair automaticamente** quando a orientação voltar a portrait. Em **landscape** podemos manter fake ou tentar full nativo, conforme o que ficar mais estável no seu teste. |

Se quiser, o próximo passo é implementar exatamente essa lógica: Android + portrait → fullscreen falso; ao detectar volta para portrait → sair do full automaticamente; em landscape opcionalmente tentar full nativo.