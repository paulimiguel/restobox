import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { getSettings } from '../../lib/server/database';

export const prerender = false;

type GoogleText = { text?: string };
type GoogleMoney = { currencyCode?: string; units?: string; nanos?: number };
type GoogleAddressComponent = { longText?: string; types?: string[] };
type GooglePlace = {
	id?: string;
	location?: { latitude?: number; longitude?: number };
	displayName?: GoogleText; formattedAddress?: string; addressComponents?: GoogleAddressComponent[];
	nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string;
	googleMapsLinks?: { directionsUri?: string; placeUri?: string }; regularOpeningHours?: { weekdayDescriptions?: string[] };
	rating?: number; priceLevel?: string; priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney };
	types?: string[]; primaryType?: string; editorialSummary?: GoogleText;
	generativeSummary?: { overview?: GoogleText; description?: GoogleText }; reviewSummary?: { text?: GoogleText };
	photos?: Array<{ name?: string }>; delivery?: boolean; takeout?: boolean;
	servesBreakfast?: boolean; servesBrunch?: boolean; servesLunch?: boolean; servesDinner?: boolean;
	servesBeer?: boolean; servesWine?: boolean; servesCocktails?: boolean; servesDessert?: boolean; servesCoffee?: boolean;
	servesVegetarianFood?: boolean; outdoorSeating?: boolean; liveMusic?: boolean; goodForChildren?: boolean;
	allowsDogs?: boolean; goodForGroups?: boolean; goodForWatchingSports?: boolean;
};
type PublicPageData = { links: string[]; images: string[]; description: string; keywords: string[]; text: string };
type RequestedImageSources = { instagramUrl?: string; facebookUrl?: string };
type RestaurantSearchResult = Record<string, unknown> & {
	instagramUrl?: string;
	facebookUrl?: string;
	logoUrl?: string;
	imageUrls?: string[];
	wokiImageUrls?: string[];
	googleImageUrls?: string[];
	publicImageUrls?: string[];
	sources?: string[];
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const component = (place: GooglePlace, ...types: string[]) => place.addressComponents?.find((item) => types.some((type) => item.types?.includes(type)))?.longText?.trim() ?? '';
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const unique = (values: string[]) => [...new Map(values.map((value) => value.trim()).filter(Boolean).map((value) => [normalized(value), value])).values()];
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'));

// Google casi nunca informa el barrio en Argentina: si falta, se consulta la zona de las coordenadas en OpenStreetMap
// (Nominatim pide como máximo una consulta por segundo y un User-Agent que identifique la aplicación).
let lastZoneRequestAt = 0;
async function zoneFromCoordinates(latitude?: number, longitude?: number) {
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
	const wait = lastZoneRequestAt + 1100 - Date.now();
	lastZoneRequestAt = Date.now() + Math.max(wait, 0);
	if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', zoom: '16', addressdetails: '1' })}`, {
			signal: AbortSignal.timeout(8_000),
			headers: { 'user-agent': 'RestoBox/1.0 (+https://restobox.beweb.com.ar)', 'accept-language': 'es', accept: 'application/json' },
		});
		if (!response.ok) return '';
		const { address } = await response.json() as { address?: Record<string, string> };
		return (address?.neighbourhood || address?.suburb || address?.quarter || address?.city_district || '').trim();
	} catch {
		return '';
	}
}


// Categorías de FoodieBox (solapa Características). Se deducen de los tipos y servicios de Google y del texto
// de Google, Instagram, el sitio y Woki. Solo se devuelven categorías de esta lista, en este orden.
const googleStoreTypes = new Set(['store', 'grocery_store', 'food_store', 'convenience_store', 'supermarket', 'market', 'liquor_store', 'butcher_shop', 'health_food_store', 'gift_shop', 'wholesaler', 'shopping_mall']);
function detectCategories(place: GooglePlace, text: string) {
	const types = new Set(place.types ?? []);
	const hasType = (...values: string[]) => values.some((value) => types.has(value));
	const matches = (pattern: RegExp) => pattern.test(text);
	const found: Array<[string, boolean]> = [
		['Bar', hasType('bar', 'cocktail_bar', 'wine_bar') || matches(/\bbar\b/)],
		['Bodegón', matches(/\bbodegon\b/)],
		['Boliche', hasType('night_club') || matches(/\bboliche\b|\bdiscoteca\b|night ?club/)],
		['Café', hasType('cafe', 'coffee_shop') || matches(/\bcafe\b|cafeteria|coffee shop|specialty coffee/)],
		['Casa de té', hasType('tea_house') || matches(/casa de te\b|teteria|tea house/)],
		['Cervecería', hasType('brewery', 'beer_garden') || matches(/cerveceria|brewery|brewpub/)],
		['Comida rápida', hasType('fast_food_restaurant') || matches(/comida rapida|fast food/)],
		['Delivery', Boolean(place.delivery) || matches(/\bdelivery\b/)],
		['Eventos', matches(/\beventos?\b|salon de fiestas/)],
		['Heladería', hasType('ice_cream_shop') || matches(/heladeria|ice cream/)],
		['Juegos', matches(/juegos de mesa|\bjuegos\b|board games/)],
		['Karaoke', matches(/karaoke/)],
		['Keto', matches(/\bketo\b|cetogenic/)],
		['Pub', hasType('pub') || matches(/\bpub\b/)],
		['Puertas cerradas', matches(/puertas cerradas/)],
		['Recitales', matches(/\brecitales?\b/)],
		['Restaurante', hasType('restaurant') || [...types].some((type) => type.endsWith('_restaurant')) || matches(/\brestaurante\b/)],
		['Rooftop', matches(/rooftop/)],
		['Shows en vivo', Boolean(place.liveMusic) || matches(/shows? en vivo|musica en vivo|live music/)],
		['Sin gluten', matches(/sin gluten|gluten free|sin tacc|celiac/)],
		['Take away', Boolean(place.takeout) || matches(/take ?away|para llevar/)],
		['Talleres', matches(/\btalleres?\b/)],
		['Tapeo', matches(/\btapeo\b|\btapas\b/)],
		['Teatro', hasType('performing_arts_theater') || matches(/\bteatro\b/)],
		['Tienda', [...types].some((type) => googleStoreTypes.has(type)) || matches(/\btienda\b/)],
		['Trattoria', matches(/trattoria/)],
		['Vermutería', matches(/vermuteria|\bvermut\b/)],
	];
	return found.filter(([, present]) => present).map(([category]) => category);
}

// Servicios de FoodieBox (solapa Características): en qué momentos del día se come o toma algo y si hay tienda o eventos.
// Se deducen de los servicios de Google y del texto de Google, Instagram, el sitio y Woki.
function detectServices(place: GooglePlace, text: string, isStore: boolean) {
	const types = new Set(place.types ?? []);
	const matches = (pattern: RegExp) => pattern.test(text);
	const isCafe = types.has('cafe') || types.has('coffee_shop') || types.has('tea_house');
	const found: Array<[string, boolean]> = [
		['Desayuno', Boolean(place.servesBreakfast) || matches(/\bdesayunos?\b|breakfast/)],
		['Brunch', Boolean(place.servesBrunch) || matches(/\bbrunch\b/)],
		['Almuerzo', Boolean(place.servesLunch) || matches(/\balmuerzos?\b|\blunch\b/)],
		['Merienda', isCafe || matches(/\bmeriendas?\b|tea time/)],
		['Drunch', matches(/\bdrunch\b/)],
		['Cena', Boolean(place.servesDinner) || matches(/\bcenas?\b|\bdinner\b/)],
		['After-dinner', matches(/after[- ]?dinner|poscena|post ?cena/)],
		['Tragos', Boolean(place.servesCocktails) || matches(/\btragos?\b|cocteles|cocktails?|cocteleria/)],
		['Tienda', isStore],
		['Eventos', matches(/\beventos?\b|salon de fiestas/)],
	];
	return found.filter(([, present]) => present).map(([service]) => service);
}

