// Strega (strega.com.ar): guía de restaurantes, bares y cafés de Argentina.
// Al importar un lugar se busca su ficha con la búsqueda pública del WordPress de Strega
// (/wp-json/wp/v2/businesses?search=…) y se leen sus datos: descripción, dirección, horarios,
// categorías, servicios (reservas, delivery, take away, desayuno, almuerzo…), teléfono, web e Instagram
// y el link a Google Maps.
import * as cheerio from 'cheerio';

const STREGA_BUSINESSES_API = 'https://www.strega.com.ar/wp-json/wp/v2/businesses';
const HEADERS = { 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' };

type StregaBusiness = { link?: string; title?: { rendered?: string }; class_list?: string[] | Record<string, string> };
export type StregaCandidate = { link: string; title: string; classes: string[] };

export type StregaPlace = {
	url: string;
	name: string;
	description: string;
	address: string;
	neighborhood: string;
	city: string;
	province: string;
	phone: string;
	website: string;
	instagramUrl: string;
	whatsappUrl: string;
	mapUrl: string;
	hours: string;
	categories: string[];
	// Servicios tal como los muestra Strega ("Se puede reservar", "Para llevar", "Sirve almuerzo"…).
	services: string[];
};

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');
const comparable = (value: string) => plain(value).replace(/[^a-z0-9]+/g, '');
const slug = (value: string) => plain(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const decodeEntities = (value: string) => value
	.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
	.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Busca por nombre. Es lenta (12 a 15 segundos), por eso conviene arrancarla junto con la búsqueda en Google.
export async function searchStrega(name: string): Promise<StregaCandidate[]> {
	// La búsqueda de Strega distingue tildes ("Café" no encuentra "Cafe"): se busca sin tildes.
	const search = name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
	if (comparable(search).length < 2) return [];
	try {
		const parameters = new URLSearchParams({ search, orderby: 'relevance', per_page: '10', _fields: 'link,title,class_list' });
		const response = await fetch(`${STREGA_BUSINESSES_API}?${parameters}`, {
			signal: AbortSignal.timeout(25_000),
			headers: { ...HEADERS, accept: 'application/json' },
		});
		if (!response.ok) return [];
		const businesses = await response.json() as StregaBusiness[];
		if (!Array.isArray(businesses)) return [];
		return businesses.flatMap((business) => {
			const link = business.link ?? '';
			if (!/^https:\/\/www\.strega\.com\.ar\//.test(link)) return [];
			const classes = Array.isArray(business.class_list) ? business.class_list : Object.values(business.class_list ?? {});
			return [{ link, title: decodeEntities(business.title?.rendered ?? ''), classes }];
		});
	} catch {
		return [];
	}
}

// Elige la ficha que corresponde al lugar: el nombre tiene que coincidir (o estar contenido) y,
// si se conoce la ciudad o el barrio, la ficha tiene que ser de ahí (Strega los marca como "business_location-mar-del-plata").
export function pickStregaCandidate(candidates: StregaCandidate[], names: string[], places: string[] = []) {
	const wanted = names.map(comparable).filter((value) => value.length >= 2);
	const placeClasses = places.map((place) => place.trim()).filter(Boolean).map((place) => `business_location-${slug(place)}`);
	const scored = candidates.flatMap((candidate) => {
		const title = comparable(candidate.title);
		if (!title) return [];
		const score = Math.max(0, ...wanted.map((value) => (title === value ? 2 : title.includes(value) || value.includes(title) ? 1 : 0)));
		if (!score) return [];
		return [{ candidate, score, inPlace: placeClasses.some((placeClass) => candidate.classes.includes(placeClass)) }];
	});
	// Si el título es exactamente lo que se escribió ("Bruder Pilar" → "BRÜDER PILAR"), vale aunque la ciudad no coincida.
	const typed = wanted[0] ?? '';
	const pool = placeClasses.length ? scored.filter((item) => item.inPlace || comparable(item.candidate.title) === typed) : scored;
	return pool.sort((a, b) => b.score - a.score)[0]?.candidate ?? null;
}

// Toma el resultado de una búsqueda ya iniciada y, si no hay coincidencia, prueba una vez más con el nombre
// que dio Google (por ejemplo, si se escribió "Bruder Pilar" y Google lo llama "Brüder").
export async function findStregaPlace(search: Promise<StregaCandidate[]>, names: string[], places: string[] = []) {
	const searched = names[0] ?? '';
	let match = pickStregaCandidate(await search, names, places);
	const otherName = names.find((value) => comparable(value) !== comparable(searched) && comparable(value).length >= 2);
	if (!match && otherName) match = pickStregaCandidate(await searchStrega(otherName), names, places);
	return match ? readStregaPlace(match.link) : null;
}

// Strega usa los nombres de los días en castellano; se guardan como en Google ("lunes: 18:00–01:00").
function hoursFrom($: cheerio.CheerioAPI) {
	const lines = sectionTexts($, 'Operating Hours').slice(1);
	const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
	const result: string[] = [];
	for (let index = 0; index < lines.length - 1; index += 1) {
		if (days.includes(plain(lines[index]))) {
			result.push(`${lines[index].toLocaleLowerCase('es')}: ${lines[index + 1]}`);
			index += 1;
		}
	}
	return result.join('\n');
}

// Las secciones de la ficha están marcadas con comentarios HTML (<!-- Services -->, <!-- Operating Hours -->…):
// se devuelven los textos que hay entre ese comentario y el siguiente.
function sectionTexts($: cheerio.CheerioAPI, name: string) {
	const html = $.html();
	const start = html.indexOf(`<!-- ${name} -->`);
	if (start < 0) return [];
	const end = html.indexOf('<!--', start + name.length + 8);
	const section = cheerio.load(html.slice(start, end < 0 ? undefined : end));
	section('svg, script, style').remove();
	return section.root().find('*').contents().toArray()
		.filter((node) => node.type === 'text')
		.map((node) => section(node).text().replace(/\s+/g, ' ').trim())
		.filter(Boolean);
}

export async function readStregaPlace(url: string): Promise<StregaPlace | null> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { ...HEADERS, accept: 'text/html' } });
		if (!response.ok) return null;
		const $ = cheerio.load(await response.text());
		type LocalBusiness = {
			'@type'?: string; name?: string; description?: string; url?: string; telephone?: string;
			address?: { streetAddress?: string; addressLocality?: string };
		};
		const business = $('script[type="application/ld+json"]').toArray()
			.flatMap((script) => { try { return [JSON.parse($(script).text()) as LocalBusiness]; } catch { return []; } })
			.find((item) => item['@type'] && item['@type'] !== 'BreadcrumbList');
		const links = $('a[href]').toArray().map((link) => $(link).attr('href') ?? '');
		const websiteLink = links.find((link, index) => /pagina web|sitio web/i.test($('a[href]').eq(index).text())) ?? business?.url ?? '';
		const instagramUrl = [websiteLink, ...links].find((link) => /instagram\.com\/[\w.]+/i.test(link)) ?? '';
		// Sin sitio propio, Strega pone el link de su propia ficha.
		const website = websiteLink && !/strega\.com\.ar|instagram\.com|facebook\.com|linktr\.ee|wa\.me|whatsapp/i.test(websiteLink) ? websiteLink : '';
		// Zona: el link "Restaurantes en Villa Verde" apunta a /restaurantes/provincia/ciudad/barrio/.
		const zone = $('a[href*="/restaurantes/"]').toArray()
			.map((link) => ({ depth: ($(link).attr('href') ?? '').replace(/^https:\/\/www\.strega\.com\.ar/, '').split('/').filter(Boolean).length, text: $(link).text().replace(/\s+/g, ' ').trim() }))
			.find((link) => link.depth === 4 && /^restaurantes en /i.test(link.text))?.text.replace(/^restaurantes en /i, '') ?? '';
		const whatsappUrl = links.find((link) => /wa\.me\/|api\.whatsapp\.com|whatsapp\.com\/send/i.test(link)) ?? '';
		const mapCid = ($('iframe[src*="maps.google"]').attr('src') ?? '').match(/[?&]cid=(\d+)/)?.[1] ?? '';
		// Descripción: la reseña completa, un párrafo por renglón (en FoodieBox cada renglón es una viñeta).
		// Solo la sección <!-- Description -->: más abajo están los resúmenes de otros lugares ("Negocios relacionados").
		const html = $.html();
		const descriptionStart = html.indexOf('<!-- Description -->');
		const descriptionEnd = html.indexOf('<!-- Map Section -->', descriptionStart);
		const review = descriptionStart >= 0 ? cheerio.load(html.slice(descriptionStart, descriptionEnd > 0 ? descriptionEnd : undefined)) : $;
		const description = review('p').toArray().map((paragraph) => review(paragraph).text().replace(/\s+/g, ' ').trim())
			.filter((text) => text.length > 20).join('\n') || business?.description?.trim() || '';
		// "Fragata Argentina 2033, B1629 Pilar, Provincia de Buenos Aires, Argentina": calle y altura, ciudad y provincia.
		const fullAddress = business?.address?.streetAddress?.trim() ?? '';
		const addressParts = fullAddress.split(',').map((part) => part.trim()).filter(Boolean);
		const province = addressParts.find((part) => /^provincia de /i.test(part))?.replace(/^provincia de /i, '')
			|| (addressParts.length >= 4 ? addressParts[addressParts.length - 2] : '');
		// La sección "Business Info" tiene el nombre, el botón "Atrás", la dirección y las categorías.
		const info = sectionTexts($, 'Business Info');
		const addressIndex = info.findIndex((text) => text === fullAddress);
		const categories = addressIndex >= 0 ? info.slice(addressIndex + 1) : [];
		return {
			url,
			name: business?.name?.trim() ?? '',
			description,
			address: addressParts[0] ?? '',
			neighborhood: zone,
			city: business?.address?.addressLocality?.trim() ?? '',
			province: province ?? '',
			phone: business?.telephone?.trim() ?? links.find((link) => link.startsWith('tel:'))?.slice(4) ?? '',
			website, instagramUrl, whatsappUrl,
			mapUrl: mapCid ? `https://maps.google.com/?cid=${mapCid}` : '',
			hours: hoursFrom($),
			categories,
			services: sectionTexts($, 'Services').slice(1),
		};
	} catch {
		return null;
	}
}
