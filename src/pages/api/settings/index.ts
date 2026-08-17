import type { APIRoute } from 'astro';
import { getSettings, setSetting } from '../../../lib/server/database';

export const GET: APIRoute = () => Response.json({ settings: getSettings() });

export const PUT: APIRoute = async ({ request }) => {
	let body: { key?: string; value?: unknown };
	try { body = await request.json(); }
	catch { return Response.json({ error: 'Solicitud inválida' }, { status: 400 }); }
	try {
		setSetting(body.key ?? '', body.value);
		return Response.json({ ok: true });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la configuración' }, { status: 400 });
	}
};
