$ErrorActionPreference = 'Stop'
$TestFile = Join-Path $PSScriptRoot 'prueba-local.json'
$BoardSource = Read-Host 'Fuente del tablero en OBS (Enter: Camara 2)'
if (-not $BoardSource) { $BoardSource = 'Camara 2' }
$GameSource = Read-Host 'Fuente del juego en OBS (Enter: camara 01)'
if (-not $GameSource) { $GameSource = 'camara 01' }
@{ obs_host='127.0.0.1'; obs_port=4455; obs_password=''; source=$BoardSource; game_source=$GameSource; local_port=8771; video_port=1987; game_rtsp='' } | ConvertTo-Json | Set-Content -LiteralPath $TestFile -Encoding UTF8
Write-Host 'OBS local sin clave: desmarcar Habilitar autenticacion en sus ajustes WebSocket.'
Write-Host 'Prueba configurada. No se necesita Render.' -ForegroundColor Green
