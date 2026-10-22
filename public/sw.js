// Service worker mínimo: permite instalar la app y muestra un aviso si no hay conexión.
// No guarda datos en caché: el directorio siempre se lee del servidor.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
	if (event.request.mode !== 'navigate') return;
	event.respondWith(fetch(event.request).catch(() => new Response(
		'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FoodieBox</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#26382f;background:#f7f6f2;text-align:center"><div><h1>Sin conexión</h1><p>FoodieBox necesita internet para cargar tus lugares.</p></div>',
		{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
	)));
});
