# Commit das alterações restantes (docs, sync-replay, auth, Header, etc.)
# Execute na raiz do projeto: .\scripts\commit-restante.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root ".git"))) {
    Write-Error "Execute este script na raiz do projeto (Portal Futvar)."; exit 1
}
Push-Location $root

try {
    git add `
        docs/CONFIGURAR-EMAILS.md `
        docs/LIVES-CLOUDFLARE-STREAM.md `
        scripts/ `
        "src/app/api/admin/lives/[id]/sync-replay/" `
        "src/app/admin/(dashboard)/lives/[id]/editar/page.tsx" `
        src/app/api/auth/send-verify-email/route.ts `
        src/app/api/auth/verify-email/route.ts `
        src/app/globals.css `
        src/components/Header.tsx `
        src/lib/cloudflare-live.ts `
        package-lock.json

    $staged = git diff --cached --name-only 2>$null
    if (-not $staged) {
        Write-Host "Nenhuma alteração para commitar."
        exit 0
    }
    Write-Host "Arquivos no stage:"
    git diff --cached --name-status
    Write-Host ""
    git commit -m "chore: docs, sync-replay, auth, Header e cloudflare-live

- docs: CONFIGURAR-EMAILS.md e LIVES-CLOUDFLARE-STREAM.md
- scripts: commit-lives.ps1 e commit-restante.ps1
- API sync-replay: buscar replay no Cloudflare e botão no admin
- Admin editar live: integração com sync-replay
- Auth: send-verify-email e verify-email (teste cliente@teste.com)
- globals.css: tipografia títulos (Arial)
- Header: badge ao vivo / agendada e preview
- cloudflare-live: getSignedHlsUrl e ajustes para replay
- package-lock.json"
    Write-Host "Commit criado com sucesso."
}
finally {
    Pop-Location
}
