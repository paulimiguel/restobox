import { readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDirectory = resolve(process.env.RESTOBOX_DATA_DIR || join(process.cwd(), 'data'));
const uploadsDirectory = join(dataDirectory, 'uploads');
const databasePath = join(dataDirectory, 'restobox.sqlite');

if (!existsSync(databasePath) || !existsSync(uploadsDirectory)) {
	console.log('No hay archivos de imágenes para revisar.');
	process.exit(0);
}

const database = new DatabaseSync(databasePath, { readOnly: true });
const referencedFiles = new Set(database.prepare('SELECT filename FROM media').all().map((row) => String(row.filename)));
database.close();

const files = await readdir(uploadsDirectory, { withFileTypes: true });
const orphanedFiles = files.filter((entry) => entry.isFile() && !referencedFiles.has(entry.name));

if (!process.argv.includes('--delete')) {
	console.log(`${orphanedFiles.length} archivo(s) sin referencia. Usá npm run cleanup:media -- --delete para quitarlos.`);
} else {
	for (const entry of orphanedFiles) await unlink(join(uploadsDirectory, entry.name));
	console.log(`${orphanedFiles.length} archivo(s) sin referencia eliminados.`);
}
