# Aviso ao usuário: plano degustação / assinatura acabou

## Situação atual

- **Header (dropdown):** exibe apenas "Assinatura inativa" quando a assinatura expirou.
- **Minha conta:** exibe "Sua assinatura está inativa." e o botão "Ver planos".
- Não há mensagem específica para "seu plano degustação acabou" nem banner de destaque.

---

## Onde mostrar o aviso

| Local | Uso | Implementado |
|-------|-----|--------------|
| **Header (menu do usuário)** | Ao abrir o dropdown, usuário vê status + mensagem curta e link para Planos. | Sim |
| **Banner no topo da página** | Barra fixa abaixo do header quando assinatura inativa; CTA "Assinar plano". | Sim |
| **Página Minha conta** | Bloco de assinatura com mensagem clara e botão "Ver planos". | Sim |
| **Ao tentar assistir conteúdo restrito** | Modal ou mensagem na tela do player: "Sua assinatura acabou. Assine um plano para continuar." | Sugerido (já existe texto genérico de acesso) |
| **E-mail** | Opcional: e-mail transacional quando o período de degustação está perto do fim (ex.: 1 dia antes) ou quando acaba. | Sugerido |

---

## Sugestões de mensagem

### Curta (header / banner)
- **"Sua assinatura ou período de degustação acabou. Assine um plano para continuar assistindo."**
- Alternativa: "Seu acesso acabou. Renove em Planos para continuar assistindo."

### Página Minha conta
- **"Seu período de degustação (ou sua assinatura) acabou. Para continuar assistindo aos jogos, assine um plano."**
- Botão: **"Ver planos"** ou **"Assinar plano"**.

### Ao tentar reproduzir vídeo sem acesso
- **"Sua assinatura acabou. Assine um plano para continuar assistindo a este conteúdo."** + link para /planos.

### E-mail (sugestão)
- **Assunto:** "Seu período de degustação termina em breve"
- **Corpo:** "Olá, [nome]. Seu período de degustação do Fly Games termina em [data]. Para continuar assistindo, assine um plano em [link]."

---

## Resumo

- Avisos implementados: **Header** (texto + link), **Banner** (barra no topo) e **Minha conta** (mensagem e botão).
- Mensagem unificada usada: **"Sua assinatura ou período de degustação acabou. Assine um plano para continuar assistindo."**
