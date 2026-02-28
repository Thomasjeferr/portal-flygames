# Premiação do campeonato – ideias para formulário e página pública

## Objetivo
Destacar no admin (ao criar/editar campeonato) e na página pública do campeonato:
- **Prêmios em dinheiro:** 1º R$ 30.000, 2º R$ 15.000, 3º R$ 4.000, 4º R$ 1.000
- **Troféus:** Campeão, Vice-campeão, 3º lugar, 4º lugar, Artilheiro, Capa da Copa

---

## Ideia 1 – Formulário no admin (criar/editar campeonato)

### Nova seção: **Premiação**
- **Tipo de premiação** (opcional): texto livre, ex. “Premiação em dinheiro e troféus”.
- **Prêmios em dinheiro (R$):**
  - 1º lugar: [ 30000 ] (número, opcional)
  - 2º lugar: [ 15000 ]
  - 3º lugar: [ 4000 ]
  - 4º lugar: [ 1000 ]
- **Troféus e premiações especiais** (checkboxes):
  - [ ] Troféu Campeão  
  - [ ] Troféu Vice-campeão  
  - [ ] Troféu 3º lugar  
  - [ ] Troféu 4º lugar  
  - [ ] Troféu Artilheiro  
  - [ ] Capa da Copa  

Colocada **abaixo** de “Meta (apoiadores)” / “Status”, para não poluir o topo do formulário. Só exibir ou destacar quando houver pelo menos um valor ou um troféu marcado.

### Modelo de dados (sugestão)
No modelo **Tournament** (Prisma):
- `prizeLabel` (String, opcional) – ex.: “Premiação em dinheiro e troféus”
- `prize1Cents`, `prize2Cents`, `prize3Cents`, `prize4Cents` (Int?, opcional) – valores em centavos
- `prizeTrophyChampion`, `prizeTrophyVice`, `prizeTrophyThird`, `prizeTrophyFourth` (Boolean, default false)
- `prizeTrophyTopScorer` (Boolean, default false)
- `prizeTrophyCapaCopa` (Boolean, default false)

Ou um único JSON: `prizesConfig` com toda a premiação (mais flexível, menos tipado).

---

## Ideia 2 – Página pública do campeonato

### Bloco “Premiação”
- Título: **Premiação** (ou o texto de `prizeLabel` se existir).
- **Prêmios em dinheiro:** cards ou lista:
  - 1º lugar – R$ 30.000
  - 2º lugar – R$ 15.000
  - 3º lugar – R$ 4.000
  - 4º lugar – R$ 1.000
- **Troféus:** ícone de troféu + texto, ex.: “Campeão, Vice, 3º e 4º lugar • Artilheiro • Capa da Copa”.

Layout sugerido: mesma identidade visual da página (tema escuro, cores do portal), com destaques para os valores em dinheiro e uma linha compacta para os troféus.

---

## Resumo
1. **Admin:** seção “Premiação” no formulário de criar/editar campeonato com tipo (opcional), 4 campos de valor em reais e 6 checkboxes de troféus.
2. **Página pública:** bloco “Premiação” exibindo valores e lista de troféus com base nesses dados.
3. **Banco:** novos campos em `Tournament` (ou um JSON `prizesConfig`) para persistir a premiação.

**Imagens de referência (mockups):**
- **Admin – formulário premiação:** `assets/admin-form-premiacao-mockup.png`
- **Página pública – bloco premiação:** `assets/pagina-publica-premiacao-mockup.png`
