import type { APIRoute } from 'astro';
import { deleteRestaurant, getRestaurant, listMedia, upsertRestaurant } from '../../../lib/server/database';
import { removeMediaFiles } from '../../../lib/server/media-storage';

export const GET: APIRoute = ({ params }) => {
	const restaurant = getRestaurant(params.id ?? '');
	return restaurant ? Response.json({ restaurant }) : Response.json({ error: 'Lugar no encontrado' }, { status: 404 });
};

export const PUT: APIRoute = async ({ params, request }) => {
	try {
		const value = await request.json() as Record<string, unknown>;
		if (value.id !== params.id) return Response.json({ error: 'El identificador no coincide' }, { status: 400 });
		return Response.json({ restaurant: upsertRestaurant(value) });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el lugar' }, { status: 400 });
	}
};

export const DELETE: APIRoute = async ({ params }) => {
	const id = params.id ?? '';
	const media = listMedia(id);
	deleteRestaurant(id);
	await removeMediaFiles(media);
	return Response.json({ ok: true });
};
