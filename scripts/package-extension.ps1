$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $projectRoot 'extension\*'
$downloads = Join-Path $projectRoot 'public\downloads'
$output = Join-Path $downloads 'restobox-extension.zip'
New-Item -ItemType Directory -Force -Path $downloads | Out-Null
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
Compress-Archive -Path $source -DestinationPath $output -CompressionLevel Optimal
Write-Host "Extensión creada en $output"
