import type { APIRoute } from 'astro';
import { listMedia } from '../../../lib/server/database';

export const GET: APIRoute = ({ url }) => {
	const restaurantId = url.searchParams.get('restaurantId') || undefined;
	const requestedKind = url.searchParams.get('kind');
	const kind = requestedKind === 'image' || requestedKind === 'logo' ? requestedKind : undefined;
	const media = listMedia(restaurantId, kind).map((item) => ({
		id: item.id,
		restaurantId: item.restaurantId,
		kind: item.kind,
		order: item.sortOrder,
		mimeType: item.mimeType,
		size: item.size,
		url: `/api/media/${encodeURIComponent(item.id)}`,
	}));
	return Response.json({ media });
};
