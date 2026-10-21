export {};

type PlaceSummary = {
	id: string;
	name: string;
	establishmentType?: string;
	establishmentTypes?: string[];
	cuisine?: string;
	cuisines?: string[];
	mealTypes?: string[];
	neighborhood?: string;
	city?: string;
	address?: string;
	favorite?: boolean;
	visited?: boolean;
	checked?: boolean;
	glutenFree?: boolean;
	delivery?: boolean;
	takeAway?: boolean;
	createdAt?: string;
};

type PlaceMedia = { restaurantId: string; kind: 'image' | 'logo'; order: number; url: string };
type SectionKey = 'favorites' | 'visited' | 'to-visit';

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

const lists: Record<SectionKey, HTMLElement> = {
	favorites: document.querySelector<HTMLElement>('#list-favorites')!,
	visited: document.querySelector<HTMLElement>('#list-visited')!,
	'to-visit': document.querySelector<HTMLElement>('#list-to-visit')!,
};
const searchInput = document.querySelector<HTMLInputElement>('#search')!;
const pasteSearchButton = document.querySelector<HTMLButtonElement>('#paste-search')!;
const clearSearchButton = document.querySelector<HTMLButtonElement>('#clear-search')!;
const placeTypeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-place-type]')];
const scopeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-search-scope]')];
const viewButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-directory-view]')];
const sortButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-directory-sort-key]')];
const viewIcon = document.querySelector<SVGElement>('#directory-view-icon')!;
const filterMenu = document.querySelector<HTMLDetailsElement>('.filter-action-menu')!;
const filterPanel = document.querySelector<HTMLElement>('#directory-filter-panel')!;
const glutenFreeButton = document.querySelector<HTMLButtonElement>('#gluten-free-filter')!;
const deliveryButton = document.querySelector<HTMLButtonElement>('#delivery-filter')!;
const takeAwayButton = document.querySelector<HTMLButtonElement>('#take-away-filter')!;
const clearFiltersButton = document.querySelector<HTMLButtonElement>('#clear-directory-filters')!;

type MultiFilterKey = 'establishment' | 'meal' | 'cuisine' | 'city' | 'neighborhood';
const multiFilters: Record<MultiFilterKey, { selected: Set<string>; empty: string }> = {
	establishment: { selected: new Set(), empty: 'Todas las categorías' },
	meal: { selected: new Set(), empty: 'Todos los servicios' },
	cuisine: { selected: new Set(), empty: 'Todos los tipos de cocina' },
	city: { selected: new Set(), empty: 'Todas las ciudades' },
	neighborhood: { selected: new Set(), empty: 'Todas las zonas' },
};

const VIEW_KEY = 'restobox-perfil-view';
const VIEWS = new Set(['columns-5', 'columns-6', 'small-icons', 'detail', 'list']);
let places: PlaceSummary[] = [];
let imageByPlace = new Map<string, string>();
let loaded = false;
let searchText = '';
let placeType: 'all' | 'restaurant' | 'cafe' = 'all';
let searchScope: 'name' | 'category' | 'zone' = 'name';
let sortKey: 'date' | 'name' | 'zone' = 'name';
let sortAscending = true;
let glutenFreeOnly = false;
let deliveryOnly = false;
let takeAwayOnly = false;
let view = 'detail';
try {
	const stored = localStorage.getItem(VIEW_KEY);
	if (stored && VIEWS.has(stored)) view = stored;
} catch { /* sin almacenamiento */ }

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}

function normalize(value: string) {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').trim();
}

function categoriesOf(place: PlaceSummary) {
	const types = place.establishmentTypes?.length ? place.establishmentTypes : [place.establishmentType ?? ''];
	return types.filter(Boolean);
}

function cuisinesOf(place: PlaceSummary) {
	const types = place.cuisines?.length ? place.cuisines : [place.cuisine ?? ''];
	return types.filter(Boolean);
}

function matchesFilters(place: PlaceSummary) {
	const categories = categoriesOf(place);
	if (placeType !== 'all') {
		const normalized = categories.map(normalize);
		if (!normalized.some((value) => placeType === 'restaurant' ? value.startsWith('restaur') : value.startsWith('cafe'))) return false;
	}
	const term = normalize(searchText);
	if (term) {
		const values = searchScope === 'category' ? categories : searchScope === 'zone' ? [place.neighborhood ?? ''] : [place.name];
		if (!values.some((value) => normalize(value).includes(term))) return false;
	}
	const anyOf = (selected: Set<string>, values: string[]) => !selected.size || values.some((value) => selected.has(value));
	if (!anyOf(multiFilters.establishment.selected, categories)) return false;
	if (!anyOf(multiFilters.meal.selected, place.mealTypes ?? [])) return false;
	if (!anyOf(multiFilters.cuisine.selected, cuisinesOf(place))) return false;
	if (!anyOf(multiFilters.city.selected, place.city ? [place.city] : [])) return false;
	if (!anyOf(multiFilters.neighborhood.selected, place.neighborhood ? [place.neighborhood] : [])) return false;
	if (glutenFreeOnly && !place.glutenFree) return false;
	if (deliveryOnly && !place.delivery) return false;
	if (takeAwayOnly && !place.takeAway) return false;
	return true;
}

