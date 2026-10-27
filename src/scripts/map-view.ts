import L from 'leaflet';

export type MapPlace = {
	id: string;
	name: string;
	address?: string;
	neighborhood?: string;
	city?: string;
	province?: string;
	country?: string;
	mapUrl?: string;
	kind?: PlaceKind;
};
export type PlaceKind = 'restaurant' | 'cafe' | 'store';
type Position = { lat: number; lng: number };
type CachedPosition = { fingerprint: string; position: Position };

const cacheKey = 'restobox-map-coordinates-osm-v1';
const defaultCenter: L.LatLngTuple = [-38.0055, -57.5426];
// Cada tipo de lugar tiene su pin: la gota con el mismo ícono que usan los botones de filtro.
const pinGlyphs: Record<PlaceKind, string> = {
	restaurant: '<path d="M4 20V8l8-4 8 4v12M8 20v-7h8v7M3 20h18"/>',
	cafe: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Zm11 2h2a3 3 0 0 1 0 6h-2M4 21h14"/>',
	store: '<path d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"/>',
};
const pinIcons = new Map<PlaceKind, L.DivIcon>();
function pinIcon(kind: PlaceKind = 'restaurant') {
	let icon = pinIcons.get(kind);
	if (!icon) {
		icon = L.divIcon({
			className: 'map-pin',
			html: `<svg viewBox="0 0 64 64" width="34" height="42" aria-hidden="true"><path d="M32 2C17.1 2 6 13.1 6 27.9 6 45.3 32 62 32 62s26-16.7 26-34.1C58 13.1 46.9 2 32 2Z" fill="currentColor" stroke="#fff" stroke-width="3"/><circle cx="32" cy="27" r="15" fill="#fff"/><g transform="translate(20 15) scale(1)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${pinGlyphs[kind]}</g></svg>`,
			iconSize: [34, 42],
			iconAnchor: [17, 42],
			popupAnchor: [0, -38],
		});
		pinIcons.set(kind, icon);
	}
	return icon;
}

let map: L.Map | null = null;
let statusElement: HTMLElement | null = null;
let current: MapPlace[] = [];
let totalPlaces = 0;
let coordinateCache: Record<string, CachedPosition> = {};
const markers = new Map<string, L.Marker>();
const positions = new Map<string, Position>();
const failed = new Set<string>();
let working = false;
let lastVisibleKey = '';

try { coordinateCache = JSON.parse(localStorage.getItem(cacheKey) || '{}'); }
catch { coordinateCache = {}; }

const escapeHtml = (value: string) => String(value).replace(/[&<>'"]/g, (character) => ({
	'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]!);
const locationLabel = (place: MapPlace) => [place.address, place.neighborhood, place.city, place.province, place.country].filter(Boolean).join(', ');
const fingerprintOf = (place: MapPlace) => [place.name, place.mapUrl ?? '', locationLabel(place)].join('|');

function coordinatesFromUrl(value = ''): Position | null {
	if (!value) return null;
	const matches = [
		value.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/),
		value.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/),
		value.match(/[?&](?:q|query|destination|ll)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,)(-?\d{1,3}(?:\.\d+)?)/i),
	];
	for (const match of matches) {
		if (!match) continue;
		const lat = Number(match[1]);
		const lng = Number(match[2]);
		if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
	}
	return null;
}

async function geocode(query: string): Promise<Position | null> {
	const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
	if (response.status === 401) {
		window.location.assign('/login?next=/mapa');
		return null;
	}
	if (!response.ok) throw new Error('No se pudo buscar la dirección');
	return ((await response.json()) as { position: Position | null }).position;
}

function popupHtml(place: MapPlace) {
	const address = locationLabel(place);
	const mapsUrl = place.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.name, address].filter(Boolean).join(', '))}`;
	return `<div class="map-info"><strong>${escapeHtml(place.name)}</strong>${address ? `<span>${escapeHtml(address)}</span>` : ''}<div class="map-info-actions"><button type="button" class="map-info-open" data-open-place="${escapeHtml(place.id)}">Abrir ficha</button><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noreferrer">Abrir en Google Maps</a></div></div>`;
}

