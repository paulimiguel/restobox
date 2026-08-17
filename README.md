# RestoBox

Base privada de lugares gastronómicos. La interfaz sigue hecha con Astro, pero los datos ya no dependen del navegador: el servidor guarda los registros en SQLite y las imágenes en disco.

## Requisitos

- Node.js 22.13 o posterior.
- Un disco o volumen persistente para la carpeta `data`.

## Configuración

Copiá `.env.example` como `.env` y completá:

```env
GOOGLE_MAPS_API_KEY=
RESTOBOX_ADMIN_USERNAME=admin
RESTOBOX_ADMIN_PASSWORD=una-clave-segura-de-al-menos-12-caracteres
RESTOBOX_DATA_DIR=./data
```

La primera vez que inicia, RestoBox crea el usuario administrador indicado. Para agregar otro usuario se puede reiniciar temporalmente con otro nombre y contraseña; los usuarios anteriores se conservan.

## Desarrollo

```sh
npm install
npx astro dev --background
```

La aplicación estará disponible en `http://localhost:4321`. Comandos útiles:

```sh
npx astro dev status
npx astro dev logs
npx astro dev stop
npm run check
npm run build
```

## Persistencia

- Base SQLite: `data/restobox.sqlite`
- Fotos y logos: `data/uploads/`
- Sesiones: almacenamiento de archivos administrado por el adaptador Node de Astro.
- Preferencias visuales (tema, tipografía y vista): continúan en `localStorage`, porque son preferencias de cada navegador.

Al abrir esta versión por primera vez, si la base está vacía, RestoBox copia automáticamente los lugares que encuentre en el almacenamiento antiguo del navegador. También migra las fotos de IndexedDB y conserva los datos anteriores como resguardo; no los elimina.

## Copias de seguridad

Con el servidor en funcionamiento o detenido, ejecutá:

```sh
npm run backup
```

Se crea una copia consistente de SQLite junto con las imágenes dentro de `data/backups/<fecha>/`. Para una copia externa real, respaldá periódicamente toda la carpeta `data` en otro disco o servicio.

Para revisar archivos de imagen que ya no pertenecen a ningún lugar:

```sh
npm run cleanup:media
npm run cleanup:media -- --delete
```

## Producción

```sh
npm run build
node ./dist/server/entry.mjs
```

El servidor debe publicarse detrás de HTTPS y la carpeta configurada en `RESTOBOX_DATA_DIR` debe estar montada en un volumen persistente. Astro con el adaptador Node usa el sistema de archivos local para las sesiones, por lo que el proceso debe conservar también su almacenamiento de sesión.

## Deploy en CloudPanel

El deploy usa versiones atómicas, conserva SQLite e imágenes en `shared/data`, hace un respaldo antes de cambiar de versión y vuelve automáticamente a la versión anterior si la aplicación no responde.

Una vez configurado el remoto Git y habilitada la clave SSH:

```powershell
.\scripts\deploy.ps1 "Descripción del cambio"
```

El comando verifica, crea el commit si hay cambios, hace `push`, compila, sube el artefacto al VPS y reinicia RestoBox mediante PM2. Para una publicación inicial sin Git se puede usar temporalmente `-SkipGit`.
