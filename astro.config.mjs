// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
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
	// `data` es un enlace al directorio compartido del servidor. Así los
	// usuarios no pierden su sesión cada vez que se publica una versión.
	session: {
		driver: sessionDrivers.fsLite({ base: 'data/sessions' }),
	},
	adapter: node({ mode: 'standalone' }),
});