function renderMarkers(fit: boolean) {
	if (!map) return;
	const visibleIds = new Set(current.map((place) => place.id));
	const bounds = L.latLngBounds([]);
	let shown = 0;
	markers.forEach((marker, id) => {
		const show = visibleIds.has(id);
		if (show && !map!.hasLayer(marker)) marker.addTo(map!);
		if (!show && map!.hasLayer(marker)) marker.remove();
		if (show) {
			shown += 1;
			bounds.extend(marker.getLatLng());
		}
	});
	const visibleKey = current.map((place) => place.id).join(',');
	if ((fit || visibleKey !== lastVisibleKey) && shown) {
		if (shown === 1) map.setView(bounds.getCenter(), 15);
		else map.fitBounds(bounds, { padding: [54, 54] });
	}
	lastVisibleKey = visibleKey;
	if (!statusElement) return;
	const pending = current.filter((place) => !positions.has(place.id) && !failed.has(place.id)).length;
	if (pending) statusElement.textContent = `Ubicando lugares… faltan ${pending}`;
	else if (!current.length) statusElement.textContent = totalPlaces ? 'Ningún lugar coincide con los filtros.' : 'Todavía no hay lugares cargados.';
	else statusElement.textContent = shown === current.length
		? `${shown} de ${totalPlaces} lugares en el mapa`
		: `${shown} de ${current.length} lugares ubicados en el mapa`;
}

async function resolveLocations() {
	if (working) return;
	working = true;
	try {
		for (;;) {
			const next = current.find((place) => !positions.has(place.id) && !failed.has(place.id));
			if (!next) break;
			const fingerprint = fingerprintOf(next);
			const cached = coordinateCache[next.id];
			let position = cached?.fingerprint === fingerprint ? cached.position : coordinatesFromUrl(next.mapUrl);
			if (!position) {
				const query = locationLabel(next) || next.name;
				try { position = await geocode(query); }
				catch { /* se reintenta la próxima vez que se abra el mapa */ }
			}
			if (!position) {
				failed.add(next.id);
			} else {
				coordinateCache[next.id] = { fingerprint, position };
				positions.set(next.id, position);
				markers.set(next.id, L.marker([position.lat, position.lng], { icon: pinIcon(next.kind), title: next.name }).bindPopup(popupHtml(next)));
			}
			renderMarkers(false);
		}
	} finally {
		working = false;
	}
	try { localStorage.setItem(cacheKey, JSON.stringify(coordinateCache)); } catch { /* El mapa funciona sin caché. */ }
	renderMarkers(true);
}

export function initRestaurantMap(container: HTMLElement, status: HTMLElement, onOpenPlace?: (id: string) => void) {
	statusElement = status;
	map = L.map(container, { center: defaultCenter, zoom: 12, zoomControl: true });
	// El ícono de la ventanita abre la ficha del lugar en el directorio.
	map.on('popupopen', (event) => {
		event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-open-place]')?.addEventListener('click', (click) => {
			const id = (click.currentTarget as HTMLElement).dataset.openPlace;
			if (id) onOpenPlace?.(id);
		});
	});
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		// El servidor envía Referrer-Policy: same-origin, pero OpenStreetMap exige el Referer para servir los mapas.
		referrerPolicy: 'strict-origin-when-cross-origin',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
	}).addTo(map);
	window.addEventListener('resize', () => map?.invalidateSize());
}

// Recibe los lugares que coinciden con los filtros del directorio y actualiza los pines.
export function updateMapRestaurants(visible: MapPlace[], total: number) {
	if (!map) return;
	current = visible;
	totalPlaces = total;
	// Si cambió el tipo de un lugar ya ubicado, se actualiza su pin.
	visible.forEach((place) => markers.get(place.id)?.setIcon(pinIcon(place.kind)));
	map.invalidateSize();
	renderMarkers(false);
	void resolveLocations();
}
