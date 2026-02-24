# Erro EPERM ao rodar `npx prisma generate`

## O que acontece

- **EPERM** ao renomear `query_engine-windows.dll.node`: algum processo (em geral o **servidor Next.js** em execução) está usando o Prisma Client e o Windows bloqueia a troca do arquivo.
- **"Unknown argument `scope`"**: o client em uso foi gerado antes do campo `scope` existir no schema; como o `generate` falhou, o app continua com o client antigo.

## Passos para corrigir

1. **Pare o servidor de desenvolvimento**  
   No terminal onde está rodando `npm run dev` (ou `next dev`), use **Ctrl+C** e espere encerrar.

2. **Gere o client de novo**  
   No mesmo projeto:
   ```bash
   npx prisma generate
   ```
   Deve concluir sem EPERM.

3. **Inicie o servidor de novo**  
   ```bash
   npm run dev
   ```

## Se ainda der EPERM

- Feche o Cursor/VS Code, abra um **novo terminal** (PowerShell ou CMD) na pasta do projeto e rode `npx prisma generate`.
- Ou apague a pasta do client e gere de novo (com o dev server **parado**):
  1. Exclua a pasta `node_modules\.prisma`
  2. Rode `npx prisma generate`
  3. Rode `npm run dev`

Depois disso, o Prisma Client passa a conhecer o campo `scope` e o erro "Unknown argument `scope`" some.
