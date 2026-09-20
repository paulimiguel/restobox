import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import { uploadsDirectory, type MediaRecord } from './database';

const allowedTypes: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'image/avif': '.avif',
};

const MAX_SAVED_IMAGE_SIZE = 1600;
const SAVED_JPEG_QUALITY = 65;
const SAVED_WEBP_QUALITY = 78;

export async function storeImage(file: File, optimizedFormat?: 'jpeg' | 'webp') {
	const originalExtension = allowedTypes[file.type];
	if (!originalExtension) throw new Error('Formato de imagen no permitido');
	if (file.size <= 0 || file.size > 15 * 1024 * 1024) throw new Error('Cada imagen debe pesar menos de 15 MB');
	if (!optimizedFormat) {
		const original = Buffer.from(await file.arrayBuffer());
		const filename = `${randomUUID()}${originalExtension}`;
		await writeFile(join(uploadsDirectory, filename), original, { flag: 'wx' });
		return { filename, mimeType: file.type, size: original.length };
	}
	let optimized: Buffer;
	try {
		const pipeline = sharp(Buffer.from(await file.arrayBuffer()))
			.rotate()
			.resize({
				width: MAX_SAVED_IMAGE_SIZE,
				height: MAX_SAVED_IMAGE_SIZE,
				fit: 'inside',
				withoutEnlargement: true,
			});
		optimized = optimizedFormat === 'webp'
			? await pipeline.webp({ quality: SAVED_WEBP_QUALITY, effort: 4 }).toBuffer()
			: await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: SAVED_JPEG_QUALITY, progressive: true, mozjpeg: true }).toBuffer();
	} catch {
		throw new Error('No se pudo procesar la imagen');
	}
	const extension = optimizedFormat === 'webp' ? '.webp' : '.jpg';
	const mimeType = optimizedFormat === 'webp' ? 'image/webp' : 'image/jpeg';
	const filename = `${randomUUID()}${extension}`;
	await writeFile(join(uploadsDirectory, filename), optimized, { flag: 'wx' });
	return { filename, mimeType, size: optimized.length };
}

export async function readStoredImage(filename: string) {
	if (filename !== filename.split(/[\\/]/).pop() || !extname(filename)) throw new Error('Archivo inválido');
	return readFile(join(uploadsDirectory, filename));
}

export async function removeMediaFiles(records: MediaRecord[]) {
	await Promise.all(records.map((record) => unlink(join(uploadsDirectory, record.filename)).catch(() => undefined)));
}
