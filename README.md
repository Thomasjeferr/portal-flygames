# Portal Futvar – Streaming de Jogos

Plataforma web de streaming de vídeos (jogos) estilo Netflix, com usuários, assinatura mensal e painel administrativo.

## Tecnologias

- **Next.js 14** (App Router)
- **Node.js**
- **Tailwind CSS**
- **PostgreSQL** (Prisma ORM)
- **TypeScript**

## Requisitos

- Node.js 18+
- PostgreSQL

## Instalação

1. Clone o repositório e entre na pasta:
   ```bash
   cd "Portal Futvar"
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na raiz (copie de `.env.example`):
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/portal_futvar?schema=public"
   NEXTAUTH_SECRET="um-secret-aleatorio-seguro"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. Crie o banco no PostgreSQL e rode as migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Crie o usuário admin (opcional: defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`):
   ```bash
   npm run db:seed
   ```
   Padrão: `admin@portal.com` / `admin123`

6. Inicie o projeto:
   ```bash
   npm run dev
   ```

Acesse: [http://localhost:3000](http://localhost:3000)

## Funcionalidades

### Público
- **Página inicial**: lista de jogos em capas (estilo streaming).
- **Página do jogo**: player de vídeo, título, campeonato, data e descrição (só assiste com assinatura ativa).
- **Cadastro** e **login** de usuários.
- **Recuperação de senha** (link por e-mail; em dev o link aparece no console).

### Assinatura
- Só é possível assistir aos vídeos com assinatura ativa.
- No momento a ativação é feita pelo admin (API `POST /api/subscription/activate` com `userId` e `months`). Integração com gateway de pagamento pode ser feita depois.

### Painel admin (`/admin`)
- **Login**: `/admin/entrar` (apenas usuários com `role: admin`).
- **Jogos**: listar, cadastrar, editar e excluir.
- **Upload de thumbnail** ou URL da imagem.
- **Link do vídeo**: YouTube, Vimeo ou URL direta de vídeo.

## Estrutura (preparada para app mobile)

- `src/app/api/` – rotas de API (reutilizáveis por um app mobile).
- `src/shared/types/` – tipos compartilhados (DTOs).
- `src/lib/` – banco (Prisma), auth, slug.
- `src/components/` – componentes da interface web.
- `src/app/` – páginas e layouts (Next.js App Router).

## Scripts

| Comando           | Descrição                |
|------------------|---------------------------|
| `npm run dev`    | Servidor de desenvolvimento |
| `npm run build`  | Build de produção        |
| `npm run start`  | Servidor de produção     |
| `npm run db:push`| Sincroniza schema no DB  |
| `npm run db:seed`| Cria/atualiza usuário admin |
| `npm run db:studio` | Prisma Studio (UI do banco) |

## Banco de dados

Modelos principais:
- **User**: email, senha (hash), role (user/admin), recuperação de senha.
- **Session**: sessão por cookie.
- **Subscription**: assinatura por usuário (ativa até `endDate`).
- **Game**: título, slug, campeonato, data, descrição, URL do vídeo, thumbnail.

Migrations: use `npx prisma migrate dev` para criar migrations a partir do `schema.prisma`.
