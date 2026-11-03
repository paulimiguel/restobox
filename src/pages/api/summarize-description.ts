import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// Resumen de la descripción de un lugar, hecho con Claude (botón "Resumen" de la solapa Descripción).
const SYSTEM = [
	'Resumís descripciones de restaurantes, bares, cafés y tiendas de comida para FoodieBox, un directorio personal de lugares.',
	'Escribí en español rioplatense, en 4 a 6 viñetas cortas (una línea cada una, empezando con "• "), sin título ni texto antes o después.',
	'Contá qué es el lugar y su propuesta, lo más destacado de la comida y la bebida, el ambiente y los servicios, y los puntos flojos si se mencionan.',
	'Usá solo lo que dice la descripción: no agregues datos que no estén ahí.',
].join(' ');

export const POST: APIRoute = async ({ request }) => {
	if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor' }, 503);
	const body = await request.json().catch(() => ({})) as { name?: string; description?: string };
	const description = body.description?.trim() ?? '';
	if (description.length < 40) return json({ error: 'La descripción es muy corta para resumirla' }, 400);
	try {
		const client = new Anthropic();
		const response = await client.beta.messages.create({
			model: 'claude-opus-5-5',
			max_tokens: 16000,
			// Resumir es una tarea simple: con poco esfuerzo responde rápido.
			output_config: { effort: 'low' },
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			system: SYSTEM,
			messages: [{ role: 'user', content: `Lugar: ${body.name?.trim() || 'sin nombre'}\n\nDescripción:\n${description}` }],
		});
		if (response.stop_reason === 'refusal') return json({ error: 'No se pudo resumir esta descripción' }, 422);
		const summary = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n').trim();
		return summary ? json({ summary }) : json({ error: 'No se pudo generar el resumen' }, 502);
	} catch (error) {
		if (error instanceof Anthropic.AuthenticationError) return json({ error: 'La clave ANTHROPIC_API_KEY del servidor no es válida' }, 503);
		if (error instanceof Anthropic.RateLimitError) return json({ error: 'Demasiados pedidos seguidos: probá de nuevo en un rato' }, 429);
		if (error instanceof Anthropic.APIError) return json({ error: `No se pudo generar el resumen (${error.status ?? 'error'})` }, 502);
		return json({ error: 'No se pudo generar el resumen' }, 500);
	}
};
