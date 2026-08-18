// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	// CloudPanel termina HTTPS y reenvía la petición a Astro por HTTP local.
	// La validación de origen se realiza en src/middleware.ts usando
	// RESTOBOX_PUBLIC_ORIGIN, que conoce la URL pública detrás del proxy.
	security: {
		checkOrigin: false,
	},
	adapter: node({ mode: 'standalone' }),
});
