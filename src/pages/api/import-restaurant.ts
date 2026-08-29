import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const prerender = false;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { 'content-type': 'application/json; charset=utf-8' },
});

function isPrivateAddress(address: string) {
	const normalized = address.toLowerCase().replace(/^::ffff:/, '');
	if (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
	const parts = normalized.split('.').map(Number);
	if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
	return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254)
		|| (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

async function validateUrl(value: string) {
	const url = new URL(value);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('La dirección debe comenzar con http:// o https://');
	if (url.username || url.password) throw new Error('La dirección no puede contener credenciales');
	if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) throw new Error('No se permiten direcciones locales');
	if (isIP(url.hostname)) {
		if (isPrivateAddress(url.hostname)) throw new Error('No se permiten direcciones locales');
	} else {
		const addresses = await lookup(url.hostname, { all: true });
		if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('La página apunta a una red privada');
	}
	return url;
}

async function fetchRemote(value: string) {
	let url = await validateUrl(value);
	for (let redirect = 0; redirect < 5; redirect += 1) {
		const response = await fetch(url, {
			redirect: 'manual',
			signal: AbortSignal.timeout(12_000),
			headers: { 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/1.0)', accept: 'text/html,image/*;q=0.9,*/*;q=0.5' },
		});
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) throw new Error('La página respondió con una redirección inválida');
			url = await validateUrl(new URL(location, url).href);
			continue;
		}
		if (!response.ok) throw new Error(`La página respondió con el estado ${response.status}`);
		return { response, finalUrl: url };
	}
	throw new Error('La página realizó demasiadas redirecciones');
}

