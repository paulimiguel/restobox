// Busca un lugar en Strega (strega.com.ar) con la búsqueda pública de su WordPress
// (/wp-json/wp/v2/businesses?search=…) y devuelve el link de su ficha.
// Cada ficha trae su ciudad en class_list (por ejemplo "business_location-mar-del-plata"):
// si se conoce la ciudad, solo se acepta un lugar de esa ciudad.

const STREGA_BUSINESSES_API = 'https://www.strega.com.ar/wp-json/wp/v2/businesses';

type StregaBusiness = { link?: string; title?: { rendered?: string }; class_list?: string[] | Record<string, string> };

const plain = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const comparable = (value: string) => plain(value).replace(/[^a-z0-9]+/g, '');
const slug = (value: string) => plain(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const decodeEntities = (value: string) => value
	.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
	.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export async function findStregaUrl(name: string, city = '') {
	const wanted = comparable(name);
	if (wanted.length < 2) return '';
	try {
		// La búsqueda de Strega distingue tildes ("Café" no encuentra "Cafe"): se busca sin tildes.
		const search = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
		const parameters = new URLSearchParams({ search, orderby: 'relevance', per_page: '10', _fields: 'link,title,class_list' });
		const response = await fetch(`${STREGA_BUSINESSES_API}?${parameters}`, {
			// La búsqueda de Strega es lenta (12 a 15 segundos).
			signal: AbortSignal.timeout(25_000),
			headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; RestoBoxImporter/2.0)' },
		});
		if (!response.ok) return '';
		const businesses = await response.json() as StregaBusiness[];
		if (!Array.isArray(businesses)) return '';
		const cityClass = city.trim() ? `business_location-${slug(city)}` : '';
		const candidates = businesses.flatMap((business) => {
			const link = business.link ?? '';
			if (!/^https:\/\/www\.strega\.com\.ar\//.test(link)) return [];
			const title = comparable(decodeEntities(business.title?.rendered ?? ''));
			const nameScore = title === wanted ? 2 : title && (title.includes(wanted) || wanted.includes(title)) ? 1 : 0;
			if (!nameScore) return [];
			const classes = Array.isArray(business.class_list) ? business.class_list : Object.values(business.class_list ?? {});
			return [{ link, nameScore, inCity: Boolean(cityClass) && classes.includes(cityClass) }];
		});
		const pool = cityClass ? candidates.filter((candidate) => candidate.inCity) : candidates;
		return pool.sort((a, b) => b.nameScore - a.nameScore)[0]?.link ?? '';
	} catch {
		return '';
	}
}
