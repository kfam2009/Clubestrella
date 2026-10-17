$ErrorActionPreference = 'Stop'
$TestFile = Join-Path $PSScriptRoot 'prueba-local.json'
$ObsSecret = Read-Host 'Clave WebSocket de OBS (Enter si no usa clave)' -AsSecureString
$SecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ObsSecret)
try { $ObsPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($SecretPointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($SecretPointer) }
$BoardSource = Read-Host 'Fuente del tablero en OBS (Enter: Camara 2)'
if (-not $BoardSource) { $BoardSource = 'Camara 2' }
$GameSource = Read-Host 'Fuente del juego en OBS (Enter: camara 01)'
if (-not $GameSource) { $GameSource = 'camara 01' }
@{ obs_host='127.0.0.1'; obs_port=4455; obs_password=$ObsPassword; source=$BoardSource; game_source=$GameSource; local_port=8771; video_port=1987; game_rtsp='' } | ConvertTo-Json | Set-Content -LiteralPath $TestFile -Encoding UTF8
$ObsPassword = $null
Write-Host 'Prueba configurada. No se necesita Render.' -ForegroundColor Green
