# Como testar o app TV (autorização via QR + celular)

## 1. Subir o projeto

No PowerShell, na pasta do projeto:

```powershell
npm run dev
```

Deixe o servidor rodando (geralmente em **http://localhost:3000**).

---

## 2. Testar no navegador (TV + celular na mesma máquina)

### Aba 1 – “TV”

1. Abra: **http://localhost:3000/tv-app/**
2. Deve aparecer a tela com **QR code** e um **código** (ex.: `ABC-123`).
3. Anote o código ou use o QR na próxima aba.

### Aba 2 – “Celular”

1. Abra uma **nova aba** e vá para: **http://localhost:3000/tv**
2. Se não tiver código na URL, digite o código que está na “TV” (ex.: `ABC123` ou `ABC-123`) e clique em **Continuar**.
3. Se não estiver logado, faça **login** (ou cadastro).
4. Na tela **“Autorizar esta TV”**, clique em **Autorizar esta TV**.

### Voltar na aba “TV”

- Em poucos segundos a tela da “TV” deve mudar sozinha para o **catálogo de jogos**.
- Clique em um jogo que você tenha acesso; o **player** deve abrir e o vídeo carregar (se houver HLS configurado).

---

## 3. Testar só a página “Autorizar TV” (sem simular a TV)

1. Acesse **http://localhost:3000/tv**.
2. Digite um código de 6 caracteres (ex.: `ABC123`) e clique em **Continuar**.
3. Faça login se precisar e clique em **Autorizar esta TV**.
4. Deve aparecer: **“TV autorizada! Volte ao televisor.”**

*(Sem a “TV” aberta você não vê o catálogo atualizar; o fluxo da página /tv em si está testado.)*

---

## 4. Testar em produção (site no ar)

- **TV (simulada):** abra **https://SEU-DOMINIO/tv-app/** (se você tiver colocado o conteúdo de `tv-app` em `public/tv-app` e feito deploy).
- **Celular:** no celular, acesse **https://SEU-DOMINIO/tv** e escaneie o QR code (ou digite o código) e autorize.

---

## 5. Dicas

- **Código expira em 15 minutos.** Se der “Código expirado”, atualize a aba da “TV” (F5) para gerar um novo código.
- **Sessão da TV dura 24 horas.** Depois disso a “TV” volta para a tela de QR e é preciso autorizar de novo.
- Para **limpar a sessão da TV** no navegador (e ver a tela de QR de novo), abra o DevTools (F12) → Application → Local Storage → remova as chaves `fly_tv_session_token` e `fly_tv_device_id` (ou limpe o storage do site).
