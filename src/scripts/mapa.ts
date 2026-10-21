import L from 'leaflet';

type MapRestaurant = {
	id: string;
	name: string;
	address: string;
	neighborhood: string;
	city: string;
	province: string;
	country: string;
	mapUrl: string;
};
type Position = { lat: number; lng: number };
type CachedPosition = { fingerprint: string; position: Position };

const mapElement = document.querySelector<HTMLElement>('#restaurant-map')!;
const statusElement = document.querySelector<HTMLElement>('#map-status')!;
const restaurants = JSON.parse(document.querySelector('#map-restaurants-data')?.textContent || '[]') as MapRestaurant[];
const cacheKey = 'restobox-map-coordinates-osm-v1';
const defaultCenter: L.LatLngTuple = [-38.0055, -57.5426];
let coordinateCache: Record<string, CachedPosition> = {};

try { coordinateCache = JSON.parse(localStorage.getItem(cacheKey) || '{}'); }
catch { coordinateCache = {}; }

const escapeHtml = (value: string) => String(value).replace(/[&<>'"]/g, (character) => ({
	'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]!);
const locationLabel = (restaurant: MapRestaurant) => [restaurant.address, restaurant.neighborhood, restaurant.city, restaurant.province, restaurant.country].filter(Boolean).join(', ');
const locationFingerprint = (restaurant: MapRestaurant) => [restaurant.name, restaurant.mapUrl, locationLabel(restaurant)].join('|');

function coordinatesFromUrl(value: string): Position | null {
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

const pinIcon = L.divIcon({
	className: 'map-pin',
	html: '<svg viewBox="0 0 64 64" width="34" height="42" aria-hidden="true"><path d="M32 2C17.1 2 6 13.1 6 27.9 6 45.3 32 62 32 62s26-16.7 26-34.1C58 13.1 46.9 2 32 2Z" fill="currentColor" stroke="#fff" stroke-width="3"/><circle cx="32" cy="27" r="9" fill="#fff"/></svg>',
	iconSize: [34, 42],
	iconAnchor: [17, 42],
	popupAnchor: [0, -38],
});

async function initRestaurantMap() {
	const map = L.map(mapElement, { center: defaultCenter, zoom: 12, zoomControl: true });
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		// El servidor envía Referrer-Policy: same-origin, pero OpenStreetMap exige el Referer para servir los mapas.
		referrerPolicy: 'strict-origin-when-cross-origin',
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
	}).addTo(map);
	const bounds = L.latLngBounds([]);
	let locatedCount = 0;
	let geocodingFailed = false;

	const addMarker = (restaurant: MapRestaurant, position: Position) => {
		const address = locationLabel(restaurant);
		const mapsUrl = restaurant.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([restaurant.name, address].filter(Boolean).join(', '))}`;
		L.marker([position.lat, position.lng], { icon: pinIcon, title: restaurant.name })
			.addTo(map)
			.bindPopup(`<div class="map-info"><strong>${escapeHtml(restaurant.name)}</strong>${address ? `<span>${escapeHtml(address)}</span>` : ''}<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noreferrer">Abrir en Google Maps</a></div>`);
		bounds.extend([position.lat, position.lng]);
		locatedCount += 1;
	};

	for (const [index, restaurant] of restaurants.entries()) {
		statusElement.textContent = `Ubicando restaurantes… ${index + 1} de ${restaurants.length}`;
		const fingerprint = locationFingerprint(restaurant);
		const cached = coordinateCache[restaurant.id];
		let position = cached?.fingerprint === fingerprint ? cached.position : coordinatesFromUrl(restaurant.mapUrl);
		if (!position) {
			const query = locationLabel(restaurant) || restaurant.name;
			if (query) {
				try { position = await geocode(query); }
				catch { geocodingFailed = true; }
			}
		}
		if (!position) continue;
		coordinateCache[restaurant.id] = { fingerprint, position };
		addMarker(restaurant, position);
		if (locatedCount === 1) map.setView([position.lat, position.lng], 14);
	}

	try { localStorage.setItem(cacheKey, JSON.stringify(coordinateCache)); } catch { /* El mapa funciona sin caché. */ }
	if (locatedCount > 1) map.fitBounds(bounds, { padding: [54, 54] });
	else if (locatedCount === 1) map.setView(bounds.getCenter(), 15);
	statusElement.textContent = locatedCount
		? `${locatedCount} de ${restaurants.length} restaurantes ubicados`
		: geocodingFailed
			? 'No se pudieron buscar las direcciones. Probá de nuevo en unos minutos.'
			: 'No se encontraron ubicaciones para mostrar.';
}

if (!restaurants.length) {
	statusElement.textContent = 'Todavía no hay restaurantes cargados.';
	mapElement.innerHTML = '<div class="map-error">Agregá lugares al directorio para verlos en el mapa.</div>';
} else {
	void initRestaurantMap().catch(() => {
		statusElement.hidden = true;
		mapElement.innerHTML = '<div class="map-error">No se pudo cargar el mapa. Revisá tu conexión a internet.</div>';
	});
}
