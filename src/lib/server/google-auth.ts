import { randomBytes, timingSafeEqual } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';

const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

function getRequiredConfiguration() {
	const clientId = process.env.RESTOBOX_GOOGLE_CLIENT_ID?.trim();
	const clientSecret = process.env.RESTOBOX_GOOGLE_CLIENT_SECRET?.trim();
	const allowedEmails = new Set(
		(process.env.RESTOBOX_GOOGLE_ALLOWED_EMAILS ?? '')
			.split(',')
			.map((email) => email.trim().toLocaleLowerCase('en'))
			.filter(Boolean),
	);
	if (!clientId || !clientSecret || allowedEmails.size === 0) return null;
	return { clientId, clientSecret, allowedEmails };
}

export function isGoogleAuthConfigured() {
	return Boolean(getRequiredConfiguration());
}

export function safeLoginDestination(value: string | null | undefined) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
	return value;
}

export function googleCallbackUrl(requestUrl: string) {
	const configuredOrigin = process.env.RESTOBOX_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
	const origin = configuredOrigin || new URL(requestUrl).origin;
	return new URL(GOOGLE_CALLBACK_PATH, origin).toString();
}

export async function createGoogleAuthorization(requestUrl: string) {
	const configuration = getRequiredConfiguration();
	if (!configuration) return null;
	const client = new OAuth2Client({
		clientId: configuration.clientId,
		clientSecret: configuration.clientSecret,
		redirectUri: googleCallbackUrl(requestUrl),
	});
	const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
	const state = randomBytes(32).toString('base64url');
	const url = client.generateAuthUrl({
		access_type: 'online',
		prompt: 'select_account',
		response_type: 'code',
		scope: ['openid', 'email', 'profile'],
		state,
		code_challenge: codeChallenge,
		code_challenge_method: CodeChallengeMethod.S256,
	});
	return { state, codeVerifier, url };
}

export function isMatchingGoogleState(expected: string, received: string) {
	const expectedBuffer = Buffer.from(expected);
	const receivedBuffer = Buffer.from(received);
	return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function exchangeGoogleAuthorizationCode(code: string, codeVerifier: string, requestUrl: string) {
	const configuration = getRequiredConfiguration();
	if (!configuration) return null;
	const client = new OAuth2Client({
		clientId: configuration.clientId,
		clientSecret: configuration.clientSecret,
		redirectUri: googleCallbackUrl(requestUrl),
	});
	const { tokens } = await client.getToken({ code, codeVerifier });
	if (!tokens.id_token) return null;
	const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: configuration.clientId });
	const payload = ticket.getPayload();
	const email = payload?.email?.trim().toLocaleLowerCase('en');
	if (!payload?.sub || !email || payload.email_verified !== true) return null;
	if (!configuration.allowedEmails.has(email)) return { allowed: false as const, email };
	return {
		allowed: true as const,
		user: {
			id: `google:${payload.sub}`,
			username: payload.name?.trim() || email,
			role: 'user' as const,
		},
	};
}
