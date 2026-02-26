# Ideias para a aba "Como funciona" na dashboard do parceiro

Este documento reúne as ideias usadas na página **Como funciona** e sugestões de evolução.

---

## Objetivo da aba

- Explicar de forma clara **como o programa de parceiros funciona**, para que o parceiro não precise adivinhar ou perguntar.
- Reduzir dúvidas sobre: quando ganha, como recebe, por que às vezes “perde” uma indicação.
- Reforçar o uso do **link com código** e direcionar para Meu link, Indicações e Comissões.

---

## Conteúdo implementado

1. **Introdução** – Uma frase: você indica com seu link, quando o cliente compra você ganha comissão.
2. **Passo a passo (4 etapas)**  
   - Compartilhe seu link  
   - O cliente acessa e compra  
   - Pagamento confirmado → comissão registrada  
   - Receber: comissões liberadas → solicitar saque (Pix)
3. **Em que você ganha** – Lista dos percentuais do parceiro (planos, jogos, patrocínio), com nota sobre % próprio do plano quando existir.
4. **Dica importante** – Usar sempre o link com código para não perder a indicação; link para “Meu link”.
5. **Como receber o dinheiro** – Onde ver comissões, como solicitar saque (Pix), prazo/contato.
6. **Perguntas frequentes (3 itens)**  
   - Quando a indicação é contada?  
   - O cliente não usou meu link. E agora?  
   - Onde vejo indicações e comissões?

---

## Ideias de evolução (opcional)

- **Vídeo curto** – “Em 1 minuto: como funciona” (embed na página ou link).
- **Exemplo de mensagem** – Texto pronto para WhatsApp/Instagram com o link, para o parceiro copiar.
- **Gráfico ou número** – “Você já indicou X pessoas” ou “R$ Y em comissões este mês” (se já houver dados na API).
- **Checklist** – “Já compartilhei meu link”, “Já expliquei para o cliente usar o link”, etc.
- **Link para termos/regulamento** – Se existir documento do programa de parceiros.
- **Contato do suporte** – Botão ou link “Dúvidas? Fale conosco” (WhatsApp ou e-mail).

---

## Onde está no código

- **Rota:** `/parceiro/como-funciona`
- **Layout:** Aba “Como funciona” adicionada no `layout.tsx` do parceiro (primeira aba).
- **Página:** `src/app/parceiro/como-funciona/page.tsx`
- **Mockup:** `assets/parceiro-como-funciona-mockup.png` (referência visual da tela).
