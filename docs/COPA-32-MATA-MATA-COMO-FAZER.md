# Copa 32 times – Mata-mata: como fazer

Plano: **promover uma copa no final do ano com 32 times, mata-mata**. No futuro, campeonato semestral ou por temporada. Este doc foca na **copa de 32 em mata-mata**.

---

## 1. Estrutura do mata-mata (32 times)

- **32 times** → 16 jogos na 1ª fase (round of 32)
- **16 vencedores** → 8 jogos (oitavas)
- **8 vencedores** → 4 jogos (quartas)
- **4 vencedores** → 2 jogos (semifinal)
- **2 vencedores** → 1 jogo (final)

**Total: 31 jogos.**  
Cada jogo tem mandante, visitante, data e placar; o vencedor “avança” para um jogo da fase seguinte (até a final).

---

## 2. O que o sistema já tem (e reaproveitamos)

- **Times (Team)** – cadastro completo; podemos escolher 32 para a copa.
- **Jogos (Game)** – mandante, visitante, data, placar (homeScore, awayScore), championship (texto), categoria, etc.
- **Resultados e súmula** – fluxo atual de aprovação continua igual.

Ou seja: cada partida da copa **é um Game**. O que falta é **organizar** esses jogos como “uma copa”: qual competição, qual fase, e quem avança para qual jogo.

---

## 3. O que precisamos acrescentar (conceito)

Para “promover uma copa” e não só uma lista solta de jogos, precisamos de:

| Conceito | Para que serve |
|----------|----------------|
| **Competição / Copa** | Uma “edição” da copa (ex.: Copa Futvar 2025). Agrupa os 31 jogos e as inscrições. |
| **Inscrições** | Quais 32 times participam desta copa. (Times já cadastrados no portal; só “inscrever” na copa.) |
| **Fase / Rodada da chave** | Em qual etapa da chave está o jogo: 1ª fase (32→16), oitavas (16→8), quartas (8→4), semi (4→2), final (2→1). |
| **Chaveamento** | Saber qual jogo “alimenta” qual: ex. vencedor do jogo 1 + vencedor do jogo 2 vão para o jogo 17 (oitavas). Assim, ao preencher o resultado do jogo 1, o sistema pode colocar o vencedor no jogo 17 (mandante ou visitante). |

Com isso dá para:
- Criar a copa e inscrever 32 times.
- Fazer o sorteio (quem joga contra quem na 1ª fase).
- Gerar os 31 jogos (com fase e posição na chave).
- Preencher resultados e, com 1 clique (ou automático), levar o vencedor para o próximo jogo.

---

## 4. Como fazer na prática (fluxo sugerido)

### Passo 1 – Cadastrar a Copa

- Criar **uma competição** (ex.: “Copa Futvar 2025”).
- No sistema: uma entidade **Competition** (ou **Copa**) com: nome, ano, tipo = “copa” (mata-mata), número de times = 32, status (inscrições abertas / sorteio realizado / em andamento / encerrada).

Hoje não existe isso; pode ser uma nova tabela ou, no início, usar uma **Category** só para essa copa e o texto `championship = "Copa Futvar 2025"` em todos os 31 jogos. Para evoluir (sorteio, chave, avanço automático), o ideal é ter **Competition** + vínculo do jogo com a competição e com a fase/posição na chave.

### Passo 2 – Inscrições (32 times)

- Definir **quais 32 times** participam.  
- Reaproveitar os **times já cadastrados** (Team): tela ou planilha onde o admin escolhe 32 times e “inscreve” na copa.  
- No sistema: tabela **CompetitionTeam** (competitionId, teamId) com 32 registros para essa copa.

### Passo 3 – Sorteio (1ª fase)

- Definir os **16 jogos da 1ª fase**: quem joga contra quem (par 1 vs par 2, par 3 vs par 4, …).  
- Pode ser:
  - **Manual**: admin escolhe os 16 confrontos.
  - **Sorteio**: sistema embaralha os 32 e monta os pares (jogo 1: time A x time B, jogo 2: time C x time D, …).

Resultado: lista de 16 jogos com mandante e visitante definidos.

### Passo 4 – Gerar os 31 jogos da chave

- Criar **31 registros de Game** no banco:
  - 16 da 1ª fase (já com home e away definidos pelo sorteio).
  - 8 das oitavas, 4 das quartas, 2 da semi, 1 da final – inicialmente **sem** mandante/visitante (ou “A definir”).
