[CmdletBinding()]
param(
	[Parameter(Position = 0)]
	[string]$Message = "Actualización de RestoBox",
	[string]$Server = "vps1.beweb.com.ar",
	[string]$RemoteUser = "restobox",
	[string]$RemoteRoot = "/home/restobox/htdocs/restobox.beweb.com.ar",
	[string]$IdentityFile = "C:\Users\paula\.ssh\restobox_beweb_ed25519",
	[switch]$SkipGit
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

if ($Server -notmatch '^[a-zA-Z0-9.-]+$' -or $RemoteUser -notmatch '^[a-z_][a-z0-9_-]*$') {
	throw "Servidor o usuario SSH inválido."
}
if ($RemoteRoot -notmatch '^/home/restobox/htdocs/restobox\.beweb\.com\.ar$') {
	throw "El directorio remoto no coincide con el sitio RestoBox autorizado."
}
if (-not (Test-Path -LiteralPath $IdentityFile)) {
	throw "No se encontró la clave SSH: $IdentityFile"
}

if (-not $SkipGit) {
	if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ".git"))) {
		throw "El proyecto todavía no es un repositorio Git. Inicializalo y configurá un remoto, o usá -SkipGit para el primer deploy."
	}
	$remote = git remote get-url origin 2>$null
	if ($LASTEXITCODE -ne 0 -or -not $remote) {
		throw "Falta configurar el remoto Git 'origin'."
	}
	git add --all
	git diff --cached --quiet
	if ($LASTEXITCODE -ne 0) {
		git commit -m $Message
		if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el commit." }
	}
	git push
	if ($LASTEXITCODE -ne 0) { throw "No se pudo publicar el commit en Git." }
}

npm run check
if ($LASTEXITCODE -ne 0) { throw "La verificación del proyecto falló." }
npm run build
if ($LASTEXITCODE -ne 0) { throw "La compilación del proyecto falló." }

$stamp = [DateTime]::UtcNow.ToString("yyyyMMdd-HHmmss")
$archive = Join-Path ([IO.Path]::GetTempPath()) "restobox-$stamp.tar.gz"
try {
	& tar -czf $archive dist package.json package-lock.json ecosystem.config.cjs scripts/backup.mjs scripts/cleanup-media.mjs
	if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el paquete de deploy." }

	$destination = "$RemoteUser@$Server"
	& ssh -i $IdentityFile -o IdentitiesOnly=yes $destination "mkdir -p '$RemoteRoot/.deploy'"
	if ($LASTEXITCODE -ne 0) { throw "No se pudo preparar el directorio remoto." }
	& scp -i $IdentityFile -o IdentitiesOnly=yes $archive "${destination}:$RemoteRoot/.deploy/restobox-$stamp.tar.gz"
	if ($LASTEXITCODE -ne 0) { throw "No se pudo subir el paquete." }
	& scp -i $IdentityFile -o IdentitiesOnly=yes (Join-Path $ProjectRoot "scripts\deploy-remote.sh") "${destination}:$RemoteRoot/.deploy/deploy-remote.sh"
	if ($LASTEXITCODE -ne 0) { throw "No se pudo subir el instalador remoto." }

	$remoteCommand = "bash '$RemoteRoot/.deploy/deploy-remote.sh' '$RemoteRoot' '$RemoteRoot/.deploy/restobox-$stamp.tar.gz'"
	& ssh -i $IdentityFile -o IdentitiesOnly=yes $destination $remoteCommand
	if ($LASTEXITCODE -ne 0) { throw "El deploy remoto falló." }
}
finally {
	if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
}

Write-Host "RestoBox fue publicado correctamente en https://restobox.beweb.com.ar" -ForegroundColor Green
