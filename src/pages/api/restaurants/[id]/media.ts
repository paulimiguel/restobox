import type { APIRoute } from 'astro';
import { getRestaurant, listMedia, replaceMediaRecords, type MediaRecord } from '../../../../lib/server/database';
import { removeMediaFiles, storeImage } from '../../../../lib/server/media-storage';

type ManifestItem = { id: string; order: number };

export const GET: APIRoute = ({ params }) => {
	const restaurantId = params.id ?? '';
	if (!getRestaurant(restaurantId)) return Response.json({ error: 'Lugar no encontrado' }, { status: 404 });
	const media = listMedia(restaurantId).map((item) => ({
		id: item.id, restaurantId: item.restaurantId, kind: item.kind, order: item.sortOrder,
		mimeType: item.mimeType, size: item.size, url: `/api/media/${encodeURIComponent(item.id)}`,
	}));
	return Response.json({ media });
};

export const PUT: APIRoute = async ({ params, request }) => {
	const restaurantId = params.id ?? '';
	if (!getRestaurant(restaurantId)) return Response.json({ error: 'Lugar no encontrado' }, { status: 404 });
	let data: FormData;
	try { data = await request.formData(); }
	catch { return Response.json({ error: 'Formulario inválido' }, { status: 400 }); }
	const kindValue = data.get('kind');
	const kind = kindValue === 'image' || kindValue === 'logo' ? kindValue : null;
	if (!kind) return Response.json({ error: 'Tipo de imagen inválido' }, { status: 400 });
	let manifest: ManifestItem[];
	try {
		const parsed = JSON.parse(String(data.get('manifest') ?? '[]')) as unknown;
		if (!Array.isArray(parsed)) throw new Error();
		manifest = parsed.map((item) => ({ id: String(item?.id ?? ''), order: Number(item?.order ?? 0) }));
	} catch { return Response.json({ error: 'Lista de imágenes inválida' }, { status: 400 }); }
	if (manifest.some((item) => !/^[a-zA-Z0-9-]{1,100}$/.test(item.id) || !Number.isInteger(item.order))) return Response.json({ error: 'Lista de imágenes inválida' }, { status: 400 });
	if (new Set(manifest.map((item) => item.id)).size !== manifest.length) return Response.json({ error: 'Hay imágenes repetidas' }, { status: 400 });
	if (manifest.length > (kind === 'image' ? 12 : 1)) return Response.json({ error: 'Se superó el máximo de imágenes' }, { status: 400 });

	const previous = listMedia(restaurantId, kind);
	const previousById = new Map(previous.map((item) => [item.id, item]));
	const created: MediaRecord[] = [];
	try {
		const records: MediaRecord[] = [];
		for (const item of manifest) {
			const upload = data.get(`file:${item.id}`);
			if (upload instanceof File && upload.size > 0) {
				const stored = await storeImage(upload);
				const record: MediaRecord = { id: item.id, restaurantId, kind, sortOrder: item.order, ...stored };
				records.push(record);
				created.push(record);
			} else {
				const existing = previousById.get(item.id);
				if (!existing) throw new Error('Falta cargar una de las imágenes');
				records.push({ ...existing, sortOrder: item.order });
			}
		}
		replaceMediaRecords(restaurantId, kind, records);
		const retained = new Set(records.map((item) => item.filename));
		await removeMediaFiles(previous.filter((item) => !retained.has(item.filename)));
		return Response.json({ media: records.map((item) => ({
			id: item.id, restaurantId, kind, order: item.sortOrder, mimeType: item.mimeType, size: item.size,
			url: `/api/media/${encodeURIComponent(item.id)}`,
		})) });
	} catch (error) {
		await removeMediaFiles(created);
		return Response.json({ error: error instanceof Error ? error.message : 'No se pudieron guardar las imágenes' }, { status: 400 });
	}
};
