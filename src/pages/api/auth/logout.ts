import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ session }) => {
	session?.destroy();
	return Response.json({ ok: true });
};
