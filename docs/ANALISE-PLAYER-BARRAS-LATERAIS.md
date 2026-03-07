# Análise: barras pretas nas laterais do player

## O que você relatou
O vídeo aparece com **barras pretas à esquerda e à direita** (não em cima/embaixo). Ou seja: o player ocupa toda a largura, mas o **conteúdo do vídeo** não preenche horizontalmente — sobra espaço preto nas laterais.

---

## Onde o player é usado

| Local | Componente | Caminho |
|-------|------------|--------|
| **Jogo (replay)** | `VideoPlayer` → `StreamCustomPlayer` → `VideoPlayerCard` | `/jogo/[slug]` |
| **Live** | `StreamCustomPlayer` → `VideoPlayerCard` | `/live/[id]` |
| **Pré-estreia** | `VideoPlayer` → (Stream ou `VideoPlayerCard`) | `/pre-estreia/assistir/[slug]` |

O núcleo visual é sempre o **`VideoPlayerCard`** (HLS/HTML5). Os iframes (YouTube, Panda, Cloudflare embed) usam outros wrappers com `aspect-video`.

---

## Onde está o erro

### 1. **`VideoPlayerCard.tsx` (linha 421)**

```tsx
<video
  ref={videoRef}
  className="h-full w-full object-cover"
  ...
>
```

- **Problema:** `object-cover` faz o vídeo **preencher todo o container** cortando o que sobra. Se o container for **mais largo** que a proporção do vídeo (ex.: vídeo 4:3 dentro de 16:9), o vídeo é **esticado/cortado** para cobrir. No seu caso você vê barras **laterais**, então o comportamento real é o contrário: o vídeo está com **proporção mais alta** (ex.: 4:3 ou 9:16) dentro de um container **16:9** (`aspect-video`). Com `object-cover`, o vídeo preenche a **altura** e sobra largura → aparecem barras pretas nas **laterais**.
- **Conclusão:** Com `aspect-video` (16:9) e vídeo em outra proporção (ex.: 4:3), `object-cover` mantém a proporção do vídeo e preenche pela altura, deixando vazios laterais. O correto para **evitar barras laterais** e preencher a largura é usar **`object-contain`** — aí o vídeo inteiro aparece sem corte, mas podem surgir barras em cima/baixo se for 4:3. Se o vídeo for **mais alto que 16:9** (ex.: vertical ou 4:3), `object-contain` mostra o vídeo inteiro e as barras ficam em cima/baixo; com `object-cover` as barras ficam nas laterais.  
- **Resumo do bug:** O container é 16:9 (`aspect-video`). O vídeo real provavelmente é **4:3** (ou menos largo que 16:9). Com `object-cover`, o vídeo escala para **cobrir a altura** do container, a largura do vídeo não atinge as bordas → **barras pretas nas laterais**. Para vídeo 4:3 em container 16:9, o comportamento “sem barras laterais” seria preencher a **largura** e cortar em cima/baixo (object-cover com referência na largura), ou aceitar barras em cima/baixo com `object-contain`. O ajuste depende da prioridade: preencher largura (evitar laterais) ou mostrar vídeo inteiro.

### 2. **Container do player: `VideoPlayerCard.tsx` (linhas 413–419 e 422–424)**

```tsx
<div className={... "flex justify-center px-4 sm:px-6"}>
  <div ref={containerRef} className="... relative w-full max-w-[1100px] ...">
    <div className="... relative aspect-video bg-black ...">
      <video className="h-full w-full object-cover" />
```

- **`aspect-video`** = 16:9 fixo.
- **`object-cover`** no `<video>`: o vídeo escala mantendo proporção até **cobrir** o container; o que sobra é cortado. Se o vídeo for 4:3, ele “preenche” a altura do 16:9 e sobra espaço vazio nas laterais dentro da área do vídeo desenhada — ou o navegador desenha as barras laterais. Na prática, **object-cover + vídeo mais “quadrado” que 16:9 = barras laterais**.
- **Conclusão:** O uso de `object-cover` com um vídeo que não é 16:9 está gerando as barras laterais. Para um container 16:9 e vídeo 4:3, as opções são: (A) **object-contain** — vídeo inteiro visível, barras em cima/baixo; (B) manter **object-cover** mas garantir que o vídeo seja 16:9 na origem; (C) mudar o container para seguir a proporção do vídeo (mais complexo).

### 3. **Outros usos de player (iframes)**

- **VideoPlayer.tsx** (Stream embed, Panda, YouTube, Vimeo): todos usam `aspect-video` + `absolute inset-0 w-full h-full` no iframe. O iframe preenche o container 16:9; as barras dependem do que o player externo faz. Não há `object-fit` aqui.
- **Live e Jogo**: ambos renderizam `StreamCustomPlayer`/`VideoPlayer` dentro de `MatchPlayerPage`, que já limita a `max-w-[1100px]`. O comportamento das barras vem do `VideoPlayerCard` (item 1).

---

## Resumo do erro

| Arquivo | O que está errado |
|--------|--------------------|
| **`VideoPlayerCard.tsx`** | O `<video>` usa `object-cover` dentro de um container **16:9** (`aspect-video`). Quando o vídeo tem proporção **menos larga** que 16:9 (ex.: 4:3), o navegador escala o vídeo para cobrir a **altura**, a largura do vídeo fica menor que a do container → **barras pretas nas laterais**. |

**Causa raiz:** Combinação de container fixo 16:9 + `object-cover` + vídeo com proporção diferente (provavelmente 4:3 ou similar). Com `object-cover`, o preenchimento é pelo eixo “maior”; em vídeo 4:3 o “maior” é a altura, então sobra espaço horizontal.

---

## Ajuste recomendado (a aplicar depois)

- **Opção A (recomendada):** Trocar no `VideoPlayerCard.tsx` o `<video>` de `object-cover` para **`object-contain`**. O vídeo inteiro aparece sem corte; se for 4:3, as barras passam a ser **em cima e embaixo** (geralmente mais aceitável que laterais), e o player deixa de “cortar” conteúdo.
- **Opção B:** Manter `object-cover` mas garantir que o conteúdo HLS/vídeo seja gerado já em 16:9 na origem (encoding/transmissão), assim não haveria barras.
- **Opção C:** Calcular proporção real do vídeo (via `videoWidth`/`videoHeight` em `loadedmetadata`) e aplicar classe/object-fit dinâmico (ex.: vídeo 4:3 → container 4:3 ou object-contain), eliminando ou controlando onde aparecem as barras.

Se quiser, na próxima etapa aplico a **Opção A** (object-contain) no `VideoPlayerCard.tsx` e, se necessário, um ajuste fino no container.
