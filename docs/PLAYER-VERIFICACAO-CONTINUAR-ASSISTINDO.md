# Verificação do player — Continuar assistindo e visual (YouTube-like)

Documento de análise **antes** de implementar. Não altera código.

---

## 1. O que temos hoje

### 1.1 Dois caminhos de reprodução (jogos com Cloudflare Stream)

| Caminho | Componente | Quando é usado | Controle de posição? |
|--------|------------|----------------|----------------------|
| **HLS** | `StreamCustomPlayer` (Video.js) | Sempre que existe `hlsUrl` ou `streamHlsUrl` | **Sim** — temos acesso ao elemento de vídeo (currentTime, duration, seek). |
| **Iframe** | `<iframe>` com URL do Cloudflare | Só quando **não** há HLS (ex.: fallback) | **Não** — iframe é cross-origin, não dá para ler/gravar posição. |

Na página do jogo (`/jogo/[slug]`), o backend entrega **os dois**: `streamPlaybackUrl` (iframe) e `streamHlsUrl` (HLS). O `VideoPlayer` **prioriza HLS**:

```ts
if (isStream && (hlsUrl || streamHlsUrl)) {
  return <StreamCustomPlayer hlsUrl={hlsUrl || streamHlsUrl} title={title} />;
}
```

Ou seja: para jogos com vídeo Cloudflare, na prática o usuário usa o **StreamCustomPlayer** (Video.js). Isso é o que precisamos para “Continuar assistindo” com posição.

### 1.2 Onde o player é usado

- **`/jogo/[slug]`** — Jogo com vídeo: `VideoPlayer` → quando é Stream + HLS → `StreamCustomPlayer`. ✅ Candidato a progresso/seek.
- **`/live/[id]`** — Live/replay: usa embed/iframe (Cloudflare). ❌ Sem controle de posição da nossa aplicação.
- **`/pre-estreia/assistir/[slug]`** — Pré-estreia: `VideoPlayer` com `streamContext`; se tiver HLS, usa `StreamCustomPlayer`. ✅ Candidato (se quiser progresso na pré-estreia).
- **`/resultados/[slug]`** — Só súmula/estatísticas, sem player de vídeo.

Para a funcionalidade “Continuar assistindo” com **retomar de onde parou**, o foco é a **página do jogo** (`/jogo/[slug]`) com **StreamCustomPlayer**.

### 1.3 StreamCustomPlayer — capacidades técnicas

- **Biblioteca:** Video.js + HLS (VHS).
- **API do Video.js:**  
  - `player.currentTime()` → posição atual (segundos).  
  - `player.currentTime(seconds)` → seek.  
  - `player.duration()` → duração (quando disponível).  
- **O que já existe:** controles nativos (play/pause, barra de progresso, volume, fullscreen), qualidade (plugin), preload metadata.
- **O que não existe ainda:**  
  - Nenhuma prop para **posição inicial** (ex.: `initialTimeSeconds` para abrir já no minuto certo).  
  - Nenhum callback ou efeito para **reportar posição** (timeupdate) para salvar no backend (WatchProgress).

Conclusão: o player **corresponde** ao que precisamos no sentido de que **suporta** currentTime/seek/duration; falta **integrar** isso (props + salvamento periódico de posição).

---

## 2. O que precisamos para “Continuar assistindo” (Forma 2)

| Necessidade | Situação no player atual |
|-------------|---------------------------|
| **Seek ao abrir** | Não implementado. Precisamos: receber `initialTimeSeconds` (ex. da API/watch-progress) e, no `StreamCustomPlayer`, após `loadedmetadata` ou primeiro `canplay`, fazer `player.currentTime(initialTimeSeconds)`. |
| **Salvar posição** | Não implementado. Precisamos: no `StreamCustomPlayer` (ou no `VideoPlayer` com gameId), a cada X segundos ou em `timeupdate`, enviar `positionSeconds` para `PATCH /api/me/watch-progress` com `gameId`. |
| **Só para HLS** | OK. A página do jogo já usa `StreamCustomPlayer` quando há HLS. YouTube/Vimeo/iframe continuam sem retomar posição (só lista “recentemente vistos” se quisermos). |

