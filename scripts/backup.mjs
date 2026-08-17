import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDirectory = resolve(process.env.RESTOBOX_DATA_DIR || join(process.cwd(), 'data'));
const sourceDatabase = join(dataDirectory, 'restobox.sqlite');

if (!existsSync(sourceDatabase)) {
	console.error('Todavía no existe una base de datos para respaldar.');
	process.exitCode = 1;
} else {
	const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
	const backupDirectory = join(dataDirectory, 'backups', stamp);
	const backupDatabase = join(backupDirectory, 'restobox.sqlite');
	await mkdir(backupDirectory, { recursive: true });

	const source = new DatabaseSync(sourceDatabase, { readOnly: true });
	try {
		const escapedPath = backupDatabase.replaceAll("'", "''");
		source.exec(`VACUUM INTO '${escapedPath}'`);
	} finally {
		source.close();
	}

	const uploadsDirectory = join(dataDirectory, 'uploads');
	if (existsSync(uploadsDirectory)) {
		await cp(uploadsDirectory, join(backupDirectory, 'uploads'), { recursive: true });
	}
	console.log(`Respaldo creado en ${backupDirectory}`);
}