function compare(a: PlaceSummary, b: PlaceSummary) {
	const byName = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
	let result = 0;
	if (sortKey === 'date') result = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
	else if (sortKey === 'zone') result = (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '', 'es', { sensitivity: 'base' }) || byName;
	else result = byName;
	return sortAscending ? result : -result;
}

function placeTile(place: PlaceSummary) {
	const imageUrl = imageByPlace.get(place.id);
	const image = imageUrl
		? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />`
		: `<span>${escapeHtml(place.name.charAt(0).toLocaleUpperCase('es'))}</span>`;
	const category = categoriesOf(place).join(', ');
	const cuisine = cuisinesOf(place).join(', ');
	const location = [place.address ?? '', place.neighborhood ?? ''].filter(Boolean).join(' · ');
	const lines = [
		category,
		view === 'detail' || view === 'columns-5' ? cuisine : '',
		view === 'small-icons' || view === 'list' ? '' : (view === 'detail' ? location : place.neighborhood ?? ''),
	].filter(Boolean);
	return `<a class="my-place-tile" href="/?lugar=${encodeURIComponent(place.id)}">
		<span class="my-place-image">${image}</span>
		<span class="my-place-text"><strong>${escapeHtml(place.name)}</strong>${lines.map((line) => `<small>${escapeHtml(line)}</small>`).join('')}</span>
	</a>`;
}

function isFiltering() {
	return Boolean(normalize(searchText)) || placeType !== 'all' || glutenFreeOnly || deliveryOnly || takeAwayOnly
		|| Object.values(multiFilters).some((filter) => filter.selected.size > 0);
}

function renderPlaces() {
	if (!loaded) return;
	const groups: Record<SectionKey, PlaceSummary[]> = {
		favorites: places.filter((place) => place.favorite),
		visited: places.filter((place) => place.visited),
		'to-visit': places.filter((place) => place.checked),
	};
	(Object.keys(lists) as SectionKey[]).forEach((key) => {
		const matching = groups[key].filter(matchesFilters).sort(compare);
		lists[key].className = `my-places-grid view-${view}`;
		lists[key].innerHTML = matching.length
			? matching.map(placeTile).join('')
			: `<p class="my-places-empty">${escapeHtml(isFiltering() && groups[key].length ? 'Ningún lugar coincide con la búsqueda.' : lists[key].dataset.empty ?? 'Sin lugares')}</p>`;
		const counter = document.querySelector<HTMLElement>(`#count-${key}`);
		if (counter) counter.textContent = String(matching.length);
	});
}

