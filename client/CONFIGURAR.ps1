$ErrorActionPreference = 'Stop'
function Convert-PrivateInput([Security.SecureString]$Secret) {
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer) }
}
$CloudUrl = (Read-Host 'URL del panel en Render (https://...)').Trim().TrimEnd('/')
$CloudUri = [Uri]$CloudUrl
if ($CloudUri.Scheme -ne 'https' -or $CloudUri.UserInfo -or $CloudUri.Query -or $CloudUri.Fragment -or $CloudUri.AbsolutePath -ne '/') { throw 'Usar la URL base HTTPS del servicio de Render.' }
$PrivateToken = Read-Host 'INGEST_TOKEN de Render (queda oculto)' -AsSecureString
$TokenValue = Convert-PrivateInput $PrivateToken
if ($TokenValue.Length -lt 32) { throw 'La clave debe tener al menos 32 caracteres.' }
$ObsPrivate = Read-Host 'Clave del WebSocket de OBS (Enter si no usa clave)' -AsSecureString
$SourceName = Read-Host 'Nombre exacto de la fuente del tablero en OBS (Enter: Camara 2)'
if (-not $SourceName) { $SourceName = 'Camara 2' }
$GameSource = Read-Host 'Nombre exacto de la camara del juego (Enter: camara 01)'
if (-not $GameSource) { $GameSource = 'camara 01' }
@{ cloud_url=$CloudUrl; ingest_token=$TokenValue; obs_host='127.0.0.1'; obs_port=4455; obs_password=(Convert-PrivateInput $ObsPrivate); source=$SourceName; game_source=$GameSource; local_port=8771 } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Encoding UTF8
$TokenValue = $null
Write-Host 'Configuracion local guardada. config.json es privado: no subirlo a GitHub.' -ForegroundColor Green
