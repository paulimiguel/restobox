import type { APIRoute } from 'astro';

export const prerender = false;

const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);

function safeTikTokUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && TIKTOK_HOSTS.has(url.hostname.toLocaleLowerCase('en')) ? url : null;
	} catch {
		return null;
	}
}

function tiktokVideoId(url: URL) {
	return url.pathname.match(/^\/@[^/]+\/video\/(\d+)/i)?.[1]
		?? url.pathname.match(/^\/player\/v1\/(\d+)/i)?.[1]
		?? '';
}

export const GET: APIRoute = async ({ url }) => {
	const requested = url.searchParams.get('url')?.trim() ?? '';
	if (!requested || requested.length > 600) return Response.json({ error: 'Enlace de TikTok inválido' }, { status: 400 });
	let current = safeTikTokUrl(requested);
	if (!current) return Response.json({ error: 'Enlace de TikTok inválido' }, { status: 400 });

	try {
		for (let redirect = 0; redirect < 6; redirect += 1) {
			const id = tiktokVideoId(current);
			if (id) return Response.json({ embedUrl: `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=0` });
			const response = await fetch(current, {
				redirect: 'manual',
				signal: AbortSignal.timeout(8_000),
				headers: { 'user-agent': 'Mozilla/5.0 (compatible; RestoBox/1.0)' },
			});
			const location = response.headers.get('location');
			if (!location) break;
			current = safeTikTokUrl(new URL(location, current).href);
			if (!current) return Response.json({ error: 'TikTok redirigió a un destino no permitido' }, { status: 400 });
		}
		return Response.json({ error: 'No se pudo reconocer el video de TikTok' }, { status: 422 });
	} catch {
		return Response.json({ error: 'No se pudo abrir el enlace de TikTok' }, { status: 502 });
	}
};
