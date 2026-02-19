# Commit: escudos abaixo do player + PlayerMatchInfo em live e pré-estreia
Set-Location $PSScriptRoot\..

# Remover do stage o que nao faz parte desta mudanca (opcional)
git restore --staged package-lock.json.bak 2>$null

git add src/components/PlayerMatchInfo.tsx
git add "src/app/jogo/[slug]/page.tsx"
git add "src/app/live/[id]/page.tsx"
git add "src/app/pre-estreia/assistir/[slug]/page.tsx"

git status -s

$msg = @"
feat(player): escudos dos times abaixo do player em todos os contextos

- PlayerMatchInfo: escudos e nomes em jogo, live e pre-estreia
- Escudos maiores (80/96px) abaixo do player
- Live e pre-estreia usam mesmo layout; times quando existirem no schema
"@

git commit -m $msg
Write-Host "Commit concluido. Use 'git push' se quiser enviar ao remoto."