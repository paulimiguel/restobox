import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { APIRoute } from 'astro';
import { getUserProfile, updateUserPhoto } from '../../../lib/server/auth';
import { profilePhotosDirectory } from '../../../lib/server/database';

const allowedTypes: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
};

async function removeLocalPhoto(value: string) {
	if (!value.startsWith('/api/profile-photo/')) return;
	const filename = basename(value);
	if (!filename || !extname(filename)) return;
	await unlink(join(profilePhotosDirectory, filename)).catch(() => undefined);
}

export const POST: APIRoute = async ({ request, session }) => {
	const sessionUser = await session?.get('user');
	if (!sessionUser) return Response.json({ error: 'No autorizado' }, { status: 401 });
	try {
		const formData = await request.formData();
		const photo = formData.get('photo');
		if (!(photo instanceof File)) return Response.json({ error: 'Seleccioná una imagen' }, { status: 400 });
		const extension = allowedTypes[photo.type];
		if (!extension) return Response.json({ error: 'Usá una imagen JPG, PNG o WebP' }, { status: 400 });
		if (photo.size > 5 * 1024 * 1024) return Response.json({ error: 'La foto no puede superar los 5 MB' }, { status: 400 });
		const filename = `${randomUUID()}${extension}`;
		await writeFile(join(profilePhotosDirectory, filename), Buffer.from(await photo.arrayBuffer()), { flag: 'wx' });
		const previous = getUserProfile(sessionUser.id)?.profilePhoto ?? '';
		const user = updateUserPhoto(sessionUser.id, `/api/profile-photo/${filename}`);
		await removeLocalPhoto(previous);
		session?.set('user', user);
		return Response.json({ user });
	} catch (error) {
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la foto' }, { status: 400 });
	}
};

export const DELETE: APIRoute = async ({ session }) => {
	const sessionUser = await session?.get('user');
	if (!sessionUser) return Response.json({ error: 'No autorizado' }, { status: 401 });
	const previous = getUserProfile(sessionUser.id)?.profilePhoto ?? '';
	const user = updateUserPhoto(sessionUser.id, '');
	await removeLocalPhoto(previous);
	session?.set('user', user);
	return Response.json({ user });
};