// Listas de FoodieBox (cocinas, categorías, servicios) tal como están cargadas en la configuración del servidor.
function catalogList(key: 'cuisines' | 'establishmentTypes' | 'serviceTypes') {
	try {
		const values = (getSettings().catalogs as Record<string, unknown> | undefined)?.[key];
		return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
	} catch { return []; }
}

// Tipos de cocina de Google y los nombres con que pueden estar cargados en la lista (se usa el primero que exista).
const googleCuisineNames: Record<string, string[]> = {
	argentinian_restaurant: ['Argentina', 'Cocina argentina'], american_restaurant: ['Americana'], asian_restaurant: ['Asiática', 'Cocina asiática'],
	barbecue_restaurant: ['Parrilla'], steak_house: ['Steakhouse', 'Parrilla'], brazilian_restaurant: ['Brasileña'], chinese_restaurant: ['China'],
	french_restaurant: ['Francesa'], greek_restaurant: ['Griega'], indian_restaurant: ['India'], indonesian_restaurant: ['Indonesia'],
	italian_restaurant: ['Italiana'], japanese_restaurant: ['Japonesa', 'Cocina japonesa'], korean_restaurant: ['Coreana', 'Comida coreana'],
	lebanese_restaurant: ['Libanesa'], mediterranean_restaurant: ['Mediterránea'], mexican_restaurant: ['Mexicana', 'Comida mexicana'],
	middle_eastern_restaurant: ['Medio Oriente'], peruvian_restaurant: ['Peruana', 'Comida peruana'], pizza_restaurant: ['Pizzas', 'Pizza', 'Pizzería'],
	ramen_restaurant: ['Ramen'], seafood_restaurant: ['Mariscos', 'Cocina de mar'], spanish_restaurant: ['Española', 'Cocina española', 'Comida española'],
	sushi_restaurant: ['Sushi'], thai_restaurant: ['Tailandesa'], turkish_restaurant: ['Turca'], vegan_restaurant: ['Vegana'],
	vegetarian_restaurant: ['Vegetariana'], vietnamese_restaurant: ['Vietnamita'], hamburger_restaurant: ['Hamburguesas'], sandwich_shop: ['Sandwiches'],
	fast_food_restaurant: ['Comida rápida'], cafe: ['Cafetería'], coffee_shop: ['Cafetería'], brewery: ['Cervecería'], dessert_shop: ['Postres'],
};
// Nombres de la lista que no indican por sí solos un tipo de cocina: no se deducen del texto.
const ambiguousCuisineNames = new Set(['almuerzo', 'bar', 'cafe', 'cafeteria', 'eventos', 'pub', 'restaurante', 'tragos', 'comidas', 'elegante', 'moderno', 'internacional',
	'entretenimiento', 'trivia', 'balneario', 'europea', 'cosmopolita', 'contemporanea', 'buffet', 'cantina', 'gama media', 'hotel boutique', 'centro cultural',
	'club de playa', 'club nocturno', 'bar nocturno', 'merienda buffet', 'plato del dia', 'parador de playa', 'menu por pasos', 'gourmet', 'cocina casera']);

// Tipo de cocina: se elige siempre de la lista cargada en FoodieBox, deducido de los tipos de Google y del texto
// de Google, Instagram, el sitio y Woki (un nombre de la lista se marca si aparece en el texto).
function detectCuisines(place: GooglePlace, text: string, catalog: string[]) {
	const byKey = new Map(catalog.map((name) => [normalized(name).trim(), name]));
	const fromTypes = (place.types ?? []).flatMap((type) => {
		const candidates = googleCuisineNames[type] ?? [];
		const known = candidates.find((name) => byKey.has(normalized(name)));
		return catalog.length ? (known ? [byKey.get(normalized(known)) as string] : []) : candidates.slice(0, 1);
	});
	const seenStems = new Set<string>(fromTypes.map((name) => normalized(name).trim().replace(/s$/, '')));
	const fromText = catalog.filter((name) => {
		const key = normalized(name).trim();
		if (key.length < 4 || key.includes('/') || ambiguousCuisineNames.has(key)) return false;
		const stem = key.replace(/s$/, '');
		if (seenStems.has(stem)) return false;
		const matched = new RegExp(`(?:^|[^a-z0-9])${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?(?![a-z0-9])`).test(text);
		if (matched) seenStems.add(stem);
		return matched;
	});
	return unique([...fromTypes, ...fromText]).slice(0, 6);
}

function googleSearchUrl(...values: Array<string | undefined>) {
	const query = values.map((value) => value?.trim() ?? '').filter(Boolean).join(', ');
	if (!query) return '';
	const url = new URL('https://www.google.com/search');
	url.searchParams.set('q', query);
	return url.href;
}

function isPrivateAddress(address: string) {
	const value = address.toLowerCase().replace(/^::ffff:/, '');
	if (value === '::1' || /^(?:fc|fd|fe8|fe9|fea|feb)/.test(value)) return true;
	const parts = value.split('.').map(Number);
	if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
	return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254)
		|| (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

async function safePublicUrl(value: string) {
	const url = new URL(value);
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname === 'localhost' || url.hostname.endsWith('.local')) throw new Error('URL no permitida');
	if (isIP(url.hostname)) {
		if (isPrivateAddress(url.hostname)) throw new Error('URL no permitida');
	} else {
		const addresses = await lookup(url.hostname, { all: true });
		if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('URL no permitida');
	}
	return url;
}

function absolute(value: string | undefined, base: URL) {
	if (!value) return '';
	try { const result = new URL(value, base); return ['http:', 'https:'].includes(result.protocol) ? result.href : ''; }
	catch { return ''; }
}

async function readPublicPage(value: string): Promise<PublicPageData> {
	let url = await safePublicUrl(value);
	for (let redirect = 0; redirect < 4; redirect += 1) {
		const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8_000), headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' } });
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) break;
			url = await safePublicUrl(new URL(location, url).href); continue;
		}
		if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) break;
		const html = await response.text();
		if (html.length > 3_000_000) break;
		const $ = cheerio.load(html);
		const links = $('a[href]').map((_, element) => absolute($(element).attr('href'), url)).get();
		const images = [absolute($('meta[property="og:image"]').first().attr('content'), url), absolute($('meta[name="twitter:image"]').first().attr('content'), url)];
		$('script[type="application/ld+json"]').each((_, element) => {
			try {
				const value = JSON.parse($(element).text()) as Record<string, unknown>;
				const candidates = Array.isArray(value.image) ? value.image : [value.image];
				for (const image of candidates) if (typeof image === 'string') images.push(absolute(image, url));
			} catch { /* JSON-LD opcional. */ }
		});
		return {
			links: unique(links), images: unique(images),
			keywords: unique(($('meta[name="keywords"]').attr('content') ?? '').split(/[,;|]/)),
			description: ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim(),
			text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 150_000),
		};
	}
	return { links: [], images: [], description: '', keywords: [], text: '' };
}

// Decodifica texto de un JSON incrustado en la página (a veces con doble escape).
function decodeEscapedText(value: string) {
	let decoded = value;
	for (let level = 0; level < 3; level += 1) {
		try {
			const next = JSON.parse(`"${decoded}"`) as string;
			if (next === decoded) break;
			decoded = next;
		} catch { break; }
	}
	return decoded.trim();
}

