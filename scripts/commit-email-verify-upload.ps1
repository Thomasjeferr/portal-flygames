# Commit: login automático após verificar e-mail + upload de logo nas configurações de e-mail
# Execute na raiz do projeto: .\scripts\commit-email-verify-upload.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root ".git"))) {
    Write-Error "Execute este script na raiz do projeto (Portal Futvar)."; exit 1
}
Push-Location $root

try {
    git add `
        "src/app/api/auth/verify-email/route.ts" `
        "src/app/verificar-email/page.tsx" `
        "src/app/cadastro/page.tsx" `
        "src/app/admin/(dashboard)/emails/settings/page.tsx"

    $staged = git diff --cached --name-only 2>$null
    if (-not $staged) {
        Write-Host "Nenhuma alteração para commitar."
        exit 0
    }
    Write-Host "Arquivos no stage:"
    git diff --cached --name-status
    Write-Host ""
    git commit -m "feat(auth/email): login automático após verificar e-mail e upload de logo

- verify-email API: cria sessão e define cookie após validar código (login automático)
- verificar-email: redireciona após sucesso; suporte a ?redirect=; mensagem 'Cadastro concluído'
- cadastro: repassa parâmetro redirect para a página de verificação
- Configurações de e-mail: botão 'Carregar imagem' no campo URL do logo (opcional) + preview"
    Write-Host "Commit criado com sucesso."
}
finally {
    Pop-Location
}
