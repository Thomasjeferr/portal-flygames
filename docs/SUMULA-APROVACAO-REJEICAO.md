# Desenho: Súmula com Aprovação/Rejeição pelos Times

## Papel de cada um

- **Admin** — Só **preenche os resultados** que lhe foram passados (placar, stats dos jogadores de cada time). Não aprova nem rejeita. Não fica comprometido com o conteúdo: quem valida são os **times**.
- **Times (mandante e visitante)** — Veem a súmula preenchida pelo admin e têm botão **Aprovar** ou **Rejeitar**. Ao rejeitar, informam o **motivo**; o motivo fica visível ao admin e ao outro time, para consenso e correção.

---

## Princípios

1. **Na área dos times só aparece o que estiver aprovado** — dados ainda não aprovados por ambos os times não são exibidos como súmula oficial.
2. **Admin não se compromete** — o admin **só lança os dados** (resultados que recebeu). Quem **aprova** ou **rejeita** são os **times**. Assim a responsabilidade de validar é dos clubes.
3. **Rejeitar exige motivo** — ao rejeitar, o **time** preenche o campo “Motivo da rejeição”. Esse motivo é visível **no admin** e **para o outro time**.
4. **Consenso** — o admin vê o motivo, pode ajustar o que preencheu e republicar (ou o time que rejeitou pode voltar e aprovar após ajuste). O outro time também vê o motivo. Ciclo até os dois aprovarem.

---

## Fluxo em etapas

1. **Admin** abre **Súmula** no menu → escolhe o jogo → **preenche** placar final e estatísticas (gols, assistências, etc.) do mandante e do visitante, com base nos resultados que lhe foram passados → **Salvar** (ou “Publicar para os times”).
2. **Time mandante** e **time visitante** passam a ver a súmula no painel do time, cada um com os botões **Aprovar** e **Rejeitar** (para a súmula daquele jogo).
3. Se um **time rejeita**: obrigatório informar **motivo**. O motivo é exibido **no admin** e **para o outro time**. O admin pode corrigir os dados e salvar de novo; o time que rejeitou (e o outro) vê a nova versão e pode **Aprovar** ou **Rejeitar** de novo.
4. **Só quando ambos os times tiverem aprovado** (ou a regra que você definir), a súmula passa a ser exibida como oficial na área dos times. Até lá, pode aparecer só “Aguardando aprovação” ou versão em revisão.

---

## Diagrama em texto

```
                         ADMIN                              TIME MANDANTE / TIME VISITANTE
                         ─────                              ─────────────────────────────

  Preenche súmula        ──────────────────────────────────►
  (placar + stats
   dos dois times)
  [Salvar]

  (Não aprova nem
   rejeita)

                         Súmula fica visível para os dois times
                         (em estado “aguardando aprovação”)
                                      │
                                      ▼
                         ┌────────────────────────────────────────────────────────────┐
                         │  Cada time vê a súmula e os botões: [Aprovar] [Rejeitar]   │
                         └────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
       [Aprovar]               [Rejeitar]              (ainda não decidiu)
              │                       │
              │                 Campo "Motivo
              │                 da rejeição"
              │                 (obrigatório)
              │                       │
              ▼                       ▼
       Status do time          Motivo visível ao
       → APROVADO              ADMIN e ao OUTRO TIME
                                     │
                                     ▼
                         Admin vê motivo, pode corrigir
                         e salvar de novo
                                     │
                                     ▼
                         Times veem nova versão e podem
                         Aprovar ou Rejeitar de novo
```

---

## Estados (por time, para aquele jogo)

| Estado              | Significado |
|---------------------|-------------|
| **PENDENTE**        | Admin já preencheu a súmula; o time ainda não aprovou nem rejeitou. |
| **APROVADA**        | O time aprovou. Quando **ambos** tiverem aprovado, a súmula aparece como oficial na área dos times. |
| **REJEITADA**       | O time rejeitou e informou **motivo**. Motivo visível ao admin e ao outro time. Admin pode corrigir e salvar; volta a ficar PENDENTE (ou “em revisão”) para os times. |