function renderFilterOptions() {
	const sources: Record<MultiFilterKey, string[]> = {
		establishment: places.flatMap(categoriesOf),
		meal: places.flatMap((place) => place.mealTypes ?? []),
		cuisine: places.flatMap(cuisinesOf),
		city: places.map((place) => place.city ?? ''),
		neighborhood: places.map((place) => place.neighborhood ?? ''),
	};
	(Object.keys(multiFilters) as MultiFilterKey[]).forEach((key) => {
		const values = [...new Set(sources[key].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
		const container = document.querySelector<HTMLElement>(`#${key}-filter-options`)!;
		container.innerHTML = values.length
			? values.map((value) => `<label><input type="checkbox" value="${escapeHtml(value)}" data-multi-filter="${key}" />${escapeHtml(value)}</label>`).join('')
			: '<p class="neighborhood-menu-empty">Sin opciones</p>';
	});
}

function updateFilterLabels() {
	(Object.keys(multiFilters) as MultiFilterKey[]).forEach((key) => {
		const { selected, empty } = multiFilters[key];
		document.querySelector<HTMLElement>(`#${key}-filter-label`)!.textContent = selected.size === 0 ? empty : selected.size === 1 ? [...selected][0] : `${selected.size} seleccionados`;
	});
	glutenFreeButton.setAttribute('aria-pressed', String(glutenFreeOnly));
	deliveryButton.setAttribute('aria-pressed', String(deliveryOnly));
	takeAwayButton.setAttribute('aria-pressed', String(takeAwayOnly));
}

function updateControlStates() {
	placeTypeButtons.forEach((button) => {
		const active = button.dataset.placeType === placeType;
		button.classList.toggle('active', active);
		button.setAttribute('aria-checked', String(active));
	});
	scopeButtons.forEach((button) => {
		const active = button.dataset.searchScope === searchScope;
		button.classList.toggle('active', active);
		button.setAttribute('aria-checked', String(active));
	});
	viewButtons.forEach((button) => {
		const active = button.dataset.directoryView === view;
		button.classList.toggle('active', active);
		button.setAttribute('aria-pressed', String(active));
		if (active) {
			const icon = button.querySelector('svg');
			if (icon) viewIcon.innerHTML = icon.innerHTML;
		}
	});
	sortButtons.forEach((button) => {
		const active = button.dataset.directorySortKey === sortKey;
		button.classList.toggle('active', active);
		button.classList.toggle('descending', active && !sortAscending);
		button.setAttribute('aria-pressed', String(active));
	});
	clearSearchButton.hidden = !searchText;
	updateFilterLabels();
}

function refresh() {
	updateControlStates();
	renderPlaces();
}

searchInput.addEventListener('input', () => {
	searchText = searchInput.value;
	refresh();
});
pasteSearchButton.addEventListener('click', async () => {
	try {
		searchText = (await navigator.clipboard.readText()).trim().slice(0, 100);
		searchInput.value = searchText;
		refresh();
	} catch { searchInput.focus(); }
});
clearSearchButton.addEventListener('click', () => {
	searchText = '';
	searchInput.value = '';
	refresh();
	searchInput.focus();
});
placeTypeButtons.forEach((button) => button.addEventListener('click', () => {
	placeType = (button.dataset.placeType as typeof placeType) || 'all';
	refresh();
}));
scopeButtons.forEach((button) => button.addEventListener('click', () => {
	searchScope = (button.dataset.searchScope as typeof searchScope) || 'name';
	refresh();
}));
viewButtons.forEach((button) => button.addEventListener('click', () => {
	view = button.dataset.directoryView && VIEWS.has(button.dataset.directoryView) ? button.dataset.directoryView : 'detail';
	try { localStorage.setItem(VIEW_KEY, view); } catch { /* sin almacenamiento */ }
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	refresh();
}));
sortButtons.forEach((button) => button.addEventListener('click', () => {
	const key = (button.dataset.directorySortKey as typeof sortKey) || 'name';
	if (key === sortKey) sortAscending = !sortAscending;
	else { sortKey = key; sortAscending = key !== 'date'; }
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	refresh();
}));
filterMenu.addEventListener('toggle', () => {
	filterPanel.hidden = !filterMenu.open;
	if (!filterMenu.open) filterPanel.querySelectorAll<HTMLDetailsElement>('.filter-multiselect[open]').forEach((menu) => menu.removeAttribute('open'));
});
filterPanel.addEventListener('change', (event) => {
	const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-multi-filter]');
	if (!input) return;
	const selected = multiFilters[input.dataset.multiFilter as MultiFilterKey].selected;
	if (input.checked) selected.add(input.value);
	else selected.delete(input.value);
	refresh();
});
glutenFreeButton.addEventListener('click', () => { glutenFreeOnly = !glutenFreeOnly; refresh(); });
deliveryButton.addEventListener('click', () => { deliveryOnly = !deliveryOnly; refresh(); });
takeAwayButton.addEventListener('click', () => { takeAwayOnly = !takeAwayOnly; refresh(); });
clearFiltersButton.addEventListener('click', () => {
	Object.values(multiFilters).forEach((filter) => filter.selected.clear());
	glutenFreeOnly = false;
	deliveryOnly = false;
	takeAwayOnly = false;
	filterPanel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { input.checked = false; });
	refresh();
});
document.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	document.querySelectorAll<HTMLDetailsElement>('.directory-action-menu[open]:not(.filter-action-menu)').forEach((menu) => {
		if (!menu.contains(target)) menu.removeAttribute('open');
	});
});

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
	try {
		const [{ restaurants }, { media }] = await Promise.all([
			fetchJson<{ restaurants: PlaceSummary[] }>('/api/restaurants'),
			fetchJson<{ media: PlaceMedia[] }>('/api/media'),
		]);
		places = restaurants;
		imageByPlace = new Map<string, string>();
		media.filter((item) => item.kind === 'logo').forEach((item) => imageByPlace.set(item.restaurantId, item.url));
		[...media].filter((item) => item.kind === 'image').sort((a, b) => a.order - b.order).forEach((item) => {
			if (!imageByPlace.has(item.restaurantId)) imageByPlace.set(item.restaurantId, item.url);
		});
		loaded = true;
		renderFilterOptions();
		refresh();
	} catch (error) {
		Object.values(lists).forEach((container) => {
			container.innerHTML = `<p class="my-places-empty">${escapeHtml(error instanceof Error ? error.message : 'No se pudo cargar la información')}</p>`;
		});
	}
}

updateControlStates();
void loadPlaces();
