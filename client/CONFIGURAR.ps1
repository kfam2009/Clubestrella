$ErrorActionPreference = 'Stop'
$ConfigFile = Join-Path $PSScriptRoot 'config.json'
if (Test-Path -LiteralPath $ConfigFile) { Write-Host 'Se conserva la configuracion existente.'; return }
@{ obs_host='127.0.0.1'; obs_port=4455; obs_password=''; source='Camara 2'; game_source='camara 01'; local_port=8771; monitor_mode='program' } | ConvertTo-Json | Set-Content -LiteralPath $ConfigFile -Encoding UTF8
Write-Host 'Panel Go configurado para esta PC, sin Render ni ZeroTier.' -ForegroundColor Green
