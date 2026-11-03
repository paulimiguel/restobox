import type { APIRoute } from 'astro';
import { descriptionFromHtml, findStregaPlace, readStregaPlace, stregaCandidatesFrom } from '../../lib/server/strega';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// La ficha sin "www", sin parámetros y con la barra final, como la publica Strega.
function stregaPageUrl(value: string) {
	try {
		const url = new URL(value.trim());
		if (!/(?:^|\.)strega\.com\.ar$/i.test(url.hostname)) return '';
		return `https://www.strega.com.ar${url.pathname.replace(/\/?$/, '/')}`;
	} catch {
		return '';
	}
}

// Botón "Importar descripción": la reseña de Strega del lugar. Strega no deja buscar ni leer la mayoría de las fichas
// desde el servidor, así que el navegador consulta su API (por el link de Strega del lugar o por nombre) y manda
// los resultados con la reseña; acá se elige la ficha y se pasa a texto. Los subtítulos vienen como "## Título".
export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => ({})) as { stregaUrl?: string; name?: string; city?: string; neighborhood?: string; candidates?: unknown };
	const stregaUrl = stregaPageUrl(body.stregaUrl ?? '');
	const name = body.name?.trim() ?? '';
	const candidates = stregaCandidatesFrom(body.candidates);
	let description = '';
	let url = '';
	if (stregaUrl) {
		const candidate = candidates.find((item) => stregaPageUrl(item.link) === stregaUrl);
		description = candidate?.content ? descriptionFromHtml(candidate.content) : (await readStregaPlace(stregaUrl))?.description ?? '';
		url = stregaUrl;
	} else if (name.length >= 2) {
		const place = await findStregaPlace(candidates, [name], [body.city ?? '', body.neighborhood ?? '']);
		description = place?.description ?? '';
		url = place?.url ?? '';
		if (!place) return json({ error: `No se encontró “${name}” en Strega` }, 404);
	} else {
		return json({ error: 'Cargá el nombre del lugar o su link de Strega' }, 400);
	}
	if (!description) return json({ error: 'No se pudo leer la descripción de la ficha de Strega' }, 404);
	return json({ description, url });
};
