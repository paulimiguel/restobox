import { readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { APIRoute } from 'astro';
import { profilePhotosDirectory } from '../../../lib/server/database';

const mimeTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export const GET: APIRoute = async ({ params }) => {
	const filename = params.filename ?? '';
	if (!filename || basename(filename) !== filename || !mimeTypes[extname(filename).toLocaleLowerCase('en')]) {
		return new Response('No encontrado', { status: 404 });
	}
	try {
		const extension = extname(filename).toLocaleLowerCase('en');
		return new Response(await readFile(join(profilePhotosDirectory, filename)), {
			headers: { 'content-type': mimeTypes[extension], 'cache-control': 'private, max-age=3600' },
		});
	} catch {
		return new Response('No encontrado', { status: 404 });
	}
};
