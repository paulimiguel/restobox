import { defineMiddleware } from 'astro:middleware';
import { ensureBootstrapAdmin } from './lib/server/auth';

const publicPaths = new Set(['/login', '/api/auth/login', '/api/auth/google/start', '/api/auth/google/callback']);

export const onRequest = defineMiddleware(async (context, next) => {
	await ensureBootstrapAdmin();
	const pathname = context.url.pathname.replace(/\/$/, '') || '/';
	const user = await context.session?.get('user');
	const isPublic = publicPaths.has(pathname);

	if (!['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
		const origin = context.request.headers.get('origin');
		const publicOrigin = process.env.RESTOBOX_PUBLIC_ORIGIN?.replace(/\/$/, '');
		const allowedOrigins = new Set([context.url.origin, publicOrigin].filter((value): value is string => Boolean(value)));
		if (origin && !allowedOrigins.has(origin)) return new Response('Origen no permitido', { status: 403 });
	}

	if (isPublic) {
		if (user && pathname === '/login') return context.redirect('/');
		return next();
	}
	if (!user) {
		if (pathname.startsWith('/api/')) return Response.json({ error: 'No autorizado' }, { status: 401 });
		return context.redirect(`/login?next=${encodeURIComponent(`${pathname}${context.url.search}`)}`);
	}
	return next();
});
