#!/usr/bin/env bash
set -Eeuo pipefail

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
	# CloudPanel administra las versiones de Node mediante NVM.
	# shellcheck disable=SC1091
	source "$NVM_DIR/nvm.sh"
	nvm use 22 >/dev/null
fi

ROOT="${1:?Falta indicar el directorio remoto}"
ARCHIVE="${2:?Falta indicar el archivo de despliegue}"
RELEASE_ID="$(date -u +%Y%m%d-%H%M%S)"
RELEASES="$ROOT/releases"
SHARED="$ROOT/shared"
RELEASE="$RELEASES/$RELEASE_ID"
CURRENT="$ROOT/current"
PREVIOUS=""

mkdir -p "$RELEASES" "$SHARED/data" "$SHARED/backups"
if [[ ! -f "$SHARED/.env" ]]; then
	echo "Falta $SHARED/.env. Configurá las variables del servidor antes del primer deploy." >&2
	exit 2
fi
if [[ -L "$CURRENT" ]]; then
	PREVIOUS="$(readlink -f "$CURRENT")"
fi

if [[ -x "$CURRENT/node_modules/.bin/astro" && -f "$CURRENT/data/restobox.sqlite" ]]; then
	(cd "$CURRENT" && npm run backup)
fi

mkdir -p "$RELEASE"
tar -xzf "$ARCHIVE" -C "$RELEASE"
ln -s "$SHARED/.env" "$RELEASE/.env"
ln -s "$SHARED/data" "$RELEASE/data"

cd "$RELEASE"
npm ci --omit=dev --no-audit --no-fund
ln -sfn "$RELEASE" "$ROOT/.current-next"
mv -Tf "$ROOT/.current-next" "$CURRENT"

if [[ "$(node -p 'Number(process.versions.node.split(`.`)[0])')" -lt 22 ]]; then
	echo "RestoBox necesita Node.js 22 o posterior." >&2
	exit 3
fi
if ! command -v pm2 >/dev/null 2>&1 || [[ "$(command -v pm2)" != "$NVM_DIR"/* ]]; then
	npm install --global pm2@latest
fi
cd "$CURRENT"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

PORT_VALUE="$(sed -n 's/^PORT=//p' "$SHARED/.env" | tail -n 1 | tr -d '\r')"
PORT_VALUE="${PORT_VALUE:-4321}"
for attempt in {1..20}; do
	if curl --fail --silent --show-error "http://127.0.0.1:${PORT_VALUE}/login" >/dev/null; then
		rm -f "$ARCHIVE"
		find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
			| sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf --
		echo "Deploy $RELEASE_ID completado correctamente."
		exit 0
	fi
	sleep 1
done

echo "La aplicación no respondió en el puerto $PORT_VALUE; iniciando rollback." >&2
if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
	ln -sfn "$PREVIOUS" "$ROOT/.current-next"
	mv -Tf "$ROOT/.current-next" "$CURRENT"
	cd "$CURRENT"
	pm2 startOrReload ecosystem.config.cjs --update-env
	pm2 save
fi
exit 1
