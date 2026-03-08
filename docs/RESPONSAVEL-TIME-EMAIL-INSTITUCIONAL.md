# E-mail do responsável do time: uso de e-mail institucional

## Contexto

- No cadastro do time, o **e-mail do responsável** é o e-mail da **conta logada** (campo fixo/readOnly).
- Contas que são **responsáveis por time** (TeamManager ou `responsibleEmail`) **não podem comprar** no portal: nem assinatura, nem jogo avulso, nem patrocínio.
- Quem já tem compras não pode cadastrar time como responsável (precisa usar outro e-mail).

**Problema:** Se o responsável cadastra o time com o **e-mail pessoal**, essa conta fica bloqueada para compras. Para ele mesmo patrocinar o time ou assinar como torcedor, precisaria usar **outro** e-mail. Por isso faz sentido orientar: **usar e-mail do time** no cadastro, deixando o e-mail pessoal livre para uma segunda conta (cliente/patrocinador).

---

## Ideias de solução

### 1. **Texto de orientação na página de cadastro** (recomendado)
- Logo abaixo do título ou em um box acima do formulário, explicar em uma frase:
  - *"Recomendamos usar uma conta com e-mail institucional do time (ex: contato@seudotime.com). Assim você pode usar seu e-mail pessoal em outra conta para assinar ou patrocinar o time."*
- Junto ao campo "E-mail do responsável", trocar ou complementar o texto atual por:
  - *"Esta conta ficará vinculada ao painel do time e não poderá realizar compras (assinatura/patrocínio). Para patrocinar depois, use outra conta com seu e-mail pessoal."*

### 2. **Orientação na página "Para times"**
- Antes do botão "Ir para cadastro do time", incluir um aviso:
  - *"Dica: prefira criar uma conta com o e-mail do time (ex: contato@time.com). Assim seu e-mail pessoal continua livre para você usar como torcedor ou patrocinador."*

### 3. **Box de aviso no topo do formulário de cadastro**
- Um box em destaque (info/aviso) no início do form:
  - *"Esta conta será a responsável pelo time. Ela não poderá ser usada para comprar planos ou patrocínios. Quer poder patrocinar o time com seu e-mail pessoal? Saia e crie uma conta com o e-mail do time, depois volte aqui para cadastrar."*
- Opcional: link "Sair e criar conta" (logout + redirect para /cadastro com returnUrl para /times/cadastrar).

### 4. **E-mail de confirmação**
- No e-mail enviado após "Cadastro recebido", adicionar uma linha:
  - *"Para assinar ou patrocinar o time com seu e-mail pessoal, use outra conta de cliente no site."*

### 5. **Permitir informar outro e-mail no cadastro** (não resolve sozinho)
- Hoje o responsável é sempre a conta logada (TeamManager criado com o `userId` atual). Se permitíssemos digitar outro e-mail em "E-mail do responsável", ainda assim a conta **logada** viraria TeamManager e continuaria bloqueada para compras. Ou seja, não libera o e-mail pessoal do usuário que está preenchendo o form. Essa opção só faria sentido se o fluxo fosse "cadastro sem login" e depois "quem tem esse e-mail acessa o painel" — o que mudaria bastante o fluxo. Conclusão: a solução eficaz é **orientar a usar uma conta com e-mail do time** antes de cadastrar.

### 6. **Checklist antes de preencher**
- Na página de cadastro, um pequeno checklist:
  - *"Antes de preencher: prefira usar uma conta com e-mail do time (ex: contato@time.com), para que seu e-mail pessoal possa ser usado como torcedor ou patrocinador."*

---

## Recomendações de implementação

| Onde              | Ação |
|-------------------|------|
| **Para times**    | Adicionar a "dica" (item 2) antes do botão de ir ao cadastro. |
| **Cadastrar time**| (a) Box de aviso no topo (item 3); (b) texto ao lado do campo e-mail (item 1). |
| **E-mail pós-cadastro** | Incluir a frase do item 4 no template de "Cadastro recebido". |

Assim o responsável é informado em três momentos: ao decidir ir ao cadastro, ao preencher o formulário e ao receber o e-mail de confirmação.
