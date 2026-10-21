import type { APIRoute } from 'astro';

export const prerender = false;

// Busca coordenadas con Nominatim (OpenStreetMap). Su política de uso pide como máximo
// una consulta por segundo y un User-Agent que identifique la aplicación.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_INTERVAL_MS = 1100;
const cache = new Map<string, { lat: number; lng: number } | null>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(async () => {
		const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
		if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
		try { return await task(); }
		finally { lastRequestAt = Date.now(); }
	});
	queue = run.catch(() => undefined);
	return run;
}

export const GET: APIRoute = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	if (query.length < 3 || query.length > 300) return Response.json({ error: 'Dirección inválida' }, { status: 400 });
	const key = query.toLocaleLowerCase('es');
	if (cache.has(key)) return Response.json({ position: cache.get(key) });
	try {
		const position = await enqueue(async () => {
			const response = await fetch(`${NOMINATIM_URL}?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' })}`, {
				signal: AbortSignal.timeout(10_000),
				headers: { 'user-agent': 'RestoBox/1.0 (+https://restobox.beweb.com.ar)', 'accept-language': 'es', accept: 'application/json' },
			});
			if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);
			const results = await response.json() as Array<{ lat?: string; lon?: string }>;
			const lat = Number(results[0]?.lat);
			const lng = Number(results[0]?.lon);
			return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
		});
		cache.set(key, position);
		return Response.json({ position });
	} catch {
		return Response.json({ error: 'No se pudo buscar la dirección' }, { status: 502 });
	}
};
