/// <reference types="astro/client" />

declare namespace App {
	interface SessionData {
		user: {
			id: string;
			username: string;
			role: 'admin' | 'user';
		};
	}
}
