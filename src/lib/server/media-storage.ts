import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { uploadsDirectory, type MediaRecord } from './database';

const allowedTypes: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'image/avif': '.avif',
};

export async function storeImage(file: File) {
	const extension = allowedTypes[file.type];
	if (!extension) throw new Error('Formato de imagen no permitido');
	if (file.size <= 0 || file.size > 15 * 1024 * 1024) throw new Error('Cada imagen debe pesar menos de 15 MB');
	const filename = `${randomUUID()}${extension}`;
	await writeFile(join(uploadsDirectory, filename), Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
	return { filename, mimeType: file.type, size: file.size };
}

export async function readStoredImage(filename: string) {
	if (filename !== filename.split(/[\\/]/).pop() || !extname(filename)) throw new Error('Archivo inválido');
	return readFile(join(uploadsDirectory, filename));
}

export async function removeMediaFiles(records: MediaRecord[]) {
	await Promise.all(records.map((record) => unlink(join(uploadsDirectory, record.filename)).catch(() => undefined)));
}
