/// <reference types="astro/client" />

declare namespace App {
	interface SessionData {
		user: {
			id: string;
			username: string;
			role: 'admin' | 'user';
		};
		googleOAuth: {
			state: string;
			codeVerifier: string;
			next: string;
			createdAt: number;
		};
	}
}