// Enlaces de la bio de Instagram (el JSON de la página trae "bio_links": [{ url, title }]).
function instagramBioLinks(html: string) {
	const key = '"bio_links":[';
	const start = html.indexOf(key);
	if (start < 0) return [];
	const open = start + key.length - 1;
	let depth = 0;
	let inString = false;
	for (let index = open; index < Math.min(html.length, open + 20_000); index += 1) {
		const char = html[index];
		if (inString) {
			if (char === '\\') index += 1;
			else if (char === '"') inString = false;
		} else if (char === '"') inString = true;
		else if (char === '[') depth += 1;
		else if (char === ']') {
			depth -= 1;
			if (depth === 0) {
				try {
					return (JSON.parse(html.slice(open, index + 1)) as Array<{ url?: string }>)
						.map((item) => item.url ?? '').filter((link) => /^https?:\/\//i.test(link));
				} catch { return []; }
			}
		}
	}
	return [];
}

// Foto y bio del perfil de Instagram. La página del perfil trae la foto en 150×150; la del embed solo en 100×100.
// Instagram firma cada URL, así que no se puede pedir otro tamaño. La bio solo está en el JSON de la página (no en og:description).
async function instagramProfile(value: string) {
	let image = '';
	let biography = '';
	let externalLinks: string[] = [];
	try {
		const profileUrl = new URL(value);
		if (!/(?:^|\.)instagram\.com$/i.test(profileUrl.hostname)) return { image, biography, externalLinks };
		const username = profileUrl.pathname.split('/').filter(Boolean)[0] ?? '';
		if (!/^[a-z0-9._]+$/i.test(username)) return { image, biography, externalLinks };
		for (const path of [`/${encodeURIComponent(username)}/`, `/${encodeURIComponent(username)}/embed/`]) {
			if (image && biography) break;
			const pageUrl = await safePublicUrl(`https://www.instagram.com${path}`);
			const response = await fetch(pageUrl, {
				redirect: 'manual', signal: AbortSignal.timeout(10_000),
				headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' },
			});
			if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) continue;
			const html = await response.text();
			if (html.length > 3_000_000) continue;
			if (!image) {
				const match = html.match(/\\?"profile_pic_url\\?"\s*:\s*\\?"((?:\\\\.|\\[^"]|[^"\\])+)\\?"/);
				if (match) {
					try {
						let imageUrl = match[1];
						for (let level = 0; level < 3 && !/^https?:\/\//i.test(imageUrl); level += 1) imageUrl = JSON.parse(`"${imageUrl}"`) as string;
						image = (await safePublicUrl(imageUrl)).href;
					} catch { /* Sin foto utilizable en esta página. */ }
				}
			}
			if (!externalLinks.length) externalLinks = instagramBioLinks(html);
			if (!biography) {
				const match = html.match(/\\?"biography\\?"\s*:\s*\\?"((?:\\\\.|\\[^"]|[^"\\])*)\\?"/);
				if (match) biography = decodeEscapedText(match[1]);
			}
		}
	} catch { /* Se devuelve lo que se haya podido leer. */ }
	return { image, biography, externalLinks };
}

async function pageDataOrEmpty(url: string): Promise<PublicPageData> {
	if (!url) return { links: [], images: [], description: '', keywords: [], text: '' };
	try {
		const [page, profile] = await Promise.all([readPublicPage(url), instagramProfile(url)]);
		// En un perfil de Instagram los únicos enlaces útiles son los de la bio (el resto es la navegación de la red).
		const isInstagram = /(?:^|\.)instagram\.com$/i.test(new URL(url).hostname);
		return {
			...page,
			links: isInstagram ? unique(profile.externalLinks) : page.links,
			images: unique([profile.image, ...page.images]),
			description: [profile.biography, page.description].filter(Boolean).join(' '),
		};
	} catch { return { links: [], images: [], description: '', keywords: [], text: '' }; }
}
const socialLink = (links: string[], pattern: RegExp) => links.find((link) => pattern.test(link)) ?? '';

async function addRequestedSocialImages(result: RestaurantSearchResult, requested: RequestedImageSources, imagesOnly = false) {
	const requestedInstagramUrl = socialLink([requested.instagramUrl ?? ''], /(?:^|\.)instagram\.com\//i);
	const instagramUrl = requestedInstagramUrl || socialLink([result.instagramUrl ?? ''], /(?:^|\.)instagram\.com\//i);
	const facebookUrl = socialLink([requested.facebookUrl ?? '', result.facebookUrl ?? ''], /(?:^|\.)facebook\.com\//i);
	const [instagramPage, facebookPage] = await Promise.all([pageDataOrEmpty(instagramUrl), pageDataOrEmpty(facebookUrl)]);
	const instagramLogoUrl = instagramPage.images[0] || (!requestedInstagramUrl && instagramUrl ? result.logoUrl : '') || '';
	if (imagesOnly) {
		const wokiImageUrls = Array.isArray(result.wokiImageUrls) ? result.wokiImageUrls : [];
		const googleImageUrls = Array.isArray(result.googleImageUrls) ? result.googleImageUrls : [];
		const publicImageUrls = Array.isArray(result.publicImageUrls) ? result.publicImageUrls : [];
		const imageUrls = unique([
			...wokiImageUrls.slice(0, 3),
			...googleImageUrls.slice(0, 3),
			...facebookPage.images.slice(0, 3),
			...instagramPage.images.slice(1, 4),
			...publicImageUrls,
		]).slice(0, 12);
		const sources = [
			...(wokiImageUrls.length ? ['Woki'] : []),
			...(googleImageUrls.length ? ['Google'] : []),
			...(facebookPage.images.length ? ['Facebook'] : []),
			...(instagramLogoUrl || instagramPage.images.length > 1 ? ['Instagram'] : []),
			...(publicImageUrls.length ? ['Fuentes públicas'] : []),
		];
		return { ...result, instagramUrl, facebookUrl, logoUrl: instagramLogoUrl, imageUrls, sources };
	}
	const existingImages = (Array.isArray(result.imageUrls) ? result.imageUrls : []).filter((imageUrl) => imageUrl !== instagramLogoUrl);
	const imageUrls = unique([
		...existingImages.slice(0, 6),
		...instagramPage.images.slice(1, 4),
		...facebookPage.images.slice(0, 3),
		...existingImages.slice(6),
	]).slice(0, 12);
	const sources = unique([
		...(Array.isArray(result.sources) ? result.sources : []),
		...(instagramUrl ? ['Instagram'] : []),
		...(facebookUrl ? ['Facebook'] : []),
	]);
	return { ...result, instagramUrl, facebookUrl, logoUrl: instagramLogoUrl, imageUrls, sources };
}

type WokiPlace = {
	displayName?: string; slug?: string; address?: string; info?: string; subtitle?: string; category?: string; tags?: string[];
	price?: string; bannerImageUrl?: string; squareImageUrl?: string;
	zones?: { country?: { name?: string }; state?: { name?: string }; city?: { name?: string } };
};

type PublicSearchResult = { url: string; title: string; snippet: string };
type OpenMapPlace = {
	geometry?: { coordinates?: [number, number] };
	properties?: {
		name?: string; street?: string; housenumber?: string; district?: string; city?: string; county?: string;
		state?: string; country?: string; postcode?: string; osm_value?: string;
	};
};

const locationSlug = (value: string) => normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function wokiCandidates(country: string, state: string, city: string) {
	const params = new URLSearchParams({
		date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), quantity: '4', country, state, city,
		orderBy: 'rating', openNow: 'false', hasDiscount: 'false', isNew: 'false', isRecommended: 'false',
		lastTablesAvailable: 'false', withWokiScore: 'false', locale: 'es', page: '1', limit: '100',
	});
	const response = await fetch(`https://api.wokiapp.com/geta/v1/search/home?${params}`, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json', 'user-agent': 'RestoBoxImporter/2.0' } });
	if (!response.ok) return [];
	const groups = await response.json() as Array<{ items?: WokiPlace[] }>;
	const candidates = new Map<string, WokiPlace>();
	groups.flatMap((group) => group.items ?? []).forEach((item) => { if (item.slug && !candidates.has(item.slug)) candidates.set(item.slug, item); });
	return [...candidates.values()];
}

function matchingWokiPlace(candidates: WokiPlace[], requestedName: string) {
	const target = normalized(requestedName.split(',')[0]).replace(/\brestaurante\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
	return candidates.find((item) => {
		const candidate = normalized(item.displayName || item.slug || '').replace(/[^a-z0-9]+/g, ' ').trim();
		return candidate === target || (candidate.length >= 5 && target.length >= 5 && (candidate.includes(target) || target.includes(candidate)));
	}) ?? null;
}

async function findWokiPlace(place: GooglePlace, requestedName: string): Promise<WokiPlace | null> {
	const countryName = normalized(component(place, 'country'));
	const country = countryName.includes('argentina') ? 'ar' : countryName.includes('uruguay') ? 'uy' : countryName.includes('chile') ? 'cl' : '';
	const state = locationSlug(component(place, 'administrative_area_level_1'));
	const city = locationSlug(component(place, 'locality', 'administrative_area_level_2'));
	if (!country || !state) return null;
	try { return matchingWokiPlace(await wokiCandidates(country, state, city), place.displayName?.text || requestedName); }
	catch { return null; }
}

async function findWokiPlaceWithoutGoogle(requestedName: string) {
	const query = normalized(requestedName);
	const locations = query.includes('mar del plata')
		? [['ar', 'buenos-aires', 'mar-del-plata']]
		: query.includes('cordoba') ? [['ar', 'cordoba', 'cordoba']]
			: query.includes('mendoza') ? [['ar', 'mendoza', 'mendoza']]
				: query.includes('rosario') ? [['ar', 'santa-fe', 'rosario']]
					: query.includes('caba') || query.includes('capital federal') || query.includes('ciudad de buenos aires')
						? [['ar', 'ciudad-de-buenos-aires', '']]
						: [['ar', 'buenos-aires', 'mar-del-plata'], ['ar', 'ciudad-de-buenos-aires', ''], ['ar', 'buenos-aires', '']];
	for (const [country, state, city] of locations) {
		try {
			const match = matchingWokiPlace(await wokiCandidates(country, state, city), requestedName);
			if (match) return match;
		} catch { /* Se prueba la siguiente ubicación. */ }
	}
	return null;
}

function detectedPublicValues(text: string) {
	const value = normalized(text);
	const establishments = Object.entries({ Restaurante: /\brestaurante\b/, Café: /\bcafe\b|coffee shop/, Bar: /\bbar\b/, Pub: /\bpub\b/, Panadería: /\bpanaderia\b|bakery/, Heladería: /\bheladeria\b|ice cream/, Cervecería: /\bcerveceria\b|brewery/ }).filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
	const cuisines = Object.entries({ Pastas: /\bpastas?\b/, Parrilla: /\bparrilla\b|steak/, Pizzas: /\bpizzas?\b/, Sushi: /\bsushi\b/, Mariscos: /\bmariscos?\b|seafood/, Argentina: /\bargentin[ao]\b/, Italiana: /\bitalian[ao]\b/, Japonesa: /\bjapones[ao]\b/, Peruana: /\bperuan[ao]\b/, Mexicana: /\bmexican[ao]\b/, Mediterránea: /\bmediterrane[ao]\b/, Vegana: /\bvegan[ao]\b/, Vegetariana: /\bvegetarian[ao]\b/ }).filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
	const meals = Object.entries({ Desayuno: /\bdesayuno\b|breakfast/, Brunch: /\bbrunch\b/, Almuerzo: /\balmuerzo\b|lunch/, Merienda: /\bmerienda\b/, Cena: /\bcena\b|dinner/, Drunch: /\bdrunch\b/, 'After dinner': /after dinner/, Poscena: /\bposcena\b/ }).filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
	return { establishments, cuisines, meals };
}

async function wokiFallback(requestedName: string) {
	const place = await findWokiPlaceWithoutGoogle(requestedName);
	if (!place?.slug) return null;
	const wokiUrl = `https://www.wokiapp.com/restaurante/${encodeURIComponent(place.slug)}`;
	const page = await pageDataOrEmpty(wokiUrl);
	const instagramUrl = socialLink(page.links, /(?:^|\.)instagram\.com\//i);
	const facebookUrl = socialLink(page.links, /(?:^|\.)facebook\.com\//i);
	const tiktokUrl = socialLink(page.links, /(?:^|\.)tiktok\.com\//i);
	const [instagramPage, facebookPage] = await Promise.all([pageDataOrEmpty(instagramUrl), pageDataOrEmpty(facebookUrl)]);
	const detected = detectedPublicValues([
		place.category, place.info, place.subtitle, ...(place.tags ?? []),
		page.description, ...page.keywords,
		instagramPage.description, ...instagramPage.keywords,
	].filter(Boolean).join(' '));
	const allLinks = unique([...page.links, ...instagramPage.links, ...facebookPage.links]);
	const whatsappUrl = socialLink(allLinks, /(?:wa\.me|whatsapp\.com)/i);
	let mobile = '';
	if (whatsappUrl) { const parsed = new URL(whatsappUrl); mobile = parsed.hostname.includes('wa.me') ? parsed.pathname.replace(/\D/g, '') : (parsed.searchParams.get('phone') ?? '').replace(/\D/g, ''); }
	return {
		name: place.displayName || requestedName.split(',')[0].trim(), description: place.info || page.description || '', notes: '',
		establishmentTypes: detected.establishments, cuisines: detected.cuisines, mealTypes: detected.meals,
		tags: unique([...(place.tags ?? []), ...page.keywords, ...instagramPage.keywords, ...facebookPage.keywords]).slice(0, 20).join(', '),
		price: /^\${1,4}$/.test(place.price || '') ? place.price : '', averagePrice: '', rating: '', score: '',
		country: place.zones?.country?.name || 'Argentina', province: place.zones?.state?.name || '', city: place.zones?.city?.name || '',
		neighborhood: '', address: place.address || '', phone: '', mobile, website: '',
		googleUrl: googleSearchUrl(place.displayName || requestedName, place.address, place.zones?.city?.name, place.zones?.state?.name), mapUrl: '', hours: '',
		instagramUrl, facebookUrl, tiktokUrl, wokiUrl,
		tripAdvisorUrl: socialLink(allLinks, /(?:^|\.)tripadvisor\./i), linktreeUrl: socialLink(allLinks, /(?:^|\.)linktr\.ee\//i),
		menuUrl: allLinks.find((link) => /(?:menu|carta)/i.test(link)) ?? '',
		delivery: false, takeAway: false,
		logoUrl: instagramPage.images[0] || place.squareImageUrl || '',
		imageUrls: unique([place.bannerImageUrl || '', place.squareImageUrl || '', ...page.images, ...instagramPage.images, ...facebookPage.images]).slice(0, 12),
		wokiImageUrls: unique([place.bannerImageUrl || '', place.squareImageUrl || '', ...page.images]),
		sources: ['Woki', ...(instagramUrl ? ['Instagram'] : []), ...(facebookUrl ? ['Facebook'] : [])],
	};
}

function requestedPlaceName(requestedName: string) {
	return requestedName.split(',')[0].trim();
}

function defaultedPublicQuery(requestedName: string) {
	const value = normalized(requestedName);
	const hasLocation = requestedName.includes(',') || /\b(?:mar del plata|caba|capital federal|buenos aires|cordoba|mendoza|rosario|argentina|uruguay|chile)\b/.test(value);
	return `${requestedName} restaurante${hasLocation ? '' : ' Mar del Plata'}`;
}

function unwrapSearchUrl(value: string, base: URL) {
	try {
		const url = new URL(value, base);
		const redirected = url.searchParams.get('uddg');
		const result = redirected ? new URL(redirected) : url;
		if (!['http:', 'https:'].includes(result.protocol) || /(?:^|\.)duckduckgo\.com$/i.test(result.hostname)) return '';
		return result.href;
	} catch { return ''; }
}

async function publicSearch(requestedName: string): Promise<PublicSearchResult[]> {
	const searchUrl = new URL('https://html.duckduckgo.com/html/');
	searchUrl.searchParams.set('q', defaultedPublicQuery(requestedName));
	try {
		const response = await fetch(searchUrl, {
			signal: AbortSignal.timeout(10_000),
			headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' },
		});
		if (!response.ok) return [];
		const $ = cheerio.load(await response.text());
		const targetWords = normalized(requestedPlaceName(requestedName)).split(/[^a-z0-9]+/).filter((word) => word.length >= 3 && !['del', 'las', 'los'].includes(word));
		return $('.result').map((_, element) => {
			const link = $(element).find('.result__a').first();
			return {
				url: unwrapSearchUrl(link.attr('href') ?? '', searchUrl),
				title: link.text().replace(/\s+/g, ' ').trim(),
				snippet: $(element).find('.result__snippet').first().text().replace(/\s+/g, ' ').trim(),
			};
		}).get().filter((result) => {
			if (!result.url || !result.title) return false;
			const searchable = normalized(`${result.title} ${result.snippet} ${result.url}`);
			return targetWords.length > 0 && targetWords.every((word) => searchable.includes(word));
		}).slice(0, 8);
	} catch { return []; }
}

async function openMapSearch(requestedName: string): Promise<OpenMapPlace | null> {
	const url = new URL('https://photon.komoot.io/api/');
	url.searchParams.set('q', defaultedPublicQuery(requestedName).replace(/\s+restaurante\b/i, ''));
	url.searchParams.set('limit', '5');
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { accept: 'application/json', 'user-agent': 'RestoBoxImporter/2.0' } });
		if (!response.ok) return null;
		const data = await response.json() as { features?: OpenMapPlace[] };
		const target = normalized(requestedPlaceName(requestedName)).replace(/[^a-z0-9]+/g, ' ').trim();
		return (data.features ?? []).find((feature) => {
			const candidate = normalized(feature.properties?.name ?? '').replace(/[^a-z0-9]+/g, ' ').trim();
			return candidate === target || (candidate.length >= 5 && target.length >= 5 && (candidate.includes(target) || target.includes(candidate)));
		}) ?? null;
	} catch { return null; }
}

function addressFromPublicText(text: string) {
	const prepared = text.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');
	const patterns = [
		/\b((?:avenida|av\.?|calle|almirante|almte\.?|boulevard|blvd\.?|diagonal)\s+[\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3}\s+\d{3,5})\b/giu,
		/\b((?:\p{Lu}[\p{L}.'-]*\s+){0,2}\p{Lu}[\p{L}.'-]*\s+\d{3,5})\b/gu,
	];
	for (const pattern of patterns) {
		for (const match of prepared.matchAll(pattern)) {
			const number = Number(match[1].match(/\d{2,5}\s*$/)?.[0]);
			if (number >= 1900 && number <= 2099) continue;
			return match[1].replace(/\s+/g, ' ').trim();
		}
	}
	return '';
}

async function publicWebFallback(requestedName: string) {
	const openMapPlace = await openMapSearch(requestedName);
	const results = await publicSearch(openMapPlace?.properties?.name || requestedName);
	if (!results.length && !openMapPlace) return null;
	const resultUrls = unique(results.map((result) => result.url));
	const pages = await Promise.all(resultUrls.slice(0, 6).map(pageDataOrEmpty));
	const allLinks = unique([...resultUrls, ...pages.flatMap((page) => page.links)]);
	const instagramUrl = socialLink(allLinks, /(?:^|\.)instagram\.com\//i);
	const facebookUrl = socialLink(allLinks, /(?:^|\.)facebook\.com\//i);
	const tiktokUrl = socialLink(allLinks, /(?:^|\.)tiktok\.com\//i);
	const tripAdvisorUrl = socialLink(allLinks, /(?:^|\.)tripadvisor\./i);
	const linktreeUrl = socialLink(allLinks, /(?:^|\.)(?:linktr\.ee|linktree\.com)\//i);
	const googleUrl = socialLink(allLinks, /(?:^|\.)google\.[^/]+\/maps|maps\.app\.goo\.gl/i);
	const excludedWebsite = /(?:instagram|facebook|tiktok|tripadvisor|linktr\.ee|linktree|restaurantguru|wanderlog|corner\.inc|bazartravels|duckduckgo|openstreetmap|timeout|cocina\.com|trnmagazine)\./i;
	const websiteWords = normalized(requestedPlaceName(requestedName)).split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !['cantina', 'restaurante'].includes(word));
	const website = allLinks.find((link) => {
		try {
			const hostname = normalized(new URL(link).hostname);
			return !excludedWebsite.test(hostname) && !/(?:menu|carta|reserv)/i.test(link) && websiteWords.some((word) => hostname.includes(word));
		}
		catch { return false; }
	}) ?? '';
	const wokiUrl = socialLink(allLinks, /(?:^|\.)wokiapp\.com\//i);
	const [instagramPage, facebookPage, officialPage, wokiPage] = await Promise.all([
		pageDataOrEmpty(instagramUrl), pageDataOrEmpty(facebookUrl), pageDataOrEmpty(website), pageDataOrEmpty(wokiUrl),
	]);
	const sourceText = [
		...results.flatMap((result) => [result.title, result.snippet]),
		...pages.flatMap((page) => [page.description, page.text, ...page.keywords]),
		instagramPage.description, facebookPage.description,
	].filter(Boolean).join(' ');
	const trustedClassificationText = [
		officialPage.description, ...officialPage.keywords,
		instagramPage.description, ...instagramPage.keywords,
		wokiPage.description, ...wokiPage.keywords,
	].filter(Boolean).join(' ');
	const detected = detectedPublicValues(trustedClassificationText);
	const properties = openMapPlace?.properties;
	const mapAddress = [properties?.street, properties?.housenumber].filter(Boolean).join(' ');
	const publicAddress = addressFromPublicText(sourceText);
	const address = properties?.housenumber ? mapAddress : publicAddress || mapAddress;
	const coordinates = openMapPlace?.geometry?.coordinates;
	const openMapUrl = coordinates?.length === 2 ? `https://www.openstreetmap.org/?mlat=${coordinates[1]}&mlon=${coordinates[0]}#map=18/${coordinates[1]}/${coordinates[0]}` : '';
	const descriptions = unique([...pages.map((page) => page.description), ...results.map((result) => result.snippet)]).filter((value) => value.length >= 30);
	const pageImages = unique([...instagramPage.images, ...pages.flatMap((page) => page.images), ...facebookPage.images]);
	const inferredMarDelPlata = normalized(sourceText).includes('mar del plata') || normalized(requestedName).includes('mar del plata');
	return {
		name: properties?.name || requestedPlaceName(requestedName).replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es')),
		description: descriptions[0] || '', notes: '',
		establishmentTypes: detected.establishments,
		cuisines: detected.cuisines, mealTypes: detected.meals,
		tags: unique([...pages.flatMap((page) => page.keywords), ...instagramPage.keywords, ...facebookPage.keywords]).slice(0, 20).join(', '),
		price: '', averagePrice: '', rating: '', score: '',
		country: properties?.country || (inferredMarDelPlata ? 'Argentina' : ''),
		province: properties?.state || (inferredMarDelPlata ? 'Buenos Aires' : ''),
		city: properties?.city || (inferredMarDelPlata ? 'Mar del Plata' : ''), neighborhood: properties?.district || '', address,
		phone: '', mobile: '', website,
		googleUrl: googleSearchUrl(properties?.name || requestedPlaceName(requestedName), address, properties?.city || (inferredMarDelPlata ? 'Mar del Plata' : ''), properties?.state),
		mapUrl: googleUrl || openMapUrl, hours: '',
		instagramUrl, facebookUrl, tiktokUrl, wokiUrl, tripAdvisorUrl, linktreeUrl,
		menuUrl: allLinks.find((link) => /(?:menu|carta)/i.test(link)) ?? '',
		delivery: false, takeAway: false,
		logoUrl: instagramPage.images[0] || '', imageUrls: pageImages.slice(0, 12),
		publicImageUrls: pageImages.filter((imageUrl) => imageUrl !== instagramPage.images[0]),
		sources: ['Fuentes públicas', ...(openMapPlace ? ['OpenStreetMap'] : []), ...(instagramUrl ? ['Instagram'] : []), ...(facebookUrl ? ['Facebook'] : [])],
	};
}

async function fallbackWithoutGoogle(requestedName: string) {
	return await wokiFallback(requestedName) || await publicWebFallback(requestedName);
}

// Precio por persona como rango, con el mismo formato que ya se carga a mano: "$30,000-$40,000" o "+$60,000".
function averagePrice(place: GooglePlace) {
	const amount = (money?: GoogleMoney) => money ? Math.round(Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1e9) : 0;
	const start = amount(place.priceRange?.startPrice);
	const end = amount(place.priceRange?.endPrice);
	if (!start && !end) return '';
	const currency = place.priceRange?.startPrice?.currencyCode || place.priceRange?.endPrice?.currencyCode || 'ARS';
	const money = (value: number) => `${currency === 'ARS' ? '$' : `${currency} `}${value.toLocaleString('en-US')}`;
	if (start && end) return `${money(start)}-${money(end)}`;
	return start ? `+${money(start)}` : `Hasta ${money(end)}`;
}

// Horarios escritos en la bio de Instagram: se devuelven las líneas que nombran un día y traen una hora o "cerrado",
// para que el cliente las cargue con el mismo analizador del botón "Pegar horarios".
// Cada línea se normaliza a "Lunes a viernes: 8:00 – 20:00" (o "Domingo: Cerrado"), que es lo que ese analizador entiende.
function hoursFromBio(bio: string) {
	const dayWord = /\b(?:lun(?:es)?|mar(?:tes)?|mi[eé](?:rcoles)?|jue(?:ves)?|vie(?:rnes)?|s[aá]b(?:ado)?s?|dom(?:ingo)?s?)\b\.?/i;
	const timeRange = /(\d{1,2})(?::(\d{2}))?\s*(?:hs?\b\.?)?\s*(?:a|al|-|–|—)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hs?\b\.?|horas?\b)?/gi;
	const time = (hour: string, minutes?: string) => `${Number(hour)}:${minutes ?? '00'}`;
	return bio.split(/\n|•|\|/)
		.map((line) => line.trim())
		.flatMap((line) => {
			if (!dayWord.test(line)) return [];
			const ranges = [...line.matchAll(timeRange)].filter((match) => Number(match[1]) <= 24 && Number(match[3]) <= 24);
			const closed = /cerrado/i.test(line);
			if (!ranges.length && !closed) return [];
			const dayText = line.slice(0, ranges.length ? ranges[0].index : line.search(/cerrado/i))
				.replace(/\b(?:de|desde|el|los|las|todos)\s*$/i, '').replace(/[\s:,\-–—]+$/, '').replace(/\b(s[aá]bado|domingo)s\b/gi, '$1').trim();
			if (!dayWord.test(dayText)) return [];
			const hours = ranges.length ? ranges.map((match) => `${time(match[1], match[2])} – ${time(match[3], match[4])}`).join(', ') : 'Cerrado';
			return [`${dayText}: ${hours}`];
		})
		.join('\n');
}

// Texto del resumen de Google como puntos ("• …"): un punto por línea o, si viene en un párrafo, por oración.
function bulletLines(text: string) {
	const lines = text.split(/\n+/).map((line) => line.replace(/^[\s•*-]+/, '').trim()).filter(Boolean);
	const items = lines.length > 1 ? lines : (lines[0] ?? '').split(/(?<=[.!?])\s+/).filter(Boolean);
	return items.map((item) => `• ${item}`).join('\n');
}

// Delivery, take away, sin gluten y saludable: se deducen de la descripción (bio) de Instagram.
function detectInstagramFlags(text: string) {
	const matches = (pattern: RegExp) => pattern.test(text);
	return {
		delivery: matches(/\bdelivery\b|\benvios?\b|a domicilio|pedidos ?ya|\brappi\b/),
		takeAway: matches(/take ?away|para llevar|retiro en (?:el )?(?:local|sucursal)|retiros? por/),
		glutenFree: matches(/sin gluten|gluten ?free|sin tacc|celiac|libre de gluten/),
		daytimeKitchen: matches(/daytime ?kitchen/),
		freeBreakfast: matches(/(?:desayunos?|meriendas?) (?:y (?:desayunos?|meriendas?) )?libres?|libre de (?:desayuno|merienda)/),
		healthy: matches(/saludable|healthy|comida sana|\bfit\b|organic|plant based|nutritiv|bienestar|detox/),
	};
}

// ---- Enlaces del lugar (solapa Links) ----
type LinkKind = 'instagram' | 'facebook' | 'tiktok' | 'linktree' | 'tripAdvisor' | 'woki' | 'pedidosYa' | 'whatsapp';
const linkPatterns: Record<LinkKind, RegExp> = {
	instagram: /^https?:\/\/(?:www\.)?instagram\.com\/(?!(?:p|reel|reels|tv|explore|accounts|stories|direct|about|legal|developer)(?:\/|$))[\w.]+\/?(?:[?#].*)?$/i,
	facebook: /^https?:\/\/(?:www\.|m\.|es-la\.)?facebook\.com\/(?!(?:sharer|share|dialog|plugins|tr|login|policies|help|privacy|legal)(?:\/|\.php|\?|$))[^/?#]+/i,
	tiktok: /^https?:\/\/(?:www\.|vm\.)?tiktok\.com\/@[\w.]+/i,
	linktree: /^https?:\/\/(?:www\.)?linktr\.ee\/[\w.]+/i,
	tripAdvisor: /^https?:\/\/(?:[\w-]+\.)?tripadvisor\.[a-z.]+\/[^\s]*_Review-[^\s]*/i,
	woki: /^https?:\/\/(?:www\.)?wokiapp\.com\/restaurante\/[^\s]+/i,
	pedidosYa: /^https?:\/\/(?:www\.)?pedidosya\.com(?:\.[a-z]{2})?\/restaurantes?\/[^\s]+/i,
	whatsapp: /^https?:\/\/(?:wa\.me\/|api\.whatsapp\.com\/send|(?:www\.)?whatsapp\.com\/send)[^\s]*/i,
};
const menuLinkPattern = /men[uú]|carta\b/i;

function pickLink(kind: LinkKind, ...sources: string[][]) {
	for (const links of sources) {
		const found = links.find((link) => linkPatterns[kind].test(link));
		if (found) return found;
	}
	return '';
}

function normalizeInstagramUrl(link: string) {
	const username = link.match(/instagram\.com\/([\w.]+)/i)?.[1];
	return username ? `https://www.instagram.com/${username}/` : '';
}

// Un enlace que no es de ninguna red ni servicio conocido ni un formulario: se puede usar como sitio web.
function isPlainWebsite(link: string) {
	return /^https?:\/\//i.test(link) && !Object.values(linkPatterns).some((pattern) => pattern.test(link))
		&& !/(?:^|\.)(?:instagram|facebook|tiktok|youtube|google|forms\.gle|bit\.ly|goo\.gl|maps\.app\.goo\.gl|wa\.me)(?:\.|\/|$)/i.test(new URL(link).hostname + '/');
}

// Enlaces (con su título) de una página de Linktree, leídos del JSON que la propia página incluye.
async function linktreeLinks(value: string): Promise<Array<{ title: string; url: string }>> {
	try {
		const url = await safePublicUrl(value);
		if (!/(?:^|\.)linktr\.ee$/i.test(url.hostname)) return [];
		const response = await fetch(url, {
			redirect: 'manual', signal: AbortSignal.timeout(8_000),
			headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' },
		});
		if (!response.ok) return [];
		const html = await response.text();
		if (html.length > 3_000_000) return [];
		const raw = cheerio.load(html)('script#__NEXT_DATA__').text();
		type Item = { title?: string; url?: string; type?: string };
		const pageProps = (JSON.parse(raw) as { props?: { pageProps?: { links?: Item[]; pinnedLinks?: Item[]; socialLinks?: Item[] } } }).props?.pageProps;
		return [...(pageProps?.pinnedLinks ?? []), ...(pageProps?.links ?? []), ...(pageProps?.socialLinks ?? [])]
			.filter((item): item is Item & { url: string } => typeof item.url === 'string' && /^https?:\/\//i.test(item.url))
			.map((item) => ({ title: item.title ?? item.type ?? '', url: item.url }));
	} catch { return []; }
}

// WhatsApp argentino con el formato "+54 9 2236 98-4767": prefijo de país, 9 de celular y 10 dígitos agrupados 4-2-4.
function formatWhatsapp(value: string) {
	let digits = value.replace(/\D/g, '').replace(/^00/, '');
	if (digits.startsWith('54')) digits = digits.slice(2);
	if (digits.startsWith('9') && digits.length === 11) digits = digits.slice(1);
	digits = digits.replace(/^0/, '');
	if (digits.length === 12) {
		// Formato local con el 15 del celular: 0223 15 698 4767
		for (const areaLength of [2, 3, 4]) {
			if (digits.slice(areaLength, areaLength + 2) === '15') { digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2); break; }
		}
	}
	return digits.length === 10 ? `+54 9 ${digits.slice(0, 4)} ${digits.slice(4, 6)}-${digits.slice(6)}` : '';
}

function whatsappFromLink(link: string) {
	try {
		const url = new URL(link);
		return formatWhatsapp(url.hostname.includes('wa.me') ? url.pathname : (url.searchParams.get('phone') ?? ''));
	} catch { return ''; }
}

// Número en la bio de Instagram: solo si viene precedido de una palabra que lo identifica como contacto.
function phoneFromBio(bio: string) {
	const match = bio.match(/(?:whats?app|wsp|wpp|\bwa\b|📱|📲|📞|☎|reservas|pedidos|turnos)[^\d+]{0,25}(\+?\d[\d\s().-]{7,17}\d)/i);
	return match ? formatWhatsapp(match[1]) : '';
}

// Celular de Google (+54 9 …) como WhatsApp.
function mobileFromGooglePhone(phone?: string) {
	const value = phone?.trim() ?? '';
	return /^\+54[\s-]*9/.test(value) ? formatWhatsapp(value) : '';
}

// Búsqueda del lugar en Google Maps (con el identificador del lugar para que abra la ficha exacta).
function googleMapsSearchUrl(place: GooglePlace, name: string) {
	const url = new URL('https://www.google.com/maps/search/');
	url.searchParams.set('api', '1');
	url.searchParams.set('query', [place.displayName?.text || name, place.formattedAddress].filter(Boolean).join(', '));
	if (place.id) url.searchParams.set('query_place_id', place.id);
	return url.href;
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json() as { name?: string; instagramUrl?: string; facebookUrl?: string; mode?: string };
		const name = body.name?.trim() ?? '';
		if (name.length < 2) return json({ error: 'Ingresá el nombre del lugar que querés buscar' }, 400);
		if (body.mode === 'logo') {
			const logoResult = await addRequestedSocialImages({ name, imageUrls: [], sources: [] }, body, true);
			return logoResult.logoUrl
				? json(logoResult)
				: json({ error: 'No se pudo obtener la foto de perfil de Instagram' }, 404);
		}
		const enrichResult = (result: RestaurantSearchResult) => addRequestedSocialImages(result, body, body.mode === 'images');
		const publicFallback = async () => {
			const fallback = await fallbackWithoutGoogle(name);
			const enriched = await enrichResult(fallback ?? { name, imageUrls: [], sources: [] });
			return fallback || enriched.imageUrls.length ? enriched : null;
		};
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			const fallback = await publicFallback();
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes públicas disponibles` }, 404);
		}

		const fieldMask = [
			'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'nationalPhoneNumber', 'internationalPhoneNumber',
			'websiteUri', 'googleMapsUri', 'googleMapsLinks', 'regularOpeningHours', 'rating', 'priceLevel', 'priceRange',
			'types', 'primaryType', 'editorialSummary', 'generativeSummary', 'reviewSummary', 'photos', 'delivery', 'takeout',
			'servesBreakfast', 'servesBrunch', 'servesLunch', 'servesDinner', 'servesBeer', 'servesWine',
			'servesCocktails', 'servesDessert', 'servesCoffee', 'servesVegetarianFood', 'outdoorSeating', 'liveMusic',
			'goodForChildren', 'allowsDogs', 'goodForGroups', 'goodForWatchingSports',
		].map((field) => `places.${field}`).join(',');
		let response: Response;
		try {
			response = await fetch('https://places.googleapis.com/v1/places:searchText', {
				method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
				body: JSON.stringify({ textQuery: name, languageCode: 'es', regionCode: 'AR', pageSize: 1 }),
			});
		} catch {
			const fallback = await publicFallback();
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes disponibles` }, 404);
		}
		const result = await response.json() as { places?: GooglePlace[]; error?: { message?: string } };
		if (!response.ok) {
			const fallback = await publicFallback();
			return fallback ? json(fallback) : json({ error: result.error?.message ?? 'No se pudo completar la búsqueda' }, response.status);
		}
		const place = result.places?.[0];
		if (!place) {
			const fallback = await publicFallback();
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes disponibles` }, 404);
		}

		const websiteUri = place.websiteUri?.trim() ?? '';
		// Muchos lugares cargan su Instagram, Facebook o Linktree como sitio web en Google.
		const websiteIsSocial = (['instagram', 'facebook', 'tiktok', 'linktree'] as LinkKind[]).some((kind) => linkPatterns[kind].test(websiteUri));
		const officialPage = websiteIsSocial ? await pageDataOrEmpty('') : await pageDataOrEmpty(websiteUri);
		const siteLinks = unique([...(websiteIsSocial ? [websiteUri] : []), ...officialPage.links]);
		const wokiMatch = await findWokiPlace(place, name);
		const wokiUrl = pickLink('woki', siteLinks) || (wokiMatch?.slug ? `https://www.wokiapp.com/restaurante/${encodeURIComponent(wokiMatch.slug)}` : '');
		let facebookUrl = pickLink('facebook', siteLinks);
		const [wokiPage, firstFacebookPage] = await Promise.all([pageDataOrEmpty(wokiUrl), pageDataOrEmpty(facebookUrl)]);
		// Si el sitio no enlaza el Instagram o el Facebook, se busca en Woki y en el propio Facebook.
		const instagramUrl = normalizeInstagramUrl(pickLink('instagram', siteLinks, firstFacebookPage.links, wokiPage.links));
		if (!facebookUrl) facebookUrl = pickLink('facebook', wokiPage.links);
		const [instagramPage, facebookPage] = await Promise.all([
			pageDataOrEmpty(instagramUrl),
			facebookUrl && facebookUrl !== pickLink('facebook', siteLinks) ? pageDataOrEmpty(facebookUrl) : Promise.resolve(firstFacebookPage),
		]);
		// Instagram: enlaces de la bio y direcciones escritas en la descripción (Linktree, WhatsApp).
		const bioUrls = (instagramPage.description.match(/(?:https?:\/\/)?(?:www\.)?(?:linktr\.ee|wa\.me)\/[\w./?=&%+-]+/gi) ?? [])
			.map((link) => (/^https?:/i.test(link) ? link : `https://${link}`));
		const instagramLinks = unique([...instagramPage.links, ...bioUrls]);
		const linktreeUrl = pickLink('linktree', instagramLinks, siteLinks, facebookPage.links);
		const linktree = linktreeUrl ? await linktreeLinks(linktreeUrl) : [];
		const linktreeUrls = linktree.map((item) => item.url);
		const allLinks = unique([...siteLinks, ...instagramLinks, ...facebookPage.links, ...wokiPage.links, ...linktreeUrls]);
		const tiktokUrl = pickLink('tiktok', siteLinks, instagramLinks, linktreeUrls, facebookPage.links);
		const tripAdvisorUrl = pickLink('tripAdvisor', allLinks);
		const pedidosYaUrl = pickLink('pedidosYa', allLinks);
		const menuUrl = linktree.find((item) => menuLinkPattern.test(item.title))?.url
			|| [...linktreeUrls, ...siteLinks, ...instagramLinks].find((link) => /\/(?:menu|carta)|menu\.|carta\./i.test(link) && !linkPatterns.instagram.test(link))
			|| '';
		const website = websiteUri && !websiteIsSocial ? websiteUri : (instagramLinks.find(isPlainWebsite) ?? '');
		const whatsappLink = pickLink('whatsapp', allLinks);
		const whatsapp = whatsappFromLink(whatsappLink) || phoneFromBio(instagramPage.description) || mobileFromGooglePhone(place.internationalPhoneNumber);

		const street = component(place, 'route');
		const streetNumber = component(place, 'street_number');
		const address = [street, streetNumber].filter(Boolean).join(' ') || place.formattedAddress?.trim() || '';
		const neighborhood = component(place, 'neighborhood', 'sublocality_level_1', 'sublocality') || await zoneFromCoordinates(place.location?.latitude, place.location?.longitude);
		const priceMap: Record<string, string> = { PRICE_LEVEL_FREE: '$', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$', PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$' };
		const establishmentMap: Record<string, string> = {
			restaurant: 'Restaurante', cafe: 'Café', coffee_shop: 'Café', bar: 'Bar', pub: 'Pub', night_club: 'Bar', bakery: 'Panadería',
			ice_cream_shop: 'Heladería', fast_food_restaurant: 'Comida rápida', wine_bar: 'Vinoteca', brewery: 'Cervecería', meal_takeaway: 'Casa de comidas',
		};
		const cuisineMap: Record<string, string> = {
			argentinian_restaurant: 'Argentina', barbecue_restaurant: 'Parrilla', brazilian_restaurant: 'Brasileña', chinese_restaurant: 'China',
			french_restaurant: 'Francesa', greek_restaurant: 'Griega', indian_restaurant: 'India', indonesian_restaurant: 'Indonesia', italian_restaurant: 'Italiana',
			japanese_restaurant: 'Japonesa', korean_restaurant: 'Coreana', lebanese_restaurant: 'Libanesa', mediterranean_restaurant: 'Mediterránea',
			mexican_restaurant: 'Mexicana', middle_eastern_restaurant: 'Medio Oriente', peruvian_restaurant: 'Peruana', pizza_restaurant: 'Pizzas',
			ramen_restaurant: 'Ramen', seafood_restaurant: 'Mariscos', spanish_restaurant: 'Española', steak_house: 'Parrilla', sushi_restaurant: 'Sushi',
			thai_restaurant: 'Tailandesa', turkish_restaurant: 'Turca', vegan_restaurant: 'Vegana', vegetarian_restaurant: 'Vegetariana', vietnamese_restaurant: 'Vietnamita',
		};
		const trustedClassificationText = normalized([
			officialPage.description, ...officialPage.keywords,
			instagramPage.description, ...instagramPage.keywords,
			wokiPage.description, ...wokiPage.keywords,
			wokiMatch?.category, wokiMatch?.info, wokiMatch?.subtitle, ...(wokiMatch?.tags ?? []),
		].filter(Boolean).join(' '));
		const googleSummaryText = normalized([place.displayName?.text, place.generativeSummary?.overview?.text, place.generativeSummary?.description?.text, place.editorialSummary?.text].filter(Boolean).join(' '));
		const placeTypes = detectCategories(place, `${googleSummaryText} ${trustedClassificationText}`);
		const cuisines = detectCuisines(place, `${googleSummaryText} ${trustedClassificationText}`, catalogList('cuisines'));
		const mealTypes = detectServices(place, `${googleSummaryText} ${trustedClassificationText}`, placeTypes.includes('Tienda'));
		const instagramFlags = detectInstagramFlags(normalized([instagramPage.description, ...instagramPage.keywords].join(' ')));
		const featureTags = [
			...(place.servesBeer ? ['Cerveza'] : []), ...(place.servesWine ? ['Vinos'] : []), ...(place.servesCocktails ? ['Coctelería'] : []),
			...(place.servesDessert ? ['Postres'] : []), ...(place.servesCoffee ? ['Café'] : []), ...(place.servesVegetarianFood ? ['Opciones vegetarianas'] : []),
			...(place.outdoorSeating ? ['Mesas al aire libre'] : []), ...(place.liveMusic ? ['Música en vivo'] : []), ...(place.goodForChildren ? ['Apto para niños'] : []),
			...(place.allowsDogs ? ['Pet friendly'] : []), ...(place.goodForGroups ? ['Apto para grupos'] : []), ...(place.goodForWatchingSports ? ['Deportes'] : []),
		];
		const ignoredTypes = new Set(['point_of_interest', 'establishment', 'food', ...Object.keys(establishmentMap), ...Object.keys(cuisineMap)]);
		const tags = unique([...featureTags, ...officialPage.keywords, ...instagramPage.keywords, ...facebookPage.keywords, ...wokiPage.keywords, ...(wokiMatch?.tags ?? []), ...(place.types ?? []).filter((type) => !ignoredTypes.has(type)).map(titleCase)]).slice(0, 20).join(', ');
		// Descripción y notas: el resumen generado por IA de Google (resumen general y, debajo, los puntos con detalles del lugar).
		const aiOverview = place.generativeSummary?.overview?.text?.trim() ?? '';
		const aiDetails = place.generativeSummary?.description?.text?.trim() ?? '';
		const description = aiOverview || aiDetails || place.editorialSummary?.text?.trim() || officialPage.description || wokiMatch?.info?.trim() || wokiPage.description || '';
		const notesSource = aiOverview && aiDetails ? aiDetails : place.reviewSummary?.text?.text?.trim() ?? '';
		const notes = notesSource ? bulletLines(notesSource) : '';
		const googleImageUrls = unique((place.photos ?? []).slice(0, 8).map((photo) => photo.name ? `/api/google-place-photo?name=${encodeURIComponent(photo.name)}` : ''));
		const wokiImageUrls = unique([wokiMatch?.bannerImageUrl || '', wokiMatch?.squareImageUrl || '', ...wokiPage.images]);
		const imageUrls = unique([...googleImageUrls, ...wokiImageUrls, ...officialPage.images, ...facebookPage.images]).slice(0, 12);

		return json(await enrichResult({
			name: place.displayName?.text?.trim() || name, description, notes,
			establishmentTypes: placeTypes.length ? placeTypes : ['Restaurante'], cuisines, mealTypes, tags,
			rating: place.rating ? String(Math.min(5, Math.max(1, Math.round(place.rating)))) : '', score: place.rating ? String(place.rating) : '',
			price: priceMap[place.priceLevel ?? ''] ?? wokiMatch?.price ?? '', averagePrice: averagePrice(place),
			country: 'Argentina', province: component(place, 'administrative_area_level_1'), city: component(place, 'locality', 'administrative_area_level_2'),
			neighborhood, address,
			phone: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || '', mobile: whatsapp,
			website,
			googleUrl: googleSearchUrl(place.displayName?.text || name, address, component(place, 'locality', 'administrative_area_level_2'), component(place, 'administrative_area_level_1')),
			mapUrl: googleMapsSearchUrl(place, name),
			instagramUrl, tiktokUrl, facebookUrl, wokiUrl, tripAdvisorUrl, linktreeUrl, menuUrl, pedidosYaUrl,
			hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') || hoursFromBio(instagramPage.description), delivery: Boolean(place.delivery) || instagramFlags.delivery, takeAway: Boolean(place.takeout) || instagramFlags.takeAway, glutenFree: instagramFlags.glutenFree, healthy: instagramFlags.healthy, freeBreakfast: instagramFlags.freeBreakfast, daytimeKitchen: instagramFlags.daytimeKitchen,
			logoUrl: instagramPage.images[0] || '', imageUrls, wokiImageUrls, googleImageUrls,
			sources: ['Google', ...(wokiUrl ? ['Woki'] : []), ...(instagramUrl ? ['Instagram'] : []), ...(facebookUrl ? ['Facebook'] : [])],
		}));
	} catch (error) { return json({ error: error instanceof Error ? error.message : 'No se pudo buscar el lugar en Google' }, 500); }
};