(Se quiser, pode existir também um estado “Em revisão” após o admin ter alterado após uma rejeição.)

---

## O que cada um vê e faz

### Admin

- Menu lateral: **Súmula** → lista de jogos (filtros por data, time, etc.).
- Ao escolher um jogo: formulário para **preencher** (e editar):
  - Placar final (mandante x visitante).
  - Stats por jogador do **mandante** (gols, assistências, faltas, amarelo, vermelho, destaque).
  - Stats por jogador do **visitante** (idem).
- **Sem** botões Aprovar/Rejeitar. Apenas **Salvar** (ou “Enviar para os times”).
- Se algum time **rejeitou**: o admin vê o **motivo da rejeição** em destaque e pode ajustar os dados e salvar de novo.
- Pode ver status por time: “Mandante: Aprovado”, “Visitante: Rejeitado – motivo: …”.

### Painel do time (mandante ou visitante)

- **Súmulas** → lista de jogos do time.
- Ao abrir um jogo em que o admin já preencheu a súmula:
  - **Sempre visível:** dados do jogo (título, data, adversário, escudos) e o **conteúdo atual da súmula** (placar, stats dos dois times).
  - **Só é exibido como “súmula oficial” na área dos times** quando **ambos** tiverem aprovado (conforme regra definida).
  - Botões **Aprovar** e **Rejeitar**.
  - Se **Rejeitar:** campo obrigatório **Motivo da rejeição**; ao confirmar, o motivo fica visível ao **admin** e ao **outro time**.
  - Se o **outro time** rejeitou: este time vê o **motivo** informado pelo outro (transparência para consenso).
  - Após o admin corrigir e salvar, a nova versão volta a ficar pendente de aprovação dos dois times.

---

## Modelo de dados (resumo)

- **Game** (já existe): jogo, mandante, visitante. Placar e dados de súmula podem ficar no Game ou em tabelas ligadas a ele.
- **Súmula (uma por jogo):** placar e referência às stats; preenchida pelo admin.
- **Aprovação por time (por jogo):** para cada par (jogo, time):
  - `approvedAt` ou status: PENDENTE | APROVADA | REJEITADA.
  - Se REJEITADA: `rejectionReason` (texto), `rejectedAt`; visível ao admin e ao outro time.
- **PlayerMatchStats:** por jogador, por jogo, por time — gols, assistências, faltas, amarelo, vermelho, destaque (vinculado ao elenco / TeamMember).

---

## Resumo: quem faz o quê

| O que você pediu | Como ficou no desenho |
|------------------|------------------------|
| Admin não se comprometer | Admin **só preenche** os resultados que lhe foram passados. **Não** aprova nem rejeita. |
| Botão aprovar ou rejeitar | Os **times** têm os botões **Aprovar** e **Rejeitar** (no painel do time). |
| Ao rejeitar, campo de motivo | O **time** que rejeita preenche o **Motivo da rejeição** (obrigatório). |
| Motivo reflete no admin e para o outro time | O motivo fica visível **no admin** (para poder corrigir) e **para o outro time** (transparência e consenso). |
| Consenso: edição/reenvio até aceitar | Admin vê o motivo, corrige e salva; os times veem a nova versão e podem **Aprovar** ou **Rejeitar** de novo. Repete até ambos aprovarem. |
| Só aparecer na área dos times o que for preenchido e aprovado | Na área dos times, a súmula só é exibida como **oficial** quando estiver preenchida e, conforme a regra, **ambos os times tiverem aprovado**. |

Se quiser, no próximo passo dá para detalhar as telas (admin só preenchimento; painel do time com Aprovar/Rejeitar e motivo) ou o schema exato das tabelas para implementação.
