import type { APIRoute } from 'astro';

type GoogleText = { text?: string };
type GoogleAddressComponent = { longText?: string; shortText?: string; types?: string[] };
type GooglePlace = {
	displayName?: GoogleText;
	formattedAddress?: string;
	addressComponents?: GoogleAddressComponent[];
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	websiteUri?: string;
	googleMapsUri?: string;
	regularOpeningHours?: { weekdayDescriptions?: string[] };
	rating?: number;
	priceLevel?: string;
	types?: string[];
	primaryType?: string;
	editorialSummary?: GoogleText;
	delivery?: boolean;
	takeout?: boolean;
	reservable?: boolean;
	servesBreakfast?: boolean;
	servesBrunch?: boolean;
	servesLunch?: boolean;
	servesDinner?: boolean;
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
	status,
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

const component = (place: GooglePlace, ...types: string[]) => place.addressComponents
	?.find((item) => types.some((type) => item.types?.includes(type)))?.longText?.trim() ?? '';

const titleCase = (value: string) => value
	.replaceAll('_', ' ')
	.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es'));

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json() as { name?: string };
		const name = body.name?.trim() ?? '';
		if (name.length < 2) return json({ error: 'Ingresá el nombre del lugar que querés buscar' }, 400);

		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) return json({ error: 'Falta configurar GOOGLE_MAPS_API_KEY para buscar lugares en Google' }, 503);

		const fieldMask = [
			'places.displayName', 'places.formattedAddress', 'places.addressComponents',
			'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.websiteUri',
			'places.googleMapsUri', 'places.regularOpeningHours', 'places.rating',
			'places.priceLevel', 'places.types', 'places.primaryType', 'places.editorialSummary',
			'places.delivery', 'places.takeout', 'places.reservable', 'places.servesBreakfast',
			'places.servesBrunch', 'places.servesLunch', 'places.servesDinner',
		].join(',');
		const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': fieldMask,
			},
			body: JSON.stringify({ textQuery: name, languageCode: 'es', regionCode: 'AR', pageSize: 1 }),
		});
		const result = await response.json() as { places?: GooglePlace[]; error?: { message?: string } };
		if (!response.ok) return json({ error: result.error?.message ?? 'Google no pudo completar la búsqueda' }, response.status);
		const place = result.places?.[0];
		if (!place) return json({ error: `No se encontró “${name}” en Google` }, 404);

		const street = component(place, 'route');
		const streetNumber = component(place, 'street_number');
		const address = [street, streetNumber].filter(Boolean).join(' ') || place.formattedAddress?.trim() || '';
		const priceMap: Record<string, string> = {
			PRICE_LEVEL_FREE: '$', PRICE_LEVEL_INEXPENSIVE: '$', PRICE_LEVEL_MODERATE: '$$',
			PRICE_LEVEL_EXPENSIVE: '$$$', PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
		};
		const establishmentMap: Record<string, string> = {
			restaurant: 'Restaurante', cafe: 'Café', coffee_shop: 'Café', bar: 'Bar', pub: 'Pub', night_club: 'Bar',
			bakery: 'Panadería', ice_cream_shop: 'Heladería', fast_food_restaurant: 'Comida rápida',
			wine_bar: 'Vinoteca', brewery: 'Cervecería',
		};
		const establishment = establishmentMap[place.primaryType ?? ''] ?? 'Restaurante';
		const cuisineMap: Record<string, string> = {
			argentinian_restaurant: 'Argentina', brazilian_restaurant: 'Brasileña', chinese_restaurant: 'China',
			french_restaurant: 'Francesa', greek_restaurant: 'Griega', indian_restaurant: 'India',
			indonesian_restaurant: 'Indonesia', italian_restaurant: 'Italiana', japanese_restaurant: 'Japonesa',
			korean_restaurant: 'Coreana', lebanese_restaurant: 'Libanesa', mediterranean_restaurant: 'Mediterránea',
			mexican_restaurant: 'Mexicana', middle_eastern_restaurant: 'Medio Oriente', peruvian_restaurant: 'Peruana',
			seafood_restaurant: 'Mariscos', spanish_restaurant: 'Española', sushi_restaurant: 'Sushi',
			thai_restaurant: 'Tailandesa', turkish_restaurant: 'Turca', vegan_restaurant: 'Vegana',
			vegetarian_restaurant: 'Vegetariana', vietnamese_restaurant: 'Vietnamita',
		};
		const cuisines = [...new Set((place.types ?? []).map((type) => cuisineMap[type]).filter(Boolean))];
		const mealTypes = [
			...(place.servesBreakfast ? ['Desayuno'] : []),
			...(place.servesBrunch ? ['Brunch'] : []),
			...(place.servesLunch ? ['Almuerzo'] : []),
			...(place.servesDinner ? ['Cena'] : []),
		];
		const tags = (place.types ?? [])
			.filter((type) => !['point_of_interest', 'establishment', 'food'].includes(type))
			.map(titleCase)
			.slice(0, 12)
			.join(', ');

		return json({
			name: place.displayName?.text?.trim() || name,
			description: place.editorialSummary?.text?.trim() ?? '',
			establishmentTypes: [establishment],
			cuisines,
			mealTypes,
			tags,
			rating: place.rating ? String(Math.min(5, Math.max(1, Math.round(place.rating)))) : '',
			price: priceMap[place.priceLevel ?? ''] ?? '',
			country: component(place, 'country'),
			province: component(place, 'administrative_area_level_1'),
			city: component(place, 'locality', 'administrative_area_level_2'),
			neighborhood: component(place, 'neighborhood', 'sublocality_level_1', 'sublocality'),
			address,
			phone: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || '',
			website: place.websiteUri?.trim() ?? '',
			googleUrl: place.googleMapsUri?.trim() ?? '',
			mapUrl: place.googleMapsUri?.trim() ?? '',
			hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? '',
			delivery: Boolean(place.delivery),
			takeAway: Boolean(place.takeout),
			reservations: Boolean(place.reservable),
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'No se pudo buscar el lugar en Google' }, 500);
	}
};
