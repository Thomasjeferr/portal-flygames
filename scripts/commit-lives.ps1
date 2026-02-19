# Commit das mudanças de lives (badge ao vivo, agendada, replay, fim do jogo).
# Execute na raiz do projeto: .\scripts\commit-lives.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root ".git"))) {
    $root = $PSScriptRoot
    while ($root -and -not (Test-Path (Join-Path $root ".git"))) { $root = Split-Path -Parent $root }
}
if (-not $root) { Write-Error "Diretório raiz do git não encontrado."; exit 1 }
Push-Location $root

try {
    git add `
        "src/app/api/admin/lives/[id]/route.ts" `
        "src/app/api/public/live-highlight/route.ts" `
        "src/app/page.tsx" `
        "src/app/live/[id]/page.tsx" `
        "src/components/LiveCountdown.tsx"

    $count = (git diff --cached --name-only 2>$null | Measure-Object -Line).Lines
    if ($count -eq 0) {
        Write-Host "Nenhuma alteração para commitar (arquivos já estão no último commit ou não foram modificados)."
        exit 0
    }

    git status -s
    Write-Host ""
    git commit -m "feat(lives): badge ao vivo, agendada, replay e fim do jogo

- PATCH live: ao salvar com cloudflarePlaybackId, forçar status ENDED
- live-highlight: só mostrar 'AO VIVO' quando cloudflarePlaybackId for null
- Home: listar replays por cloudflarePlaybackId (não exige status ENDED)
- Página live: priorizar replay por playbackId; considerar hasReplay para badge
- Live agendada: ao passar startAt, atualizar status para LIVE no servidor
- LiveCountdown: ao chegar a zero, router.refresh() e mensagem de atualização automática
- Horário de fim: ao passar endAt, atualizar status para ENDED
- Bloco 'O jogo acabou' com links para home e #ultimos-jogos
- Home: id ultimos-jogos na seção de replays para deep link"
    Write-Host "Commit criado com sucesso."
}
finally {
    Pop-Location
}
