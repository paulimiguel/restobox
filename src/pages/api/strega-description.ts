import type { APIRoute } from 'astro';
import { findStregaPlace, readStregaPlace, searchStrega } from '../../lib/server/strega';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// Botón "Importar descripción": trae la reseña de Strega del lugar (por su link de Strega o, si no lo tiene,
// buscándolo por nombre en su ciudad o zona). Los subtítulos vienen como "## Título".
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => ({})) as { stregaUrl?: string; name?: string; city?: string; neighborhood?: string };
	const stregaUrl = body.stregaUrl?.trim() ?? '';
	const name = body.name?.trim() ?? '';
	let place = null;
	if (/^https:\/\/(?:www\.)?strega\.com\.ar\/[^?#]+/.test(stregaUrl)) place = await readStregaPlace(stregaUrl.replace('://strega.', '://www.strega.'));
	else if (name.length >= 2) place = await findStregaPlace(searchStrega(name), [name], [body.city ?? '', body.neighborhood ?? '']);
	else return json({ error: 'Cargá el nombre del lugar o su link de Strega' }, 400);
	if (!place) return json({ error: `No se encontró ${stregaUrl ? 'la ficha de Strega' : `“${name}” en Strega`}` }, 404);
	if (!place.description) return json({ error: 'La ficha de Strega no tiene descripción' }, 404);
	return json({ description: place.description, url: place.url });
};
