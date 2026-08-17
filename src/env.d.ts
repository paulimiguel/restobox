/// <reference types="astro/client" />

declare namespace App {
	interface SessionData {
		user: {
			id: string;
			username: string;
			role: 'admin' | 'user';
			email?: string;
			name?: string;
			alias?: string;
			profilePhoto?: string;
			authProvider?: 'local' | 'google';
		};
		googleOAuth: {
			state: string;
			codeVerifier: string;
			next: string;
			createdAt: number;
		};
	}
}
