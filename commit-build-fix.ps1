# Rode este script na pasta do projeto (Portal Futvar) para commitar as correções de build.
git add package.json src/app/patrocinar/comprar/page.tsx
git commit -m "fix(build): prisma generate no build + Suspense em /patrocinar/comprar"
Write-Host "Commit feito. Agora rode: git push origin main"
