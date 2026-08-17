import type { APIRoute } from 'astro';
import { listMedia, listRestaurants, syncRestaurants } from '../../../lib/server/database';
import { removeMediaFiles } from '../../../lib/server/media-storage';

export const GET: APIRoute = () => Response.json({ restaurants: listRestaurants() });

export const PUT: APIRoute = async ({ request }) => {
	let body: { upserts?: unknown[]; deletedIds?: unknown[] };
	try { body = await request.json(); }
	catch { return Response.json({ error: 'Solicitud inválida' }, { status: 400 }); }
	const upserts = Array.isArray(body.upserts) ? body.upserts : [];
	const deletedIds = Array.isArray(body.deletedIds) ? body.deletedIds.filter((id): id is string => typeof id === 'string') : [];
	if (upserts.length > 2_500 || deletedIds.length > 2_500) return Response.json({ error: 'Demasiados registros' }, { status: 413 });
	try {
		const removedMedia = deletedIds.flatMap((id) => listMedia(id));
		syncRestaurants(upserts, deletedIds);
		await removeMediaFiles(removedMedia);
		return Response.json({ ok: true, restaurants: listRestaurants() });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudieron guardar los lugares' }, { status: 400 });
	}
};
