import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// Botón "Importar descripción": Claude busca el lugar en la web (sitio, Instagram, Facebook, notas, Google)
// y escribe una descripción con el estilo del modo IA de Google: un párrafo de presentación y secciones
// con título ("## Título") y puntos ("- Etiqueta: texto"). En la app los títulos se ven en negrita
// con una línea en blanco arriba y cada punto es una viñeta.
const SYSTEM = `Escribís descripciones de restaurantes, cafés, bares y tiendas de comida para un directorio personal en español rioplatense.

Primero buscá en la web el lugar indicado (su sitio, Instagram, Facebook, Google Maps, guías y notas de prensa) y asegurate de que sea el de esa ciudad: puede haber lugares con el mismo nombre en otras ciudades. Usá solo datos que encuentres; si algo no aparece, no lo inventes ni lo menciones.

Respondé únicamente con la descripción, sin saludo, sin explicar qué buscaste y sin citar fuentes, con este formato de texto plano:
- Primero, un párrafo de presentación de 2 a 4 oraciones: qué es el lugar, desde cuándo existe, dónde está y qué lo distingue.
- Después, entre 2 y 4 secciones. Cada sección empieza con una línea "## " seguida del título (por ejemplo "## Qué ofrece el lugar", "## Platos destacados", "## Beneficios destacados"), sin emojis.
- Debajo de cada título, entre 2 y 6 puntos, uno por línea, con el formato "- Etiqueta: texto" (por ejemplo "- Café-Restó: Abierto todos los días de 7:00 a 1:00 hs. …"). Cada punto es una o dos oraciones.
- Horarios en formato de 24 horas. No uses negritas, asteriscos, enlaces ni tablas.`;

type Body = { name?: string; city?: string; neighborhood?: string; address?: string; province?: string; country?: string; instagramUrl?: string; website?: string };

// Texto final: lo que Claude escribió después de su última búsqueda, sin marcas de Markdown.
function descriptionText(content: Anthropic.Beta.BetaContentBlock[]) {
	const lastSearch = content.map((block) => block.type).lastIndexOf('web_search_tool_result');
	const text = content.slice(lastSearch + 1)
		.filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');
	return text
		.replace(/\r/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/^#{1,6}\s*/gm, (marker) => (marker.trim() ? '## ' : marker))
		.split('\n')
		.map((line) => line.trim().replace(/^[-*•]\s+/, ''))
		.filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
		.join('\n')
		.trim();
}

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => ({})) as Body;
	const name = body.name?.trim() ?? '';
	if (name.length < 2) return json({ error: 'Cargá el nombre del lugar' }, 400);
	if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor' }, 503);

	const details = [
		['Nombre', name],
		['Dirección', body.address],
		['Zona', body.neighborhood],
		['Ciudad', body.city],
		['Provincia', body.province],
		['País', body.country],
		['Instagram', body.instagramUrl],
		['Sitio web', body.website],
	].filter(([, value]) => value?.trim()).map(([label, value]) => `${label}: ${value!.trim()}`).join('\n');

	const client = new Anthropic();
	const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: `Escribí la descripción de este lugar:\n${details}` }];
	try {
		let response: Anthropic.Beta.BetaMessage | null = null;
		// Una búsqueda larga puede pausar el turno ("pause_turn"): se reenvía para que el servidor siga.
		for (let attempt = 0; attempt < 5; attempt += 1) {
			response = await client.beta.messages.stream({
				model: 'claude-opus-5-5',
				max_tokens: 16000,
				betas: ['server-side-fallback-2026-07-01'],
				fallbacks: 'default',
				output_config: { effort: 'medium' },
				system: SYSTEM,
				tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
				messages,
			}).finalMessage();
			if (response.stop_reason !== 'pause_turn') break;
			messages.push({ role: 'assistant', content: response.content });
		}
		if (!response || response.stop_reason === 'refusal') return json({ error: 'No se pudo armar la descripción de este lugar' }, 422);
		const description = descriptionText(response.content);
		if (!description) return json({ error: `No se encontró información de “${name}”` }, 404);
		return json({ description });
	} catch (error) {
		if (error instanceof Anthropic.AuthenticationError) return json({ error: 'La clave ANTHROPIC_API_KEY del servidor no es válida' }, 503);
		if (error instanceof Anthropic.RateLimitError) return json({ error: 'Hay muchas consultas a Claude en este momento; probá de nuevo en un rato' }, 429);
		if (error instanceof Anthropic.APIError) return json({ error: `Claude respondió con un error (${error.status ?? 'sin estado'})` }, 502);
		return json({ error: 'No se pudo conectar con Claude' }, 502);
	}
};
