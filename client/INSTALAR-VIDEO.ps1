$ErrorActionPreference = 'Stop'
$VideoTools = Join-Path $PSScriptRoot 'tools'
$VideoBinary = Join-Path $VideoTools 'go2rtc.exe'
$VideoBinaryHash = '923d57252e8139a69c52e4acc1e399a640244a8ef457fd9b7267a25847d68f8c'
New-Item -ItemType Directory -Force -Path $VideoTools | Out-Null
if (Test-Path -LiteralPath $VideoBinary) {
    if ((Get-FileHash -LiteralPath $VideoBinary -Algorithm SHA256).Hash.ToLowerInvariant() -eq $VideoBinaryHash) {
        Write-Host 'Video continuo ya instalado.'; return
    }
    throw 'El componente de video existente no coincide con la version verificada.'
}
$VideoArchive = Join-Path $VideoTools 'go2rtc-v1.9.14.zip'
$VideoArchiveHash = 'dd4167d75cb04abe618855b7c71f8658bd009f60c1a71835d134d2c11c939907'
Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_win64.zip' -OutFile $VideoArchive
if ((Get-FileHash -LiteralPath $VideoArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $VideoArchiveHash) { throw 'La descarga de video no paso la verificacion.' }
Expand-Archive -LiteralPath $VideoArchive -DestinationPath $VideoTools -Force
if ((Get-FileHash -LiteralPath $VideoBinary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $VideoBinaryHash) { throw 'El ejecutable de video no paso la verificacion.' }
Remove-Item -LiteralPath $VideoArchive
Write-Host 'Video continuo instalado.' -ForegroundColor Green
