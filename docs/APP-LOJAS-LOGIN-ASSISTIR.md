# App para lojas (Play Store / App Store): só login + assistir

Objetivo: publicar um app que **só faz login e exibe o conteúdo**. Cadastro, planos e pagamento ficam **apenas no site**. Isso aumenta a chance de aprovação nas lojas.

---

## 1. Fluxo do usuário no app

```
┌─────────────────────────────────────────────────────────────────┐
│                        ABRE O APP                                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Já está logado? (token/sessão existe)                           │
│  SIM → vai para TELA PRINCIPAL (conteúdo)                        │
│  NÃO → vai para TELA DE LOGIN                                    │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ SIM                                │ NÃO
         ▼                                    ▼
┌──────────────────┐              ┌──────────────────────────────┐
│  TELA PRINCIPAL  │              │      TELA DE LOGIN           │
│  (home do site   │              │  • E-mail                     │
│   sem compras)   │              │  • Senha                     │
│  • Destaques     │              │  • [Entrar]                  │
│  • Lives         │              │  • "Esqueci a senha" (link)   │
│  • Vídeos        │              │                              │
│  • Menu: conta,  │              │  Sem: "Criar conta", "Planos" │
│    sair          │              └──────────────────────────────┘
└──────────────────┘                            │
         │                                      │ Login OK
         │                                      ▼
         │                            ┌──────────────────────────────┐
         └────────────────────────────│  TELA PRINCIPAL (conteúdo)   │
                                      └──────────────────────────────┘
```

---

## 2. O que o app MOSTRA (igual ao site, mas limitado)

| Área            | No app (lojas) |
|-----------------|----------------|
| **Header**      | Logo Fly Games, menu hambúrguer (só: Início, Minha conta, Sair). **Sem** "Planos", **sem** "Assinar", **sem** "Instalar app". |
| **Home**        | Destaques, lives, grade de jogos. Tudo que é só visualização. |
| **Player**      | Assistir transmissões e vídeos (quem tem acesso). |
| **Minha conta** | Ver dados da conta, talvez "Esqueci a senha". **Sem** botão de assinatura/renovar. |
| **Login**       | Só e-mail + senha + Entrar + Esqueci a senha. **Sem** "Criar conta" ou link para planos. |

---

## 3. O que o app NÃO MOSTRA (escondido na versão “loja”)

| Esconder / remover |
|--------------------|
| Menu ou botão **"Planos"** / **"Assinar"** |
| Qualquer **preço**, **valor**, **oferta** |
| Link **"Criar conta"** na tela de login (ou deixar só texto genérico: "Contas são criadas pelo site") |
| **"Baixar app"** / **"Instalar app"** (redundante; opcional) |
| Footer com links para **planos/pagamento** (no app pode ser só: contato, política de privacidade) |

---

## 4. Como saber que está “no app das lojas” (modo restrito)

O mesmo código do site precisa saber: **estou no app nativo (versão loja) ou no site / PWA?**

Opções técnicas:

```
┌─────────────────────────────────────────────────────────────────┐
│  OPÇÃO A – Query param na URL (recomendado, simples)              │
│  App (Capacitor) abre: https://flygames.app/?app=1                │
│  O site lê ?app=1 e esconde planos/assinar/criar conta.         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OPÇÃO B – User-Agent / header                                   │
│  O WebView do app envia um header (ex: X-FlyGames-App: 1).       │
│  O site (middleware ou layout) lê e ativa “modo app loja”.       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OPÇÃO C – Subdomínio / rota só para o app                       │
│  App abre: https://app.flygames.app (ou flygames.app/app).      │
│  Essa rota serve a mesma UI, mas com layout sem compras.         │
└─────────────────────────────────────────────────────────────────┘
```

Recomendação: **Opção A** (?app=1). No `capacitor.config.ts` a URL do server fica `https://flygames.app/?app=1` (ou `...&app=1`). No Next.js, um hook ou o layout lê `searchParams.get('app')` e define algo como `isStoreApp = true`; os componentes que mostram planos/assinar/criar conta checam essa flag e não renderizam no app.

---

## 6. Onde aplicar no código (desenho)

```
Next.js (site)

  layout.tsx ou Provider
       │
       │  Lê ?app=1 (ou header) → isStoreApp
       │
       ▼
  ┌────────────────────────────────────────┐
  │  Header / Menu                         │
  │  Se isStoreApp: não mostrar            │
  │    • Planos, Assinar, Criar conta,     │
  │      Instalar app                       │
  │  Sempre: Início, Conta, Sair           │
  └────────────────────────────────────────┘

  ┌────────────────────────────────────────┐
  │  Página de login (/login ou /entrar)   │
  │  Se isStoreApp: não mostrar            │
  │    • "Criar conta", link para planos   │
  │  Sempre: Esqueci a senha               │
  └────────────────────────────────────────┘

  ┌────────────────────────────────────────┐
  │  Footer / outras páginas               │
  │  Se isStoreApp: esconder blocos com     │
  │    preços e links de assinatura         │
  └────────────────────────────────────────┘
```

---

## 6. Dois “tipos” de app (resumo)

|                | App atual (download no site) | App para lojas (Play / iOS) |
|----------------|------------------------------|-----------------------------|
| **URL**        | https://flygames.app         | https://flygames.app/?app=1  |
| **Onde roda**  | APK instalado pelo site      | Mesmo APK, mas build/URL com ?app=1 para a versão enviada às lojas |
| **Mostra**     | Site completo (planos, assinar, etc.) | Só login + assistir (sem compras) |
| **Objetivo**   | Quem baixa pelo site         | Quem instala pela Play Store / App Store |

Na prática: **um único app (um único APK/IPA)** que abre a URL com `?app=1`; o site que se adapta e esconde o que não pode aparecer na versão “loja”.

---

## 8. Checklist antes de enviar às lojas

- [ ] App abre direto em `https://flygames.app/?app=1` (ou equivalente).
- [ ] Tela de login sem “Criar conta” e sem link para planos.
- [ ] Menu e footer sem “Planos”, “Assinar”, preços.
- [ ] “Esqueci a senha” funciona (pode abrir site/e-mail).
- [ ] Quem já tem conta consegue logar e assistir normalmente.
- [ ] Política de privacidade acessível (link no app ou no site).
- [ ] Texto na descrição da loja: algo como “Acesso para assinantes. Crie sua conta em flygames.app” (fora do app, só na descrição da ficha da loja).

**Build para as lojas (Play Store / App Store):** ao gerar o APK/IPA que será enviado às lojas, defina a URL do app com `?app=1` para ativar o modo “só login + assistir”:

- **Variável de ambiente:** `CAPACITOR_SERVER_URL=https://flygames.app/?app=1`
- Exemplo (PowerShell): `$env:CAPACITOR_SERVER_URL="https://flygames.app/?app=1"; npx cap sync`
- O `capacitor.config.ts` usa `process.env.CAPACITOR_SERVER_URL`; se não estiver definida, o app abre `https://flygames.app` (site completo). Para a versão das lojas, use sempre a URL com `?app=1`.

**Ver também:** [APP-LOJAS-ACESSO-CONTA.md](./APP-LOJAS-ACESSO-CONTA.md) — como fica quem só criou conta ou comprou um jogo (sem botão de assinar/patrocinar no app).
