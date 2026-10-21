export {};

type PlaceSummary = {
	id: string;
	name: string;
	establishmentType?: string;
	establishmentTypes?: string[];
	cuisine?: string;
	cuisines?: string[];
	neighborhood?: string;
	favorite?: boolean;
	visited?: boolean;
	checked?: boolean;
};

type PlaceMedia = { restaurantId: string; kind: 'image' | 'logo'; order: number; url: string };

const themeLogos: Record<string, string> = {
	aguamarina: '/restobox-theme-aguamarina-transparent.png',
	carrot: '/restobox-theme-carrot-transparent.png',
	frutilla: '/restobox-theme-frutilla-transparent.png',
	grises: '/restobox-theme-grises-transparent.png',
	pasteles: '/restobox-theme-pasteles-transparent.png',
	salmon: '/restobox-theme-salmon-transparent.png',
	tierra: '/restobox-theme-tierra-transparent.png',
	violetas: '/restobox-theme-violetas-transparent.png',
};
const pageLogo = document.querySelector<HTMLImageElement>('#profile-page-logo');
if (pageLogo) pageLogo.src = themeLogos[document.documentElement.dataset.theme ?? ''] ?? '/restobox-logo-transparent.png';

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}

function placeCategory(place: PlaceSummary) {
	const types = place.establishmentTypes?.length ? place.establishmentTypes : [place.establishmentType ?? ''];
	return types.filter(Boolean).join(', ');
}

function placeTile(place: PlaceSummary, imageUrl?: string) {
	const details = [placeCategory(place), place.neighborhood ?? ''].filter(Boolean).join(' · ');
	const image = imageUrl
		? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />`
		: `<span>${escapeHtml(place.name.charAt(0).toLocaleUpperCase('es'))}</span>`;
	return `<a class="my-place-tile" href="/?lugar=${encodeURIComponent(place.id)}">
		<span class="my-place-image">${image}</span>
		<span class="my-place-text"><strong>${escapeHtml(place.name)}</strong>${details ? `<small>${escapeHtml(details)}</small>` : ''}</span>
	</a>`;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (response.status === 401) {
		window.location.assign('/login?next=/perfil');
		throw new Error('Sesión vencida');
	}
	if (!response.ok) throw new Error('No se pudo cargar la información');
	return response.json() as Promise<T>;
}

async function loadPlaces() {
	const lists = {
		favorites: document.querySelector<HTMLElement>('#list-favorites')!,
		visited: document.querySelector<HTMLElement>('#list-visited')!,
		'to-visit': document.querySelector<HTMLElement>('#list-to-visit')!,
	};
	try {
		const [{ restaurants }, { media }] = await Promise.all([
			fetchJson<{ restaurants: PlaceSummary[] }>('/api/restaurants'),
			fetchJson<{ media: PlaceMedia[] }>('/api/media'),
		]);
		const imageByPlace = new Map<string, string>();
		media
			.filter((item) => item.kind === 'logo')
			.forEach((item) => imageByPlace.set(item.restaurantId, item.url));
		[...media].filter((item) => item.kind === 'image').sort((a, b) => a.order - b.order).forEach((item) => {
			if (!imageByPlace.has(item.restaurantId)) imageByPlace.set(item.restaurantId, item.url);
		});
		const byName = (a: PlaceSummary, b: PlaceSummary) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
		const groups: Record<keyof typeof lists, PlaceSummary[]> = {
			favorites: restaurants.filter((place) => place.favorite).sort(byName),
			visited: restaurants.filter((place) => place.visited).sort(byName),
			'to-visit': restaurants.filter((place) => place.checked).sort(byName),
		};
		(Object.keys(lists) as Array<keyof typeof lists>).forEach((key) => {
			const places = groups[key];
			lists[key].innerHTML = places.length
				? places.map((place) => placeTile(place, imageByPlace.get(place.id))).join('')
				: `<p class="my-places-empty">${escapeHtml(lists[key].dataset.empty ?? 'Sin lugares')}</p>`;
			const counter = document.querySelector<HTMLElement>(`#count-${key}`);
			if (counter) counter.textContent = String(places.length);
		});
	} catch (error) {
		Object.values(lists).forEach((container) => {
			container.innerHTML = `<p class="my-places-empty">${escapeHtml(error instanceof Error ? error.message : 'No se pudo cargar la información')}</p>`;
		});
	}
}

void loadPlaces();
