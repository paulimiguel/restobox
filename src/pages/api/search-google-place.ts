import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const prerender = false;

type GoogleText = { text?: string };
type GoogleMoney = { currencyCode?: string; units?: string; nanos?: number };
type GoogleAddressComponent = { longText?: string; types?: string[] };
type GooglePlace = {
	displayName?: GoogleText; formattedAddress?: string; addressComponents?: GoogleAddressComponent[];
	nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string;
	googleMapsLinks?: { directionsUri?: string; placeUri?: string }; regularOpeningHours?: { weekdayDescriptions?: string[] };
	rating?: number; priceLevel?: string; priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney };
	types?: string[]; primaryType?: string; editorialSummary?: GoogleText;
	generativeSummary?: { overview?: GoogleText; description?: GoogleText }; reviewSummary?: { text?: GoogleText };
	photos?: Array<{ name?: string }>; delivery?: boolean; takeout?: boolean; reservable?: boolean;
	servesBreakfast?: boolean; servesBrunch?: boolean; servesLunch?: boolean; servesDinner?: boolean;
	servesBeer?: boolean; servesWine?: boolean; servesCocktails?: boolean; servesDessert?: boolean; servesCoffee?: boolean;
	servesVegetarianFood?: boolean; outdoorSeating?: boolean; liveMusic?: boolean; goodForChildren?: boolean;
	allowsDogs?: boolean; goodForGroups?: boolean; goodForWatchingSports?: boolean;
};
type PublicPageData = { links: string[]; images: string[]; description: string; keywords: string[]; text: string };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const component = (place: GooglePlace, ...types: string[]) => place.addressComponents?.find((item) => types.some((type) => item.types?.includes(type)))?.longText?.trim() ?? '';
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const unique = (values: string[]) => [...new Map(values.map((value) => value.trim()).filter(Boolean).map((value) => [normalized(value), value])).values()];
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'));

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

