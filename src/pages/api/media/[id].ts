import type { APIRoute } from 'astro';
import { getMedia } from '../../../lib/server/database';
import { readStoredImage } from '../../../lib/server/media-storage';

export const GET: APIRoute = async ({ params }) => {
	const media = getMedia(params.id ?? '');
	if (!media) return new Response('Imagen no encontrada', { status: 404 });
	try {
		const file = await readStoredImage(media.filename);
		return new Response(file, {
			headers: {
				'content-type': media.mimeType,
				'content-length': String(file.byteLength),
				'cache-control': 'private, max-age=3600',
				'x-content-type-options': 'nosniff',
			},
		});
	} catch {
		return new Response('El archivo de imagen no está disponible', { status: 404 });
	}
};
