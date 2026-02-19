# Rode este script NA PASTA do projeto (Portal Futvar) para corrigir os arquivos e dar push.
# Uso: cd "C:\Users\thoma\OneDrive\Área de Trabalho\Portal Futvar"
#      .\fix-and-push.ps1

$approvePath = "src\app\api\admin\teams\`[id`]\approve\route.ts"
$rejectPath  = "src\app\api\admin\teams\`[id`]\reject\route.ts"

foreach ($path in $approvePath, $rejectPath) {
    if (Test-Path -LiteralPath $path) {
        $content = Get-Content -LiteralPath $path -Raw -Encoding UTF8
        if ($content.Contains('Array.from(new Set(')) {
            Write-Host "Ja tinha Array.from: $path"
        } elseif ($content.Contains('[...new Set(')) {
            $content = $content.Replace('[...new Set(', 'Array.from(new Set(')
            Set-Content -LiteralPath $path -Value $content -Encoding UTF8 -NoNewline
            Write-Host "Corrigido: $path"
        } else {
            Write-Host "Padrao nao encontrado (procure por 'new Set' no arquivo): $path"
        }
    } else {
        Write-Host "Arquivo nao encontrado: $path"
    }
}

# Garantir downlevelIteration no tsconfig
$tsPath = "tsconfig.json"
if (Test-Path $tsPath) {
    $json = Get-Content $tsPath -Raw | ConvertFrom-Json
    if (-not $json.compilerOptions.downlevelIteration) {
        $json.compilerOptions | Add-Member -NotePropertyName "downlevelIteration" -NotePropertyValue $true -Force
        $json | ConvertTo-Json -Depth 10 | Set-Content $tsPath -Encoding UTF8
        Write-Host "tsconfig.json: downlevelIteration adicionado"
    }
}

Write-Host ""
Write-Host "Agora rode:"
Write-Host '  git add "src/app/api/admin/teams/[id]/approve/route.ts" "src/app/api/admin/teams/[id]/reject/route.ts" tsconfig.json'
Write-Host '  git commit -m "fix: Array.from(Set) e downlevelIteration para build Vercel"'
Write-Host '  git push origin main'
