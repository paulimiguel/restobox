import type { APIRoute } from 'astro';
import { exchangeGoogleAuthorizationCode, isMatchingGoogleState, safeLoginDestination } from '../../../../lib/server/google-auth';

export const GET: APIRoute = async ({ request, redirect, session }) => {
	const requestUrl = new URL(request.url);
	const authorizationError = requestUrl.searchParams.get('error');
	if (authorizationError) return redirect('/login?google_error=cancelled', 303);
	const stored = await session?.get('googleOAuth');
	session?.delete('googleOAuth');
	const code = requestUrl.searchParams.get('code') ?? '';
	const state = requestUrl.searchParams.get('state') ?? '';
	if (!stored || Date.now() - stored.createdAt > 10 * 60 * 1000 || !code || !isMatchingGoogleState(stored.state, state)) {
		return redirect('/login?google_error=invalid_state', 303);
	}
	try {
		const result = await exchangeGoogleAuthorizationCode(code, stored.codeVerifier, request.url);
		if (!result) return redirect('/login?google_error=failed', 303);
		if (!result.allowed) return redirect('/login?google_error=not_allowed', 303);
		await session?.regenerate();
		session?.set('user', result.user);
		return redirect(safeLoginDestination(stored.next), 303);
	} catch {
		return redirect('/login?google_error=failed', 303);
	}
};
