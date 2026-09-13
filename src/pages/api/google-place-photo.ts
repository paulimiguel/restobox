import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const name = url.searchParams.get('name')?.trim() ?? '';
	if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return Response.json({ error: 'Referencia de foto inválida' }, { status: 400 });
	const apiKey = process.env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) return Response.json({ error: 'Falta configurar Google Places' }, { status: 503 });
	try {
		const response = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1600&maxHeightPx=1600&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(15_000) });
		const media = await response.json() as { photoUri?: string; error?: { message?: string } };
		if (!response.ok || !media.photoUri) return Response.json({ error: media.error?.message || 'Google no devolvió la foto' }, { status: response.status || 502 });
		const photo = await fetch(media.photoUri, { signal: AbortSignal.timeout(20_000) });
		if (!photo.ok) return Response.json({ error: 'No se pudo descargar la foto' }, { status: 502 });
		const bytes = await photo.arrayBuffer();
		if (bytes.byteLength > 15 * 1024 * 1024) return Response.json({ error: 'La foto es demasiado grande' }, { status: 413 });
		return new Response(bytes, { headers: { 'content-type': photo.headers.get('content-type') || 'image/jpeg', 'cache-control': 'private, no-store' } });
	} catch { return Response.json({ error: 'No se pudo obtener la foto de Google' }, { status: 502 }); }
};
