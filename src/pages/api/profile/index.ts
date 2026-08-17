import type { APIRoute } from 'astro';
import { changeUserPassword, getUserProfile, updateUserProfile } from '../../../lib/server/auth';

export const GET: APIRoute = async ({ session }) => {
	const sessionUser = await session?.get('user');
	if (!sessionUser) return Response.json({ error: 'No autorizado' }, { status: 401 });
	return Response.json({ user: getUserProfile(sessionUser.id) ?? sessionUser });
};

export const PUT: APIRoute = async ({ request, session }) => {
	const sessionUser = await session?.get('user');
	if (!sessionUser) return Response.json({ error: 'No autorizado' }, { status: 401 });
	let body: { email?: string; name?: string; alias?: string; currentPassword?: string; newPassword?: string };
	try { body = await request.json(); }
	catch { return Response.json({ error: 'Solicitud inválida' }, { status: 400 }); }
	try {
		const user = updateUserProfile(sessionUser.id, {
			email: body.email ?? '',
			name: body.name ?? '',
			alias: body.alias ?? '',
		});
		if (body.newPassword) await changeUserPassword(sessionUser.id, body.currentPassword ?? '', body.newPassword);
		session?.set('user', user);
		return Response.json({ user });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil' }, { status: 400 });
	}
};