function text(value: unknown): string {
	if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
	if (typeof value === 'object' && value) return text((value as Record<string, unknown>).name ?? (value as Record<string, unknown>)['@value']);
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function absolute(value: unknown, base: string) {
	const source = text(value);
	if (!source) return '';
	try {
		const url = new URL(source, base);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
	} catch { return ''; }
}

function collectNodes(value: unknown, result: Record<string, unknown>[] = []) {
	if (Array.isArray(value)) value.forEach((item) => collectNodes(item, result));
	else if (value && typeof value === 'object') {
		const node = value as Record<string, unknown>;
		result.push(node);
		if (node['@graph']) collectNodes(node['@graph'], result);
	}
	return result;
}

function typesOf(node: Record<string, unknown>) {
	return (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).map(text);
}

function textValues(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(textValues);
	const valueText = text(value);
	return valueText ? valueText.split(/[,;|]/).map((item) => item.trim()).filter(Boolean) : [];
}

function normalizedText(value: string) {
	return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function uniqueValues(values: string[]) {
	return [...new Map(values
		.map((value) => value.trim())
		.filter(Boolean)
		.map((value) => [normalizedText(value), value])).values()];
}

function schemaBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	const normalized = normalizedText(text(value));
	if (['true', '1', 'yes', 'si'].includes(normalized)) return true;
	if (['false', '0', 'no'].includes(normalized)) return false;
	return undefined;
}

function hasTypedAction(value: unknown, actionType: string) {
	return collectNodes(value).some((node) => typesOf(node).includes(actionType));
}

function normalizeCuisine(value: string) {
	const translations: Record<string, string> = {
		argentine: 'Argentina', argentinian: 'Argentina', italian: 'Italiana', japanese: 'Japonesa',
		chinese: 'China', mexican: 'Mexicana', spanish: 'Española', french: 'Francesa', peruvian: 'Peruana',
		mediterranean: 'Mediterránea', vegetarian: 'Vegetariana', vegan: 'Vegana', seafood: 'Mariscos',
	};
	const trimmed = value.trim();
	return translations[normalizedText(trimmed)] ?? trimmed.charAt(0).toLocaleUpperCase('es') + trimmed.slice(1);
}

function normalizePriceRange(value: unknown) {
	const source = text(value).trim();
	const dollars = source.match(/\${1,4}/)?.[0];
	if (dollars) return dollars;
	const normalized = normalizedText(source);
	if (/gratis|free|econom|barato|inexpensive/.test(normalized)) return '$';
	if (/moderad|medio|moderate/.test(normalized)) return '$$';
	if (/muy caro|very expensive/.test(normalized)) return '$$$$';
	if (/caro|expensive/.test(normalized)) return '$$$';
	return '';
}

function formatHours(value: unknown): string {
	if (!value) return '';
	if (Array.isArray(value)) return value.map(formatHours).filter(Boolean).join('\n');
	if (typeof value === 'object') {
		const hours = value as Record<string, unknown>;
		const days = text(hours.dayOfWeek).replace(/https?:\/\/schema\.org\//g, '');
		const range = [text(hours.opens), text(hours.closes)].filter(Boolean).join('–');
		return [days, range].filter(Boolean).join(': ');
	}
	return text(value);
}

function normalizeCountry(value: string) {
	const countries: Record<string, string> = { AR: 'Argentina', ARG: 'Argentina', UY: 'Uruguay', URY: 'Uruguay', CL: 'Chile', CHL: 'Chile', BR: 'Brasil', BRA: 'Brasil' };
	return countries[value.toUpperCase()] ?? value;
}

async function getWokiSearchRestaurantUrls(sourceUrl: URL) {
	const apiParams = new URLSearchParams();
	const directMappings: Record<string, string> = {
		showDay: 'date', quantity: 'quantity', country: 'country', state: 'state', city: 'city', orderBy: 'orderBy',
		openNow: 'openNow', hasDiscount: 'hasDiscount', isNew: 'isNew', isRecommended: 'isRecommended',
		lastTablesAvailable: 'lastTablesAvailable', withWokiScore: 'withWokiScore', userCoordinates: 'userCoordinates',
	};
	Object.entries(directMappings).forEach(([source, target]) => {
		const value = sourceUrl.searchParams.get(source);
		if (value !== null && value !== '') apiParams.set(target, value);
	});
	for (const [key, value] of sourceUrl.searchParams) {
		if (key.startsWith('flt.') && value) apiParams.set(key, value);
	}
	apiParams.set('locale', 'es');
	apiParams.set('page', '1');
	apiParams.set('limit', '50');
	const response = await fetch(`https://api.wokiapp.com/geta/v1/search/home?${apiParams}`, {
		signal: AbortSignal.timeout(15_000),
		headers: { accept: 'application/json', 'user-agent': 'RestoBoxImporter/1.0' },
	});
	if (!response.ok) throw new Error('Woki no permitió leer los resultados de la búsqueda');
	const data = await response.json() as unknown;
	const groups = Array.isArray(data) ? data : [];
	const slugs = groups.flatMap((group) => {
		if (!group || typeof group !== 'object') return [];
		const items = (group as Record<string, unknown>).items;
		if (!Array.isArray(items)) return [];
		return items.map((item) => item && typeof item === 'object' ? text((item as Record<string, unknown>).slug) : '').filter(Boolean);
	});
	return [...new Set(slugs)].map((slug) => `https://www.wokiapp.com/restaurante/${encodeURIComponent(slug)}`);
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json() as { url?: string; mode?: string };
		if (!body.url) return json({ error: 'Ingresá la dirección de la página' }, 400);
		const { response, finalUrl } = await fetchRemote(body.url);
		if (/^(?:www\.)?wokiapp\.com$/i.test(finalUrl.hostname) && /^\/search\/?$/i.test(finalUrl.pathname)) {
			const collectionUrls = await getWokiSearchRestaurantUrls(finalUrl);
			if (!collectionUrls.length) return json({ error: 'La búsqueda de Woki no contiene lugares para importar' }, 404);
			return json({ collectionUrls, sourceUrl: finalUrl.href });
		}
		const contentType = response.headers.get('content-type') ?? '';
		const declaredSize = Number(response.headers.get('content-length') ?? 0);
		if (body.mode === 'image') {
			if (!contentType.startsWith('image/')) return json({ error: 'El enlace no corresponde a una imagen' }, 415);
			if (declaredSize > 8_000_000) return json({ error: 'La imagen es demasiado grande' }, 413);
			const bytes = await response.arrayBuffer();
			if (bytes.byteLength > 8_000_000) return json({ error: 'La imagen es demasiado grande' }, 413);
			return new Response(bytes, { headers: { 'content-type': contentType, 'cache-control': 'private, max-age=300' } });
		}
		if (!contentType.includes('text/html')) return json({ error: 'El enlace no corresponde a una página web' }, 415);
		if (declaredSize > 3_000_000) return json({ error: 'La página es demasiado grande para importarla' }, 413);
		const html = await response.text();
		if (html.length > 3_000_000) return json({ error: 'La página es demasiado grande para importarla' }, 413);
		const $ = cheerio.load(html);
		const nodes: Record<string, unknown>[] = [];
		$('script[type="application/ld+json"]').each((_, element) => {
			try { collectNodes(JSON.parse($(element).text()), nodes); } catch { /* JSON-LD inválido. */ }
		});
		const businessTypes = new Set([
			'Restaurant', 'FoodEstablishment', 'LocalBusiness', 'CafeOrCoffeeShop', 'BarOrPub',
			'Bakery', 'Brewery', 'Distillery', 'FastFoodRestaurant', 'IceCreamShop', 'Winery',
		]);
		const schema = nodes
			.filter((node) => typesOf(node).some((type) => businessTypes.has(type)))
			.sort((left, right) => {
				const score = (node: Record<string, unknown>) => typesOf(node).reduce((total, type) => total
					+ (type === 'LocalBusiness' ? 1 : type === 'FoodEstablishment' ? 2 : businessTypes.has(type) ? 4 : 0), 0)
					+ (text(node.address) ? 1 : 0) + (text(node.telephone) ? 1 : 0);
				return score(right) - score(left);
			})[0] ?? {};
		const addressValue = schema.address;
		const address = addressValue && typeof addressValue === 'object' ? addressValue as Record<string, unknown> : {};
		const meta = (property: string) => $(`meta[property="${property}"], meta[name="${property}"]`).first().attr('content')?.trim() ?? '';
		const links = $('a[href]').map((_, element) => absolute($(element).attr('href'), finalUrl.href)).get().filter(Boolean);
		const findLink = (pattern: RegExp) => links.find((link) => pattern.test(link)) ?? '';
		const sameAs = (Array.isArray(schema.sameAs) ? schema.sameAs : [schema.sameAs]).map((item) => absolute(item, finalUrl.href)).filter(Boolean);
		const allLinks = [...new Set([...sameAs, ...links])];
		const findAllLink = (pattern: RegExp) => allLinks.find((link) => pattern.test(link)) ?? '';
		const whatsappLink = findAllLink(/(?:wa\.me|whatsapp\.com)/i);
		let whatsapp = '';
		if (whatsappLink) {
			const parsed = new URL(whatsappLink);
			whatsapp = parsed.hostname.includes('wa.me') ? parsed.pathname.replace(/\D/g, '') : (parsed.searchParams.get('phone') ?? '').replace(/\D/g, '');
		}
		const schemaTypes = typesOf(schema);
		const establishmentTypes = [
			...(schemaTypes.includes('Restaurant') || schemaTypes.includes('FoodEstablishment') ? ['Restaurante'] : []),
			...(schemaTypes.includes('CafeOrCoffeeShop') ? ['Café'] : []),
			...(schemaTypes.includes('BarOrPub') ? ['Bar', 'Pub'] : []),
			...(schemaTypes.includes('Bakery') ? ['Panadería'] : []),
			...(schemaTypes.includes('Brewery') ? ['Cervecería'] : []),
			...(schemaTypes.includes('Distillery') ? ['Destilería'] : []),
			...(schemaTypes.includes('FastFoodRestaurant') ? ['Comida rápida'] : []),
			...(schemaTypes.includes('IceCreamShop') ? ['Heladería'] : []),
			...(schemaTypes.includes('Winery') ? ['Bodega'] : []),
		];
		const importingFromWoki = /(^|\.)wokiapp\.com$/i.test(finalUrl.hostname);
		const website = importingFromWoki ? '' : absolute(schema.url, finalUrl.href) || finalUrl.href;
		const contentRoot = $('body').clone();
		contentRoot.find('script, style, noscript, nav, header, footer, svg').remove();
		const pageText = contentRoot.text().replace(/\s+/g, ' ').trim();
		const normalizedPageText = normalizedText(pageText);
		const rawKeywords = [text(schema.keywords), meta('keywords')]
			.flatMap((value) => value.split(/[,;|]/))
			.map((value) => value.trim())
			.filter((value) => value.length >= 3 && value.length <= 35);
		const cuisines = uniqueValues(textValues(schema.servesCuisine)
			.map(normalizeCuisine)
			.filter((value) => value.length >= 3 && value.length <= 50))
			.slice(0, 12);
		const mealTypes = ['Desayuno', 'Brunch', 'Almuerzo', 'Merienda', 'Cena', 'Poscena']
			.filter((meal) => normalizedPageText.includes(normalizedText(meal)));
		const foodKeywords = [
			'Café', 'Sushi', 'Parrilla',
			'Pastas', 'Pizzas', 'Hamburguesas', 'Mariscos', 'Pescados', 'Carnes', 'Vegano', 'Vegetariano',
			'Celíaco', 'Sin gluten', 'Comida rápida', 'Comida saludable', 'Coctelería', 'Cervecería', 'Vinos',
		].filter((keyword) => normalizedPageText.includes(normalizedText(keyword)));
		const stopWords = new Set([
			'para', 'desde', 'hasta', 'como', 'esta', 'este', 'estos', 'estas', 'entre', 'sobre', 'todos', 'todas',
			'nuestro', 'nuestra', 'nuestros', 'nuestras', 'tambien', 'donde', 'cuando', 'contacto', 'inicio', 'menu',
			'reservas', 'reserva', 'restaurante', 'pagina', 'cookies', 'privacy', 'politica', 'instagram', 'facebook',
		]);
		const nameWords = new Set(normalizedText(text(schema.name) || meta('og:title')).match(/[a-z]{4,}/g) ?? []);
		const frequencies = new Map<string, number>();
		for (const word of normalizedPageText.match(/[a-z]{5,}/g) ?? []) {
			if (stopWords.has(word) || nameWords.has(word)) continue;
			frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
		}
		const repeatedKeywords = [...frequencies.entries()]
			.filter(([, count]) => count >= 3)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 8)
			.map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
		const tags = [...new Map([...rawKeywords, ...foodKeywords, ...repeatedKeywords]
			.map((tag) => [tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'), tag])).values()]
			.slice(0, 12)
			.join(', ');
		const aggregateRating = schema.aggregateRating && typeof schema.aggregateRating === 'object'
			? schema.aggregateRating as Record<string, unknown>
			: {};
		const ratingValue = Number(text(aggregateRating.ratingValue).replace(',', '.'));
		const rating = Number.isFinite(ratingValue) && ratingValue > 0
			? String(Math.min(5, Math.max(1, Math.round(ratingValue))))
			: '';
		const contactPoint = schema.contactPoint && typeof schema.contactPoint === 'object'
			? schema.contactPoint as Record<string, unknown>
			: {};
		const delivery = hasTypedAction(schema.potentialAction, 'OrderAction')
			|| /\b(delivery|envios? a domicilio|entrega a domicilio)\b/.test(normalizedPageText);
		const takeAway = /\b(take[ -]?away|takeout|para llevar|retiro por (?:el )?local|retir[ao] en (?:el )?local|pick[ -]?up)\b/.test(normalizedPageText);
		const reservations = schemaBoolean(schema.acceptsReservations)
			?? (hasTypedAction(schema.potentialAction, 'ReserveAction') || /\b(reservas?|reservar|reserva tu mesa|book a table)\b/.test(normalizedPageText));
		const glutenFree = /\b(sin gluten|gluten[ -]?free|apto(?:s)? para celiacos?|opciones? celiacas?)\b/.test(normalizedPageText);
		return json({
			name: text(schema.name) || meta('og:title') || $('h1').first().text().trim() || $('title').text().trim(),
			description: (text(schema.description) || meta('description') || meta('og:description')).slice(0, 500),
			address: text(schema.streetAddress) || text(address.streetAddress) || $('[itemprop="streetAddress"]').first().text().trim(),
			neighborhood: text(address.addressNeighborhood) || $('[itemprop="addressNeighborhood"]').first().text().trim(),
			city: text(address.addressLocality) || $('[itemprop="addressLocality"]').first().text().trim(),
			province: text(address.addressRegion) || $('[itemprop="addressRegion"]').first().text().trim(),
			country: normalizeCountry(text(address.addressCountry) || $('[itemprop="addressCountry"]').first().text().trim()),
			phone: text(schema.telephone) || text(contactPoint.telephone) || $('[itemprop="telephone"]').first().text().trim(),
			mobile: importingFromWoki ? '' : whatsapp,
			website,
			googleUrl: findAllLink(/google\.[^/]+\/(?:search|maps)|g\.page/i),
			menuUrl: absolute(schema.hasMenu ?? schema.menu, finalUrl.href) || findLink(/menu|carta/i),
			mapUrl: findAllLink(/google\.[^/]+\/maps|maps\.app\.goo\.gl/i),
			instagramUrl: importingFromWoki ? '' : findAllLink(/instagram\.com/i),
			tiktokUrl: importingFromWoki ? '' : findAllLink(/tiktok\.com/i),
			facebookUrl: importingFromWoki ? '' : findAllLink(/facebook\.com/i),
			wokiUrl: importingFromWoki ? finalUrl.href : findAllLink(/wokiapp\.com/i),
			tripAdvisorUrl: findAllLink(/tripadvisor\./i),
			linktreeUrl: findAllLink(/linktr\.ee/i),
			hours: formatHours(schema.openingHours ?? schema.openingHoursSpecification).slice(0, 500),
			price: normalizePriceRange(schema.priceRange),
			tags,
			rating,
			cuisines,
			mealTypes,
			establishmentTypes: uniqueValues(establishmentTypes.length ? establishmentTypes : ['Restaurante']),
			delivery,
			takeAway,
			glutenFree,
			reservations,
			sourceUrl: finalUrl.href,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'No se pudo importar la página';
		return json({ error: message }, 400);
	}
};
