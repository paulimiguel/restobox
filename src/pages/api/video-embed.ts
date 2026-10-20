import type { APIRoute } from 'astro';

export const prerender = false;

const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am', 'www.instagr.am']);

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

function safeInstagramUrl(value: string) {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || !INSTAGRAM_HOSTS.has(url.hostname.toLocaleLowerCase('en'))) return null;
		const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)/i);
		if (!match) return null;
		const kind = match[1].toLocaleLowerCase('en') === 'reels' ? 'reel' : match[1].toLocaleLowerCase('en');
		return new URL(`https://www.instagram.com/${kind}/${match[2]}/embed/`);
	} catch {
		return null;
	}
}

function decodeInstagramValue(value: string) {
	let decoded = value;
	for (let level = 0; level < 4; level += 1) {
		try {
			const next = JSON.parse(`"${decoded}"`) as string;
			if (next === decoded) break;
			decoded = next;
		} catch { break; }
	}
	return decoded.trim();
}

function safeInstagramMediaUrl(value: string) {
	try {
		const url = new URL(value);
		const host = url.hostname.toLocaleLowerCase('en');
		return url.protocol === 'https:' && (host === 'cdninstagram.com' || host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net'))
			? url.href
			: '';
	} catch {
		return '';
	}
}

async function resolveInstagramVideo(url: URL) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(10_000),
		headers: { 'user-agent': 'Mozilla/5.0 (compatible; RestoBox/1.0)', accept: 'text/html' },
	});
	if (!response.ok) throw new Error(`Instagram respondió con ${response.status}`);
	const html = await response.text();
	if (html.length > 3_000_000) throw new Error('La respuesta de Instagram es demasiado grande');
	const encoded = html.match(/\\?"video_url\\?"\s*:\s*\\?"((?:\\\\.|[^"\\])+)\\?"/)?.[1] ?? '';
	return safeInstagramMediaUrl(decodeInstagramValue(encoded));
}

export const GET: APIRoute = async ({ url }) => {
	const requested = url.searchParams.get('url')?.trim() ?? '';
	if (!requested || requested.length > 600) return Response.json({ error: 'Enlace de video inválido' }, { status: 400 });
	const instagramUrl = safeInstagramUrl(requested);
	if (instagramUrl) {
		try {
			const mediaUrl = await resolveInstagramVideo(instagramUrl);
			return mediaUrl
				? Response.json({ mediaUrl })
				: Response.json({ error: 'No se encontró el archivo de video de Instagram' }, { status: 422 });
		} catch {
			return Response.json({ error: 'No se pudo abrir el video de Instagram' }, { status: 502 });
		}
	}
	let current = safeTikTokUrl(requested);
	if (!current) return Response.json({ error: 'Enlace de TikTok inválido' }, { status: 400 });

	try {
		for (let redirect = 0; redirect < 6; redirect += 1) {
			const id = tiktokVideoId(current);
			if (id) return Response.json({ embedUrl: `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=0&muted=0` });
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
