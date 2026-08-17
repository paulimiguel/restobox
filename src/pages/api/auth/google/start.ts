import type { APIRoute } from 'astro';
import { createGoogleAuthorization, safeLoginDestination } from '../../../../lib/server/google-auth';

export const GET: APIRoute = async ({ request, redirect, session }) => {
	const requestUrl = new URL(request.url);
	const authorization = await createGoogleAuthorization(request.url);
	if (!authorization) return redirect('/login?google_error=not_configured', 303);
	const next = safeLoginDestination(requestUrl.searchParams.get('next'));
	session?.set('googleOAuth', {
		state: authorization.state,
		codeVerifier: authorization.codeVerifier,
		next,
		createdAt: Date.now(),
	}, { ttl: 10 * 60 });
	return redirect(authorization.url, 302);
};
