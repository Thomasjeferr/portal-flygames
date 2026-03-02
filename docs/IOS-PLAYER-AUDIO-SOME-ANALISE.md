# iOS: áudio some ao sair e voltar no player e dar play

Cenário: no **iOS**, no **Google Chrome** (não Safari), ao sair do player (fullscreen ou trocar de aba/app) e voltar e dar **play** manualmente (sem autoplay), o **áudio some**.

---

## Contexto

- **Navegador:** Google Chrome no iOS (usa WebKit por exigência da Apple, então comportamentos de fullscreen e áudio podem ser parecidos com Safari).
- **Play:** disparado pelo usuário (toque no botão), **não** é autoplay — então não é política de “user gesture” nem fallback de autoplay mutando o vídeo.

---

## Pontos que podem causar o problema

### 1. **Saída do fullscreen nativo do vídeo (iOS / Chrome)** — mais provável  
No iOS (Chrome inclusive) usamos `video.webkitEnterFullscreen()` para tela cheia. Ao sair (`webkitendfullscreen`), o WebKit pode deixar o elemento `<video>` com **`muted = true`** ou a sessão de áudio inativa.  
No código atual não há tratamento em `webkitendfullscreen`: não reaplicamos `video.muted = false` nem o `volume` que o usuário tinha.  
**Efeito:** usuário sai do fullscreen → o vídeo fica mudo → ao dar play de novo (manual), o vídeo toca sem som.

### 2. **Política de autoplay / user gesture** — descartado neste cenário  
O play é **manual** (toque no botão), então não é bloqueio por falta de “user gesture”. Pode ser ignorado como causa.

### 3. **Sessão de áudio ao ir para background (Chrome no iOS)**  
Quando o app/tab vai para background (`visibilityState === 'hidden'`), o sistema pode pausar o vídeo e liberar a sessão de áudio. Ao voltar, no Chrome/iOS a sessão pode não ser reativada e o elemento pode ficar com **muted** ou sem áudio até uma interação.  
Hoje só fazemos `saveProgress()` quando fica `hidden`; não há lógica ao voltar (`visible`) para forçar `video.muted = false` antes do próximo play manual.

### 4. **Estado de `muted`/`volume` ao remontar o componente**  
Se “sair e voltar” for **trocar de página** (sair da página do jogo e voltar), o componente desmonta e monta de novo. O estado inicial é `isMuted = false` e `volume = 1`, mas o `<video>` não recebe `muted={false}` no JSX. O valor real vem de `loadedmetadata` e `volumechange`.  
Se no Chrome/iOS o vídeo vier do cache e esses eventos não dispararem de forma consistente, ou o elemento vier em estado “mudo” do navegador, o áudio pode continuar mudo até o usuário mexer no controle de volume.

### 5. **Autoplay com fallback para muted** — descartado  
O play é manual, não autoplay. O `tryAutoplay()` que coloca `muted = true` em falha não entra nesse fluxo. Pode ser ignorado como causa.

### 6. **HLS e trilha de áudio no Chrome/iOS após background**  
Com o player em background, o HLS pode pausar ou desanexar o buffer. Ao voltar e dar play manualmente, em alguns casos a trilha de áudio pode não ser reanexada. É mais dependente do navegador; reaplicar `muted = false` ao sair do fullscreen e ao voltar para `visible` ajuda a mitigar.

---

## Resumo

| # | Causa provável | Onde atuar |
|---|----------------|------------|
| 1 | Chrome/iOS deixa o vídeo mudo ao sair do fullscreen nativo | Tratar `webkitendfullscreen`: reaplicar `muted = false` (e volume) conforme estado do usuário |
| 2 | User gesture / autoplay | Descartado — play é manual |
| 3 | Sessão de áudio inativa ao voltar do background | Ao passar para `visible`, garantir `video.muted = false` (ou no momento do play) |
| 4 | Estado do `<video>` ao remontar (cache/eventos) | Garantir `muted={false}` no `<video>` ou reaplicar no `loadedmetadata`/ao montar |
| 5 | Autoplay fallback mutando o vídeo | Descartado — não há autoplay neste fluxo |
| 6 | HLS/trilha de áudio após background | Mitigar com 1 e 3 |

**Recomendação:** Como o play é manual no **Chrome no iOS**, as causas mais plausíveis são: **(1)** fullscreen nativo deixando o vídeo mudo ao sair e **(3)** voltar da aba/app sem reativar o áudio. Implementar tratamento em **`webkitendfullscreen`** e, se necessário, em **`visibilitychange`** ao voltar para `visible`, forçando **`video.muted = false`** (e restaurando `volume` pelo estado do React), para que ao “sair e voltar no player e dar play” o áudio volte.