async function pageDataOrEmpty(url: string): Promise<PublicPageData> {
	if (!url) return { links: [], images: [], description: '', keywords: [], text: '' };
	try { return await readPublicPage(url); } catch { return { links: [], images: [], description: '', keywords: [], text: '' }; }
}
const socialLink = (links: string[], pattern: RegExp) => links.find((link) => pattern.test(link)) ?? '';

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
	const target = normalized(requestedName.split(',')[0]).replace(/[^a-z0-9]+/g, ' ').trim();
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
	const detected = detectedPublicValues([place.category, place.info, place.subtitle, ...(place.tags ?? []), page.description, page.text, instagramPage.description, facebookPage.description].filter(Boolean).join(' '));
	const allLinks = unique([...page.links, ...instagramPage.links, ...facebookPage.links]);
	const whatsappUrl = socialLink(allLinks, /(?:wa\.me|whatsapp\.com)/i);
	let mobile = '';
	if (whatsappUrl) { const parsed = new URL(whatsappUrl); mobile = parsed.hostname.includes('wa.me') ? parsed.pathname.replace(/\D/g, '') : (parsed.searchParams.get('phone') ?? '').replace(/\D/g, ''); }
	return {
		name: place.displayName || requestedName.split(',')[0].trim(), description: place.info || page.description || '', notes: '',
		establishmentTypes: unique([place.category || '', ...detected.establishments]), cuisines: detected.cuisines, mealTypes: detected.meals,
		tags: unique([...(place.tags ?? []), ...page.keywords, ...instagramPage.keywords, ...facebookPage.keywords]).slice(0, 20).join(', '),
		price: /^\${1,4}$/.test(place.price || '') ? place.price : '', averagePrice: '', rating: '', score: '',
		country: place.zones?.country?.name || 'Argentina', province: place.zones?.state?.name || '', city: place.zones?.city?.name || '',
		neighborhood: '', address: place.address || '', phone: '', mobile, website: '',
		googleUrl: googleSearchUrl(place.displayName || requestedName, place.address, place.zones?.city?.name, place.zones?.state?.name), mapUrl: '', hours: '',
		instagramUrl, facebookUrl, tiktokUrl, wokiUrl,
		tripAdvisorUrl: socialLink(allLinks, /(?:^|\.)tripadvisor\./i), linktreeUrl: socialLink(allLinks, /(?:^|\.)linktr\.ee\//i),
		menuUrl: allLinks.find((link) => /(?:menu|carta)/i.test(link)) ?? '',
		delivery: false, takeAway: false, reservations: true,
		logoUrl: instagramPage.images[0] || place.squareImageUrl || '',
		imageUrls: unique([place.bannerImageUrl || '', place.squareImageUrl || '', ...page.images, ...instagramPage.images, ...facebookPage.images]).slice(0, 12),
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
	const [instagramPage, facebookPage] = await Promise.all([pageDataOrEmpty(instagramUrl), pageDataOrEmpty(facebookUrl)]);
	const sourceText = [
		...results.flatMap((result) => [result.title, result.snippet]),
		...pages.flatMap((page) => [page.description, page.text, ...page.keywords]),
		instagramPage.description, facebookPage.description,
	].filter(Boolean).join(' ');
	const detected = detectedPublicValues(sourceText);
	const properties = openMapPlace?.properties;
	const mapAddress = [properties?.street, properties?.housenumber].filter(Boolean).join(' ');
	const publicAddress = addressFromPublicText(sourceText);
	const address = properties?.housenumber ? mapAddress : publicAddress || mapAddress;
	const coordinates = openMapPlace?.geometry?.coordinates;
	const openMapUrl = coordinates?.length === 2 ? `https://www.openstreetmap.org/?mlat=${coordinates[1]}&mlon=${coordinates[0]}#map=18/${coordinates[1]}/${coordinates[0]}` : '';
	const establishmentByMapType: Record<string, string> = { restaurant: 'Restaurante', cafe: 'Café', bar: 'Bar', pub: 'Pub', bakery: 'Panadería', ice_cream: 'Heladería' };
	const mapEstablishment = establishmentByMapType[properties?.osm_value ?? ''] ?? '';
	const descriptions = unique([...pages.map((page) => page.description), ...results.map((result) => result.snippet)]).filter((value) => value.length >= 30);
	const pageImages = unique([...instagramPage.images, ...pages.flatMap((page) => page.images), ...facebookPage.images]);
	const inferredMarDelPlata = normalized(sourceText).includes('mar del plata') || normalized(requestedName).includes('mar del plata');
	return {
		name: properties?.name || requestedPlaceName(requestedName).replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es')),
		description: descriptions[0] || '', notes: '',
		establishmentTypes: unique([mapEstablishment, ...detected.establishments]).length ? unique([mapEstablishment, ...detected.establishments]) : ['Restaurante'],
		cuisines: detected.cuisines, mealTypes: detected.meals,
		tags: unique([...pages.flatMap((page) => page.keywords), ...instagramPage.keywords, ...facebookPage.keywords]).slice(0, 20).join(', '),
		price: '', averagePrice: '', rating: '', score: '',
		country: properties?.country || (inferredMarDelPlata ? 'Argentina' : ''),
		province: properties?.state || (inferredMarDelPlata ? 'Buenos Aires' : ''),
		city: properties?.city || (inferredMarDelPlata ? 'Mar del Plata' : ''), neighborhood: properties?.district || '', address,
		phone: '', mobile: '', website,
		googleUrl: googleSearchUrl(properties?.name || requestedPlaceName(requestedName), address, properties?.city || (inferredMarDelPlata ? 'Mar del Plata' : ''), properties?.state),
		mapUrl: googleUrl || openMapUrl, hours: '',
		instagramUrl, facebookUrl, tiktokUrl, wokiUrl: socialLink(allLinks, /(?:^|\.)wokiapp\.com\//i), tripAdvisorUrl, linktreeUrl,
		menuUrl: allLinks.find((link) => /(?:menu|carta)/i.test(link)) ?? '',
		delivery: false, takeAway: false, reservations: allLinks.some((link) => /reserv/i.test(link)),
		logoUrl: instagramPage.images[0] || '', imageUrls: pageImages.slice(0, 12),
		sources: ['Fuentes públicas', ...(openMapPlace ? ['OpenStreetMap'] : []), ...(instagramUrl ? ['Instagram'] : []), ...(facebookUrl ? ['Facebook'] : [])],
	};
}

async function fallbackWithoutGoogle(requestedName: string) {
	return await wokiFallback(requestedName) || await publicWebFallback(requestedName);
}

function averagePrice(place: GooglePlace) {
	const values = [place.priceRange?.startPrice, place.priceRange?.endPrice].map((money) => money ? Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1e9 : 0).filter((value) => value > 0);
	if (!values.length) return '';
	const amount = values.reduce((total, value) => total + value, 0) / values.length;
	const currency = place.priceRange?.startPrice?.currencyCode || place.priceRange?.endPrice?.currencyCode || 'ARS';
	try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
	catch { return `${currency} ${Math.round(amount)}`; }
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json() as { name?: string };
		const name = body.name?.trim() ?? '';
		if (name.length < 2) return json({ error: 'Ingresá el nombre del lugar que querés buscar' }, 400);
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			const fallback = await fallbackWithoutGoogle(name);
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes públicas disponibles` }, 404);
		}

		const fieldMask = [
			'id', 'displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'internationalPhoneNumber',
			'websiteUri', 'googleMapsUri', 'googleMapsLinks', 'regularOpeningHours', 'rating', 'priceLevel', 'priceRange',
			'types', 'primaryType', 'editorialSummary', 'generativeSummary', 'reviewSummary', 'photos', 'delivery', 'takeout',
			'reservable', 'servesBreakfast', 'servesBrunch', 'servesLunch', 'servesDinner', 'servesBeer', 'servesWine',
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
			const fallback = await fallbackWithoutGoogle(name);
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes disponibles` }, 404);
		}
		const result = await response.json() as { places?: GooglePlace[]; error?: { message?: string } };
		if (!response.ok) {
			const fallback = await fallbackWithoutGoogle(name);
			return fallback ? json(fallback) : json({ error: result.error?.message ?? 'No se pudo completar la búsqueda' }, response.status);
		}
		const place = result.places?.[0];
		if (!place) {
			const fallback = await fallbackWithoutGoogle(name);
			return fallback ? json(fallback) : json({ error: `No se encontró “${name}” en las fuentes disponibles` }, 404);
		}

		const officialPage = await pageDataOrEmpty(place.websiteUri?.trim() ?? '');
		const instagramUrl = socialLink(officialPage.links, /(?:^|\.)instagram\.com\//i);
		const facebookUrl = socialLink(officialPage.links, /(?:^|\.)facebook\.com\//i);
		const tiktokUrl = socialLink(officialPage.links, /(?:^|\.)tiktok\.com\//i);
		const wokiMatch = await findWokiPlace(place, name);
		const wokiUrl = socialLink(officialPage.links, /(?:^|\.)wokiapp\.com\//i) || (wokiMatch?.slug ? `https://www.wokiapp.com/restaurante/${encodeURIComponent(wokiMatch.slug)}` : '');
		const tripAdvisorUrl = socialLink(officialPage.links, /(?:^|\.)tripadvisor\./i);
		const linktreeUrl = socialLink(officialPage.links, /(?:^|\.)linktr\.ee\//i);
		const menuUrl = officialPage.links.find((link) => /(?:menu|carta)/i.test(link)) ?? '';
		const [instagramPage, facebookPage, wokiPage] = await Promise.all([pageDataOrEmpty(instagramUrl), pageDataOrEmpty(facebookUrl), pageDataOrEmpty(wokiUrl)]);
		const allLinks = unique([...officialPage.links, ...instagramPage.links, ...facebookPage.links, ...wokiPage.links]);
		const whatsappLink = socialLink(allLinks, /(?:wa\.me|whatsapp\.com)/i);
		let whatsapp = '';
		if (whatsappLink) { const parsed = new URL(whatsappLink); whatsapp = parsed.hostname.includes('wa.me') ? parsed.pathname.replace(/\D/g, '') : (parsed.searchParams.get('phone') ?? '').replace(/\D/g, ''); }

		const street = component(place, 'route');
		const streetNumber = component(place, 'street_number');
		const address = [street, streetNumber].filter(Boolean).join(' ') || place.formattedAddress?.trim() || '';
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
		const establishmentTypes = unique((place.types ?? []).map((type) => establishmentMap[type]).filter(Boolean));
		const sourceText = normalized([officialPage, instagramPage, facebookPage, wokiPage].flatMap((page) => [page.description, page.text, ...page.keywords]).join(' '));
		const enrichedSourceText = `${sourceText} ${normalized([wokiMatch?.category, wokiMatch?.info, wokiMatch?.subtitle, ...(wokiMatch?.tags ?? [])].filter(Boolean).join(' '))}`;
		const detectedEstablishments = Object.entries({ Restaurante: /\brestaurante\b/, Café: /\bcafe\b|coffee shop/, Bar: /\bbar\b/, Pub: /\bpub\b/, Panadería: /\bpanaderia\b|bakery/, Heladería: /\bheladeria\b|ice cream/, Cervecería: /\bcerveceria\b|brewery/ }).filter(([, pattern]) => pattern.test(enrichedSourceText)).map(([value]) => value);
		const cuisineTerms: Record<string, RegExp> = {
			Pastas: /\bpastas?\b/, Parrilla: /\bparrilla\b|steak/, Pizzas: /\bpizzas?\b/, Sushi: /\bsushi\b/, Mariscos: /\bmariscos?\b|seafood/,
			Argentina: /\bargentin[ao]\b/, Italiana: /\bitalian[ao]\b/, Japonesa: /\bjapones[ao]\b/, Peruana: /\bperuan[ao]\b/,
			Mexicana: /\bmexican[ao]\b/, Mediterránea: /\bmediterrane[ao]\b/, Vegana: /\bvegan[ao]\b/, Vegetariana: /\bvegetarian[ao]\b/,
		};
		const cuisines = unique([...(place.types ?? []).map((type) => cuisineMap[type]).filter(Boolean), ...Object.entries(cuisineTerms).filter(([, pattern]) => pattern.test(enrichedSourceText)).map(([value]) => value)]);
		const sourceMeals = Object.entries({ Desayuno: /\bdesayuno\b|breakfast/, Brunch: /\bbrunch\b/, Almuerzo: /\balmuerzo\b|lunch/, Merienda: /\bmerienda\b/, Cena: /\bcena\b|dinner/, Drunch: /\bdrunch\b/, 'After dinner': /after dinner/, Poscena: /\bposcena\b/ }).filter(([, pattern]) => pattern.test(enrichedSourceText)).map(([value]) => value);
		const mealTypes = unique([...(place.servesBreakfast ? ['Desayuno'] : []), ...(place.servesBrunch ? ['Brunch'] : []), ...(place.servesLunch ? ['Almuerzo'] : []), ...(place.servesDinner ? ['Cena'] : []), ...sourceMeals]);
		const featureTags = [
			...(place.servesBeer ? ['Cerveza'] : []), ...(place.servesWine ? ['Vinos'] : []), ...(place.servesCocktails ? ['Coctelería'] : []),
			...(place.servesDessert ? ['Postres'] : []), ...(place.servesCoffee ? ['Café'] : []), ...(place.servesVegetarianFood ? ['Opciones vegetarianas'] : []),
			...(place.outdoorSeating ? ['Mesas al aire libre'] : []), ...(place.liveMusic ? ['Música en vivo'] : []), ...(place.goodForChildren ? ['Apto para niños'] : []),
			...(place.allowsDogs ? ['Pet friendly'] : []), ...(place.goodForGroups ? ['Apto para grupos'] : []), ...(place.goodForWatchingSports ? ['Deportes'] : []),
		];
		const ignoredTypes = new Set(['point_of_interest', 'establishment', 'food', ...Object.keys(establishmentMap), ...Object.keys(cuisineMap)]);
		const tags = unique([...featureTags, ...officialPage.keywords, ...instagramPage.keywords, ...facebookPage.keywords, ...wokiPage.keywords, ...(wokiMatch?.tags ?? []), ...(place.types ?? []).filter((type) => !ignoredTypes.has(type)).map(titleCase)]).slice(0, 20).join(', ');
		const description = place.generativeSummary?.overview?.text?.trim() || place.generativeSummary?.description?.text?.trim() || place.editorialSummary?.text?.trim() || officialPage.description || wokiMatch?.info?.trim() || wokiPage.description || '';
		const notes = place.reviewSummary?.text?.text?.trim() || '';
		const imageUrls = unique([...(place.photos ?? []).slice(0, 8).map((photo) => photo.name ? `/api/google-place-photo?name=${encodeURIComponent(photo.name)}` : ''), wokiMatch?.bannerImageUrl || '', wokiMatch?.squareImageUrl || '', ...officialPage.images, ...wokiPage.images, ...facebookPage.images]).slice(0, 12);

		return json({
			name: place.displayName?.text?.trim() || name, description, notes,
			establishmentTypes: unique([...establishmentTypes, ...detectedEstablishments]).length ? unique([...establishmentTypes, ...detectedEstablishments]) : ['Restaurante'], cuisines, mealTypes, tags,
			rating: place.rating ? String(Math.min(5, Math.max(1, Math.round(place.rating)))) : '', score: place.rating ? String(place.rating) : '',
			price: priceMap[place.priceLevel ?? ''] ?? wokiMatch?.price ?? '', averagePrice: averagePrice(place),
			country: component(place, 'country'), province: component(place, 'administrative_area_level_1'), city: component(place, 'locality', 'administrative_area_level_2'),
			neighborhood: component(place, 'neighborhood', 'sublocality_level_1', 'sublocality'), address,
			phone: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || '', mobile: whatsapp,
			website: place.websiteUri?.trim() ?? '',
			googleUrl: googleSearchUrl(place.displayName?.text || name, address, component(place, 'locality', 'administrative_area_level_2'), component(place, 'administrative_area_level_1')),
			mapUrl: place.googleMapsLinks?.placeUri?.trim() || place.googleMapsUri?.trim() || '',
			instagramUrl, tiktokUrl, facebookUrl, wokiUrl, tripAdvisorUrl, linktreeUrl, menuUrl,
			hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? '', delivery: Boolean(place.delivery), takeAway: Boolean(place.takeout), reservations: Boolean(place.reservable),
			logoUrl: instagramPage.images[0] || '', imageUrls,
			sources: ['Google', ...(wokiUrl ? ['Woki'] : []), ...(instagramUrl ? ['Instagram'] : []), ...(facebookUrl ? ['Facebook'] : [])],
		});
	} catch (error) { return json({ error: error instanceof Error ? error.message : 'No se pudo buscar el lugar en Google' }, 500); }
};
