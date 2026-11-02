import type { APIRoute } from 'astro';
import { findStregaUrl } from '../../lib/server/strega';

export const prerender = false;

// Busca el link de un lugar en Strega por nombre (y ciudad, si se indica).
export const GET: APIRoute = async ({ url }) => {
	const name = url.searchParams.get('name')?.trim() ?? '';
	const city = url.searchParams.get('city')?.trim() ?? '';
	if (name.length < 2 || name.length > 120 || city.length > 80) return Response.json({ error: 'Nombre inválido' }, { status: 400 });
	return Response.json({ url: await findStregaUrl(name, city) });
};