Nenhuma mudança de **tipo** de player é necessária; só **estender** o `StreamCustomPlayer` (e, se desejado, o `VideoPlayer`) com essas props e chamadas de API.

---

## 3. Visual do player — cores e estilo “YouTube-like”

### 3.1 Cores do projeto (Tailwind)

- **futvar-green:** `#22C55E`  
- **futvar-green-dark:** `#16A34A`  
- **futvar-green-light:** `#4ADE80`

### 3.2 Cores no StreamCustomPlayer (hoje)

- Progresso / volume: `#00d26a` (verde) e `#00a854` (verde mais escuro).  
- Big play: `rgba(0, 210, 106, 0.9)`.

Ou seja: o player usa um verde **diferente** do Tailwind (`#00d26a` vs `#22C55E`). Para manter “nossas cores” de forma consistente, vale alinhar com o tema:

- Usar `#22C55E` (futvar-green) como cor principal do player, ou  
- Definir variáveis CSS a partir do tema (ex.: `var(--color-futvar-green)` se existir) para progresso, botão de play e hover.

### 3.3 Estilo “parecido com YouTube” (comandos)

- **YouTube:** barra de progresso em baixo, clicável/arrastável; play/pause; volume; tempo atual / duração; fullscreen; controles que somem ao assistir e voltam ao mover o mouse.
- **Nosso player (Video.js):**  
  - Barra de progresso embaixo ✅  
  - Play/pause, volume, fullscreen ✅  
  - Tempo atual e duração: Video.js tem por padrão (vjs-current-time, vjs-duration-time). Vale checar se estão visíveis e legíveis.  
  - Controles que somem: já temos (“vjs-user-inactive” esconde a barra ao reproduzir; hover mostra de novo) ✅  

Para ficar **mais** parecido com o YouTube mantendo nossas cores:

1. **Cores:** trocar `#00d26a` / `#00a854` para as cores do tema (`#22C55E` e `#16A34A`) ou variáveis equivalentes.  
2. **Barra de progresso:** garantir que seja bem clicável/arrastável (Video.js já permite; pode ajustar altura ou hit-area se precisar).  
3. **Texto de tempo:** garantir que “0:00 / 1:23:45” esteja visível e com bom contraste (ex.: branco no fundo escuro da barra).  
4. **Aparência geral:** barra em gradiente escuro no rodapé já existe; pode refinar cantos ou altura para lembrar mais o YouTube, sem mudar a estrutura.

Nada disso exige trocar de biblioteca; só CSS e, se quisermos, pequenos ajustes de layout dos controles do Video.js.

---

## 4. Resumo

| Pergunta | Resposta |
|----------|----------|
| O player atual **suporta** posição (seek) e duração? | **Sim**, quando é **StreamCustomPlayer** (HLS), que é o caso da página do jogo. |
| Precisamos trocar de player? | **Não.** Só estender com `initialTimeSeconds` e callback/interval para salvar posição. |
| O visual já usa “nossas cores”? | **Parcialmente** — verde próximo, mas hex diferente do Tailwind. Dá para alinhar com futvar-green (#22C55E). |
| Dá para deixar “parecido com YouTube” nos comandos? | **Sim.** Controles já são no mesmo estilo (barra embaixo, play, volume, tempo, fullscreen, controles que somem). Ajustes são de cor e de refinamento (tempo visível, barra clicável). |

Recomendação: **antes de implementar** “Continuar assistindo” e WatchProgress, (1) alinhar as cores do `StreamCustomPlayer` ao tema (futvar-green) e (2) conferir na interface que tempo atual/duração e barra de progresso estão bem visíveis e usáveis. Em seguida, implementar a Forma 2 (tabela WatchProgress, APIs, `initialTimeSeconds` + salvamento de posição no `StreamCustomPlayer`).
