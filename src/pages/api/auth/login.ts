import type { APIRoute } from 'astro';
import { verifyUser } from '../../../lib/server/auth';

export const POST: APIRoute = async ({ request, session }) => {
	let body: { username?: string; password?: string };
	try { body = await request.json(); }
	catch { return Response.json({ error: 'Solicitud inválida' }, { status: 400 }); }
	const user = await verifyUser(body.username ?? '', body.password ?? '');
	if (!user) return Response.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
	await session?.regenerate();
	session?.set('user', user);
	return Response.json({ user });
};