- Cada jogo deve ter:
  - `championship` = "Copa Futvar 2025" (ou vínculo com a Competition).
  - **Fase** (ex.: round: 1, 2, 3, 4, 5 para 1ª fase, oitavas, quartas, semi, final).
  - **Posição na chave** (ex.: bracketPosition: "R32-1", "R32-2", … "R16-1", … "FINAL").
  - **Vínculo “próximo jogo”**: ex. jogo R32-1 e R32-2 alimentam R16-1; R16-1 e R16-2 alimentam QF-1; etc. Assim, ao salvar o resultado do R32-1, o sistema sabe que o vencedor vai para o R16-1 (mandante ou visitante, conforme convenção).

### Passo 5 – Preencher resultados e avançar vencedores

- **Por jogo**: admin coloca placar no jogo (igual hoje).  
- **“Com 1 clique”**: ao salvar o resultado, o sistema:
  - Calcula o vencedor (quem fez mais gols; ou critérios para empate, se houver).
  - Procura o “próximo jogo” (ex.: R16-1).
  - Coloca esse time como mandante ou visitante no próximo jogo (convenção fixa: ex. vencedor do jogo 1 sempre mandante do próximo; vencedor do jogo 2 sempre visitante).

Assim, não precisa preencher manualmente mandante/visitante das oitavas em diante: o sistema preenche com 1 clique ao aprovar o resultado da fase anterior.

---

## 5. Resumo: o que criar no sistema

| Item | Reaproveita | Novo |
|------|-------------|------|
| Times | ✅ 32 times já cadastrados (Team) | Só “inscrever” na copa (CompetitionTeam ou equivalente). |
| Jogos | ✅ Mesmo model Game (mandante, visitante, data, placar) | Campos extras: competição, fase/rodada, posição na chave, “próximo jogo” (para avanço automático). |
| Formulário de jogo | ✅ Pode ser o mesmo (editar jogo, colocar placar) | Botão “Avançar vencedor” ou lógica ao salvar: preenche o próximo jogo com o vencedor. |
| Competição / Copa | — | Nova entidade (Competition/Copa) + tela no admin: criar copa, inscrever 32 times, sortear, gerar 31 jogos. |

Não é obrigatório criar um **formulário completamente novo** para os jogos: o que existe hoje (cadastro de jogo com times e placar) serve. O “novo” é:
- a **gestão da copa** (competição, inscrições, sorteio, geração da chave),
- e a **regra de avanço** (ao preencher resultado, preencher o próximo jogo com o vencedor).

Para “resultados automáticos com 1 clique”, o 1 clique pode ser: **ao salvar o resultado do jogo**, o sistema já avançar o vencedor para o próximo jogo. Opcionalmente, uma tela “Resultados em lote” pode listar os jogos da 1ª fase e permitir preencher vários placares de uma vez e, em seguida, rodar “Avançar todos os vencedores” para preencher as oitavas.

---

## 6. Campeonato futuro (semestral / temporada)

Para um **campeonato por rodadas** (todos contra todos ou turno único), a ideia é a mesma:
- **Competição** (ex.: Campeonato Futvar 2026 – 1º semestre).
- **Times inscritos** (N times).
- **Jogos** com **rodada** (1, 2, 3, …); cada rodada tem vários jogos.
- **Tabela** calculada a partir dos resultados (pontos, vitórias, empates, gols).

A diferença em relação à copa é: não há “próximo jogo” por vencedor; há rodadas fixas e tabela. O modelo de Competition + jogos vinculados (com fase/rodada) serve para os dois: na copa, a “fase” é a etapa da chave; no campeonato, a “rodada” é o número da rodada. Podemos detalhar esse fluxo em outro doc quando decidir (semestral vs temporada).

---

## 7. Próximos passos sugeridos

1. **Decidir** se a primeira versão é “só organizar” (criar 31 jogos manualmente, championship = "Copa Futvar 2025", sem avanço automático) ou já com **competição + chave + avanço de vencedor**.
2. Se for com chave e avanço: desenhar o **schema** (Competition, CompetitionTeam, e em Game: competitionId, round, bracketPosition, nextGameId ou equivalente).
3. Implementar: **admin** – Criar copa → Inscrições (32 times) → Sorteio → Gerar 31 jogos → Ao salvar resultado, avançar vencedor para o próximo jogo (1 clique ou automático).

Se quiser, o próximo passo pode ser um desenho do schema (campos exatos) e das telas do admin (lista de copas, detalhe da copa com inscrições, botão “Sortear”, botão “Gerar chave”, e comportamento ao salvar resultado).
