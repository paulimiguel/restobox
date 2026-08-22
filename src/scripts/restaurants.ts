type Restaurant = {
	id: string;
	name: string;
	description: string;
	establishmentType: string;
	establishmentTypes?: string[];
	cuisine: string;
	cuisines?: string[];
	tags: string;
	rating: string;
	mealTypes: string[];
	price: string;
	averagePrice: string;
	score: string;
	country: string;
	province: string;
	city: string;
	address: string;
	neighborhood: string;
	hasBranches?: boolean;
	branchAddresses?: string[];
	phone: string;
	mobile: string;
	website: string;
	googleUrl: string;
	linktreeUrl: string;
	menuUrl: string;
	tiktokUrl: string;
	instagramUrl: string;
	facebookUrl: string;
	wokiUrl: string;
	tripAdvisorUrl: string;
	mapUrl: string;
	hours: string;
	notes: string;
	favorite?: boolean;
	visited?: boolean;
	checked?: boolean;
	delivery?: boolean;
	takeAway?: boolean;
	glutenFree?: boolean;
	imageCount: number;
	createdAt: string;
};

type StoredImage = {
	id: string;
	restaurantId: string;
	blob: Blob;
	order?: number;
};

type RestaurantImage = StoredImage & { isNew: boolean };

type ServerMedia = {
	id: string;
	restaurantId: string;
	kind: 'image' | 'logo';
	order: number;
	mimeType: string;
	size: number;
	url: string;
};

type ImportedRestaurant = Partial<Omit<Restaurant, 'id' | 'createdAt' | 'imageCount' | 'mealTypes'>> & {
	establishmentTypes?: string[];
	cuisines?: string[];
	logo?: string;
	images?: string[];
	sourceUrl?: string;
	collectionUrls?: string[];
};

type SpreadsheetRestaurant = {
	name: string;
	description: string;
	establishmentTypes: string[];
	cuisines: string[];
	tags: string;
	rating: string;
	mealTypes: string[];
	price: string;
	averagePrice: string;
	score: string;
	country: string;
	province: string;
	city: string;
	address: string;
	neighborhood: string;
	phone: string;
	mobile: string;
	website: string;
	googleUrl: string;
	linktreeUrl: string;
	menuUrl: string;
	tiktokUrl: string;
	instagramUrl: string;
	facebookUrl: string;
	wokiUrl: string;
	tripAdvisorUrl: string;
	mapUrl: string;
	hours: string;
	notes: string;
	favorite: boolean;
	visited: boolean;
	delivery: boolean;
	takeAway: boolean;
	glutenFree: boolean;
};

type SpreadsheetPreviewRow = { rowNumber: number; data: SpreadsheetRestaurant; error: string };

const STORAGE_KEY = 'restobox-restaurants-v1';
const BACKUP_KEY = 'restobox-restaurants-backups-v1';
const CUISINES_KEY = 'restobox-cuisines-v1';
const REMOVED_CUISINES_KEY = 'restobox-removed-cuisines-v1';
const TAGS_KEY = 'restobox-tags-v1';
const REMOVED_TAGS_KEY = 'restobox-removed-tags-v1';
const ESTABLISHMENTS_KEY = 'restobox-establishments-v1';
const REMOVED_ESTABLISHMENTS_KEY = 'restobox-removed-establishments-v1';
const SERVICES_KEY = 'restobox-services-v1';
const REMOVED_SERVICES_KEY = 'restobox-removed-services-v1';
const NEIGHBORHOODS_KEY = 'restobox-neighborhoods-v1';
const REMOVED_NEIGHBORHOODS_KEY = 'restobox-removed-neighborhoods-v1';
const CITIES_KEY = 'restobox-cities-v1';
const REMOVED_CITIES_KEY = 'restobox-removed-cities-v1';
const PROVINCES_KEY = 'restobox-provinces-v1';
const REMOVED_PROVINCES_KEY = 'restobox-removed-provinces-v1';
const COUNTRIES_KEY = 'restobox-countries-v1';
const REMOVED_COUNTRIES_KEY = 'restobox-removed-countries-v1';
const SERVER_MIGRATION_KEY = 'restobox-server-migration-v1';
const DEFAULT_CUISINES = ['Comida rápida', 'Café', 'Pastas', 'Parrilla', 'Pizzas', 'Sushi'];
const DEFAULT_ESTABLISHMENTS = ['Restaurante', 'Café', 'Bar', 'Pub'];
const DEFAULT_SERVICES = ['Desayuno', 'Brunch', 'Almuerzo', 'Merienda', 'Cena', 'Poscena'];
const DEFAULT_CITY = 'Mar del Plata';
const DEFAULT_PROVINCE = 'Buenos Aires';
const DEFAULT_COUNTRY = 'Argentina';
const MAX_IMAGES = 12;
const dialog = document.querySelector<HTMLDialogElement>('#restaurant-dialog')!;
const form = document.querySelector<HTMLFormElement>('#restaurant-form')!;
const list = document.querySelector<HTMLDivElement>('#restaurant-list')!;
const emptyState = document.querySelector<HTMLDivElement>('#empty-state')!;
const search = document.querySelector<HTMLInputElement>('#search')!;
const searchTermsRow = document.querySelector<HTMLElement>('#search-terms-row')!;
const searchTermsList = document.querySelector<HTMLElement>('#search-terms')!;
const clearSearchTermsButton = document.querySelector<HTMLButtonElement>('#clear-search-terms')!;
const searchScopeInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="searchScope"]')];
const establishmentFilterOptions = document.querySelector<HTMLDivElement>('#establishment-filter-options')!;
const mealFilterOptions = document.querySelector<HTMLDivElement>('#meal-filter-options')!;
const cuisineFilterOptions = document.querySelector<HTMLDivElement>('#cuisine-filter-options')!;
const neighborhoodFilterOptions = document.querySelector<HTMLDivElement>('#neighborhood-filter-options')!;
const cityFilterOptions = document.querySelector<HTMLDivElement>('#city-filter-options')!;
const establishmentFilterLabel = document.querySelector<HTMLElement>('#establishment-filter-label')!;
const mealFilterLabel = document.querySelector<HTMLElement>('#meal-filter-label')!;
const cuisineFilterLabel = document.querySelector<HTMLElement>('#cuisine-filter-label')!;
const neighborhoodFilterLabel = document.querySelector<HTMLElement>('#neighborhood-filter-label')!;
const cityFilterLabel = document.querySelector<HTMLElement>('#city-filter-label')!;
const establishmentFilterChips = document.querySelector<HTMLDivElement>('#establishment-filter-chips')!;
const mealFilterChips = document.querySelector<HTMLDivElement>('#meal-filter-chips')!;
const cuisineFilterChips = document.querySelector<HTMLDivElement>('#cuisine-filter-chips')!;
const neighborhoodFilterChips = document.querySelector<HTMLDivElement>('#neighborhood-filter-chips')!;
const cityFilterChips = document.querySelector<HTMLDivElement>('#city-filter-chips')!;
const favoriteFilterButton = document.querySelector<HTMLButtonElement>('#favorite-filter')!;
const visitedFilterButton = document.querySelector<HTMLButtonElement>('#visited-filter')!;
const clearDirectoryFiltersButton = document.querySelector<HTMLButtonElement>('#clear-directory-filters')!;
const filterActionMenu = document.querySelector<HTMLDetailsElement>('.filter-action-menu')!;
const directoryFilterPanel = document.querySelector<HTMLElement>('#directory-filter-panel')!;
const printPlacesPanel = document.querySelector<HTMLElement>('#print-places-panel')!;
const selectVisiblePlacesButton = document.querySelector<HTMLButtonElement>('#select-visible-places')!;
const selectAllPlacesButton = document.querySelector<HTMLButtonElement>('#select-all-places')!;
const clearPrintSelectionButton = document.querySelector<HTMLButtonElement>('#clear-print-selection')!;
const closePrintPanelButton = document.querySelector<HTMLButtonElement>('#close-print-panel')!;
const editPlacesPanel = document.querySelector<HTMLElement>('#edit-places-panel')!;
const editSelectVisibleButton = document.querySelector<HTMLButtonElement>('#edit-select-visible')!;
const editSelectAllButton = document.querySelector<HTMLButtonElement>('#edit-select-all')!;
const editClearSelectionButton = document.querySelector<HTMLButtonElement>('#edit-clear-selection')!;
const editSelectedPlacesButton = document.querySelector<HTMLButtonElement>('#edit-selected-places')!;
const closeEditPanelButton = document.querySelector<HTMLButtonElement>('#close-edit-panel')!;
const deletePlacesPanel = document.querySelector<HTMLElement>('#delete-places-panel')!;
const deleteSelectVisibleButton = document.querySelector<HTMLButtonElement>('#delete-select-visible')!;
const deleteSelectAllButton = document.querySelector<HTMLButtonElement>('#delete-select-all')!;
const deleteClearSelectionButton = document.querySelector<HTMLButtonElement>('#delete-clear-selection')!;
const deleteSelectedPlacesButton = document.querySelector<HTMLButtonElement>('#delete-selected-places')!;
const closeDeletePanelButton = document.querySelector<HTMLButtonElement>('#close-delete-panel')!;
const headerEstablishmentOptions = document.querySelector<HTMLDivElement>('#header-establishment-options')!;
const headerServiceOptions = document.querySelector<HTMLDivElement>('#header-service-options')!;
const headerCuisineOptions = document.querySelector<HTMLDivElement>('#header-cuisine-options')!;
const toolbarImportUrl = document.querySelector<HTMLButtonElement>('#toolbar-import-url')!;
const openExcelImportButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-open-excel-import]')];
const cuisineSelect = document.querySelector<HTMLInputElement>('#cuisine')!;
const cuisineCombobox = document.querySelector<HTMLDivElement>('#cuisine-combobox')!;
const cuisineOptions = document.querySelector<HTMLDivElement>('#cuisine-options')!;
const neighborhoodInput = document.querySelector<HTMLInputElement>('#neighborhood')!;
const neighborhoodCombobox = document.querySelector<HTMLDivElement>('#neighborhood-combobox')!;
const neighborhoodOptions = document.querySelector<HTMLDivElement>('#neighborhood-options')!;
const cityInput = document.querySelector<HTMLInputElement>('#city')!;
const cityCombobox = document.querySelector<HTMLDivElement>('#city-combobox')!;
const cityOptions = document.querySelector<HTMLDivElement>('#city-options')!;
const provinceInput = document.querySelector<HTMLInputElement>('#province')!;
const provinceCombobox = document.querySelector<HTMLDivElement>('#province-combobox')!;
const provinceOptions = document.querySelector<HTMLDivElement>('#province-options')!;
const countryCombobox = document.querySelector<HTMLDivElement>('#country-combobox')!;
const countryOptions = document.querySelector<HTMLDivElement>('#country-options')!;
const selectedCuisinesContainer = document.querySelector<HTMLDivElement>('#selected-cuisines')!;
const tagInput = document.querySelector<HTMLInputElement>('#tag-input')!;
const tagCombobox = document.querySelector<HTMLDivElement>('#tag-combobox')!;
const tagOptions = document.querySelector<HTMLDivElement>('#tag-options')!;
const manageTagsButton = document.querySelector<HTMLButtonElement>('#manage-tags')!;
const selectedTagsContainer = document.querySelector<HTMLDivElement>('#selected-tags')!;
const manageCuisinesButton = document.querySelector<HTMLButtonElement>('#manage-cuisines')!;
const manageCuisinesDialog = document.querySelector<HTMLDialogElement>('#manage-cuisines-dialog')!;
const cuisineOptionsList = document.querySelector<HTMLDivElement>('#cuisine-options-list')!;
const closeManageCuisines = document.querySelector<HTMLButtonElement>('#close-manage-cuisines')!;
const establishmentSelect = document.querySelector<HTMLInputElement>('#establishment-type')!;
const establishmentCombobox = document.querySelector<HTMLDivElement>('#establishment-combobox')!;
const establishmentOptions = document.querySelector<HTMLDivElement>('#establishment-options')!;
const selectedEstablishmentsContainer = document.querySelector<HTMLDivElement>('#selected-establishments')!;
const serviceSelect = document.querySelector<HTMLInputElement>('#service-type')!;
const serviceCombobox = document.querySelector<HTMLDivElement>('#service-combobox')!;
const serviceOptions = document.querySelector<HTMLDivElement>('#service-options')!;
const selectedServicesContainer = document.querySelector<HTMLDivElement>('#selected-services')!;
const averagePriceOptions = document.querySelector<HTMLDataListElement>('#average-price-options')!;
const logoInput = document.querySelector<HTMLInputElement>('#restaurant-logo')!;
const logoDropZone = document.querySelector<HTMLDivElement>('#logo-drop-zone')!;
const logoPreview = document.querySelector<HTMLDivElement>('#logo-preview')!;
const logoDropText = document.querySelector<HTMLElement>('#logo-drop-text')!;
const removeLogoButton = document.querySelector<HTMLButtonElement>('#remove-logo')!;
const imageInput = document.querySelector<HTMLInputElement>('#restaurant-images')!;
const imageDropZone = document.querySelector<HTMLDivElement>('#image-drop-zone')!;
const imageDropText = document.querySelector<HTMLElement>('#image-drop-text')!;
const imagePreviews = document.querySelector<HTMLDivElement>('#image-previews')!;
const imagesPanel = document.querySelector<HTMLElement>('#panel-images')!;
const imageHelp = document.querySelector<HTMLElement>('.image-field label small')!;
const primaryImagePreview = document.querySelector<HTMLDivElement>('#primary-image-preview')!;
const linktreeInput = document.querySelector<HTMLInputElement>('#linktree-url')!;
const menuUrlInput = document.querySelector<HTMLInputElement>('#menu-url')!;
const websiteInput = document.querySelector<HTMLInputElement>('#website-url')!;
const googleInput = document.querySelector<HTMLInputElement>('#google-url')!;
const mapUrlInput = document.querySelector<HTMLInputElement>('#map-url')!;
const mapUrlField = document.querySelector<HTMLDivElement>('#map-url-field')!;
const mapFieldGeneralAnchor = document.querySelector<HTMLDivElement>('#map-field-general-anchor')!;
const mapFieldLinksAnchor = document.querySelector<HTMLDivElement>('#map-field-links-anchor')!;
const viewMapLinkField = document.querySelector<HTMLDivElement>('#view-map-link-field')!;
const viewOpenMap = document.querySelector<HTMLAnchorElement>('#view-open-map')!;
const mapPreview = document.querySelector<HTMLDivElement>('#map-preview')!;
const mapPreviewFrame = document.querySelector<HTMLIFrameElement>('#map-preview-frame')!;
const instagramInput = document.querySelector<HTMLInputElement>('#instagram-url')!;
const tiktokInput = document.querySelector<HTMLInputElement>('#tiktok-url')!;
const facebookInput = document.querySelector<HTMLInputElement>('#facebook-url')!;
const wokiInput = document.querySelector<HTMLInputElement>('#woki-url')!;
const tripAdvisorInput = document.querySelector<HTMLInputElement>('#tripadvisor-url')!;
const whatsappInput = document.querySelector<HTMLInputElement>('#whatsapp-number')!;
const countryInput = form.elements.namedItem('country') as HTMLInputElement;
const openLinktree = document.querySelector<HTMLAnchorElement>('#open-linktree')!;
const openMenuLink = document.querySelector<HTMLAnchorElement>('#open-menu-link')!;
const openWebsite = document.querySelector<HTMLAnchorElement>('#open-website')!;
const openGoogle = document.querySelector<HTMLAnchorElement>('#open-google')!;
const openMap = document.querySelector<HTMLAnchorElement>('#open-map')!;
const openInstagram = document.querySelector<HTMLAnchorElement>('#open-instagram')!;
const openTiktok = document.querySelector<HTMLAnchorElement>('#open-tiktok')!;
const openFacebook = document.querySelector<HTMLAnchorElement>('#open-facebook')!;
const openWoki = document.querySelector<HTMLAnchorElement>('#open-woki')!;
const openTripAdvisor = document.querySelector<HTMLAnchorElement>('#open-tripadvisor')!;
const openWhatsAppWeb = document.querySelector<HTMLAnchorElement>('#open-whatsapp-web')!;
const viewFavoriteStatus = document.querySelector<HTMLElement>('#view-favorite-status')!;
const viewVisitedStatus = document.querySelector<HTMLElement>('#view-visited-status')!;
const viewCheckedStatus = document.querySelector<HTMLElement>('#view-checked-status')!;
const formTabs = document.querySelectorAll<HTMLButtonElement>('[data-form-tab]');
const tabPanels = document.querySelectorAll<HTMLElement>('[data-tab-panel]');
const dialogTitle = document.querySelector<HTMLHeadingElement>('#dialog-title')!;
const dialogRecordName = document.querySelector<HTMLElement>('#dialog-record-name')!;
const viewEditButton = document.querySelector<HTMLButtonElement>('#view-edit-button')!;
const restaurantRecordNavigation = document.querySelector<HTMLElement>('#restaurant-record-navigation')!;
const previousRestaurantButton = document.querySelector<HTMLButtonElement>('#previous-restaurant')!;
const nextRestaurantButton = document.querySelector<HTMLButtonElement>('#next-restaurant')!;
const pasteTextButton = document.querySelector<HTMLButtonElement>('#paste-text')!;
const closeFormButton = document.querySelector<HTMLButtonElement>('#close-form-button')!;
const updateDataButton = document.querySelector<HTMLButtonElement>('#update-data')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;
const pasteScheduleHoursButton = document.querySelector<HTMLButtonElement>('#paste-schedule-hours')!;
const clearScheduleHoursButton = document.querySelector<HTMLButtonElement>('#clear-schedule-hours')!;
const openUrlImportButton = document.querySelector<HTMLButtonElement>('#open-url-import')!;
const urlImportDialog = document.querySelector<HTMLDialogElement>('#url-import-dialog')!;
const urlImportForm = document.querySelector<HTMLFormElement>('#url-import-form')!;
const restaurantSourceUrl = document.querySelector<HTMLTextAreaElement>('#restaurant-source-url')!;
const clearUrlImport = document.querySelector<HTMLButtonElement>('#clear-url-import')!;
const pasteUrlImport = document.querySelector<HTMLButtonElement>('#paste-url-import')!;
const cancelUrlImport = document.querySelector<HTMLButtonElement>('#cancel-url-import')!;
const importUrlButton = document.querySelector<HTMLButtonElement>('#import-url-button')!;
const finishUrlImport = document.querySelector<HTMLButtonElement>('#finish-url-import')!;
const urlImportProgress = document.querySelector<HTMLDivElement>('#url-import-progress')!;
const nameImportDialog = document.querySelector<HTMLDialogElement>('#name-import-dialog')!;
const nameImportForm = document.querySelector<HTMLFormElement>('#name-import-form')!;
const placeSearchName = document.querySelector<HTMLInputElement>('#place-search-name')!;
const nameImportProgress = document.querySelector<HTMLDivElement>('#name-import-progress')!;
const cancelNameImport = document.querySelector<HTMLButtonElement>('#cancel-name-import')!;
const searchNameImport = document.querySelector<HTMLButtonElement>('#search-name-import')!;
const excelImportDialog = document.querySelector<HTMLDialogElement>('#excel-import-dialog')!;
const excelImportForm = document.querySelector<HTMLFormElement>('#excel-import-form')!;
const excelImportFile = document.querySelector<HTMLInputElement>('#excel-import-file')!;
const excelImportProgress = document.querySelector<HTMLDivElement>('#excel-import-progress')!;
const excelImportPreview = document.querySelector<HTMLDivElement>('#excel-import-preview')!;
const excelImportSummary = document.querySelector<HTMLElement>('#excel-import-summary')!;
const excelImportPreviewBody = document.querySelector<HTMLTableSectionElement>('#excel-import-preview-body')!;
const cancelExcelImport = document.querySelector<HTMLButtonElement>('#cancel-excel-import')!;
const importExcelButton = document.querySelector<HTMLButtonElement>('#import-excel-button')!;
const deletePlaceDialog = document.querySelector<HTMLDialogElement>('#delete-place-dialog')!;
const deletePlaceMessage = document.querySelector<HTMLParagraphElement>('#delete-place-message')!;
const bulkEditDialog = document.querySelector<HTMLDialogElement>('#bulk-edit-dialog')!;
const bulkEditForm = document.querySelector<HTMLFormElement>('#bulk-edit-form')!;
const bulkEditCount = document.querySelector<HTMLElement>('#bulk-edit-count')!;
const cancelBulkEdit = document.querySelector<HTMLButtonElement>('#cancel-bulk-edit')!;
const hoursValue = document.querySelector<HTMLInputElement>('#hours-value')!;
const scheduleTable = document.querySelector<HTMLDivElement>('#schedule-table')!;
const scheduleInputs = [...document.querySelectorAll<HTMLInputElement>('.schedule-hours-input')];
const imageCarouselDialog = document.querySelector<HTMLDialogElement>('#image-carousel-dialog')!;
const imageCarouselImage = document.querySelector<HTMLImageElement>('#image-carousel-image')!;
const imageCarouselCounter = document.querySelector<HTMLElement>('#image-carousel-counter')!;
const previousCarouselImage = document.querySelector<HTMLButtonElement>('#previous-carousel-image')!;
const nextCarouselImage = document.querySelector<HTMLButtonElement>('#next-carousel-image')!;
const closeImageCarousel = document.querySelector<HTMLButtonElement>('#close-image-carousel')!;
let restaurants: Restaurant[] = loadRestaurants();
let directorySort = localStorage.getItem('restobox-directory-sort') || 'recent';
let directoryView = localStorage.getItem('restobox-directory-view') || 'columns-5';
if (directoryView === 'normal') directoryView = 'columns-5';
if (directoryView === 'compact') directoryView = 'columns-5';
if (['columns-1', 'columns-2', 'columns-3', 'columns-4'].includes(directoryView)) directoryView = 'columns-5';
let cuisines: string[] = loadCuisines();
let removedCuisines: string[] = loadRemovedCuisines();
let tagCatalog: string[] = loadTags();
let removedTags: string[] = loadRemovedTags();
let establishmentTypes: string[] = loadEstablishmentTypes();
let removedEstablishmentTypes: string[] = loadRemovedEstablishmentTypes();
let serviceTypes: string[] = loadServiceTypes();
let removedServiceTypes: string[] = loadRemovedServiceTypes();
let neighborhoods: string[] = loadNeighborhoods();
let removedNeighborhoods: string[] = loadRemovedNeighborhoods();
let cities: string[] = loadLocationOptions(CITIES_KEY, REMOVED_CITIES_KEY, 'city');
let removedCities: string[] = loadRemovedLocationOptions(REMOVED_CITIES_KEY);
let provinces: string[] = loadLocationOptions(PROVINCES_KEY, REMOVED_PROVINCES_KEY, 'province');
let removedProvinces: string[] = loadRemovedLocationOptions(REMOVED_PROVINCES_KEY);
let countries: string[] = loadLocationOptions(COUNTRIES_KEY, REMOVED_COUNTRIES_KEY, 'country');
let removedCountries: string[] = loadRemovedLocationOptions(REMOVED_COUNTRIES_KEY);
let restaurantImages: RestaurantImage[] = [];
let selectedEstablishmentFilters = new Set<string>();
let selectedMealFilters = new Set<string>();
let selectedCuisineFilters = new Set<string>();
let selectedNeighborhoodFilters = new Set<string>();
let selectedCityFilters = new Set<string>();
let favoriteFilterActive = false;
let visitedFilterActive = false;
let printSelectedIds = new Set<string>();
let selectionMode: 'print' | 'edit' | 'delete' | null = null;
let rangeSelectionAnchorId: string | null = null;
let visibleRestaurantIds: string[] = [];
let restaurantLogo: RestaurantImage | null = null;
let previewUrls: string[] = [];
let logoPreviewUrl = '';
let cardPreviewUrls: string[] = [];
let cardRenderVersion = 0;
let draggedImageIndex: number | null = null;
let draggedCuisineIndex: number | null = null;
let spreadsheetPreviewRows: SpreadsheetPreviewRow[] = [];
let imageInsertMode: 'append' | 'primary' = 'append';
let toastTimer: number | undefined;
let pasteTarget: HTMLInputElement | HTMLTextAreaElement | null = null;
let selectedCuisines: string[] = [];
let selectedTags: string[] = [];
let selectedEstablishments: string[] = [];
let selectedServices: string[] = [];
let searchTerms: string[] = [];
let searchScope: 'keyword' | 'name' = 'keyword';
let baselineFormState = '';
let baselineImageState = '';
let baselineLogoState = '';
let dirtyTrackingReady = false;
let imageBaselineReady = false;
let logoBaselineReady = false;
let carouselImageIndex = 0;
let carouselImageUrl = '';
let carouselUsesTemporaryImages = false;
let activeRestaurantId: string | null = null;
let serverPersistenceReady = false;
let persistedRestaurants = new Map<string, string>();
let persistenceQueue: Promise<boolean> = Promise.resolve(true);
let settingsQueue: Promise<void> = Promise.resolve();

function requireActiveSession(response: Response) {
	if (response.status !== 401) return response;
	const next = `${window.location.pathname}${window.location.search}`;
	window.location.assign(`/login?next=${encodeURIComponent(next)}`);
	throw new Error('La sesión venció. Volvé a ingresar para continuar');
}

function loadRestaurants(): Restaurant[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		const parsed = JSON.parse(stored) as Array<Restaurant & { email?: string }>;
		const cleaned = parsed.map(({ email: _email, ...restaurant }) => restaurant as Restaurant);
		return cleaned;
	} catch {
		return [];
	}
}

function saveRestaurants(): Promise<boolean> {
	if (!serverPersistenceReady) return Promise.resolve(true);
	const snapshot = structuredClone(restaurants);
	persistenceQueue = persistenceQueue.then(async () => {
		const current = new Map(snapshot.map((restaurant) => [restaurant.id, JSON.stringify(restaurant)]));
		const upserts = snapshot.filter((restaurant) => persistedRestaurants.get(restaurant.id) !== current.get(restaurant.id));
		const deletedIds = [...persistedRestaurants.keys()].filter((id) => !current.has(id));
		if (!upserts.length && !deletedIds.length) return true;
		const response = await fetch('/api/restaurants', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ upserts, deletedIds }),
		});
		requireActiveSession(response);
		if (!response.ok) {
			const result = await response.json().catch(() => ({})) as { error?: string };
			throw new Error(result.error || 'No se pudieron guardar los datos en el servidor');
		}
		persistedRestaurants = current;
		return true;
	}).catch((error) => {
		showToast(error instanceof Error ? error.message : 'No se pudieron guardar los datos');
		return false;
	});
	return persistenceQueue;
}

function backupRestaurants() {
	/* Las copias de seguridad se realizan ahora sobre SQLite en el servidor. */
}

function persistCatalogSettings() {
	if (!serverPersistenceReady) return;
	const value = {
		cuisines, removedCuisines,
		tags: tagCatalog, removedTags,
		establishmentTypes, removedEstablishmentTypes,
		serviceTypes, removedServiceTypes,
		neighborhoods, removedNeighborhoods,
		cities, removedCities,
		provinces, removedProvinces,
		countries, removedCountries,
	};
	settingsQueue = settingsQueue.then(async () => {
		const response = await fetch('/api/settings', {
			method: 'PUT', headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key: 'catalogs', value }),
		});
		requireActiveSession(response);
		if (!response.ok) throw new Error('No se pudieron guardar las listas');
	}).catch(() => showToast('No se pudieron guardar las listas en el servidor'));
}

function capitalizeFirstLetter(value: string) {
	const normalized = value.trim();
	return normalized ? `${normalized.charAt(0).toLocaleUpperCase('es')}${normalized.slice(1)}` : '';
}

function capitalizedCatalogValues(values: string[]) {
	const unique = new Map<string, string>();
	values.map(capitalizeFirstLetter).filter(Boolean).forEach((value) => {
		const key = value.toLocaleLowerCase('es');
		if (!unique.has(key)) unique.set(key, value);
	});
	return [...unique.values()];
}

function loadCuisines(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(CUISINES_KEY) ?? '[]') as string[];
		const removed = loadRemovedCuisines().map((item) => item.toLocaleLowerCase('es'));
		const used = restaurants.flatMap(getRestaurantCuisines);
		return capitalizedCatalogValues([...DEFAULT_CUISINES, ...stored, ...used])
			.filter((item) => !removed.includes(item.toLocaleLowerCase('es')));
	} catch {
		return [...DEFAULT_CUISINES];
	}
}

function loadRemovedCuisines(): string[] {
	try { return JSON.parse(localStorage.getItem(REMOVED_CUISINES_KEY) ?? '[]') as string[]; }
	catch { return []; }
}

function saveCuisineSettings() {
	persistCatalogSettings();
}

function restaurantTags(restaurant: Restaurant) {
	return restaurant.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
}

function loadTags(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(TAGS_KEY) ?? '[]') as string[];
		const removed = loadRemovedTags().map((item) => item.toLocaleLowerCase('es'));
		return capitalizedCatalogValues([...stored, ...restaurants.flatMap(restaurantTags)])
			.filter((item) => !removed.includes(item.toLocaleLowerCase('es')))
			.sort((a, b) => a.localeCompare(b, 'es'));
	} catch {
		return [];
	}
}

function loadRemovedTags(): string[] {
	try { return JSON.parse(localStorage.getItem(REMOVED_TAGS_KEY) ?? '[]') as string[]; }
	catch { return []; }
}

function saveTagSettings() {
	persistCatalogSettings();
}

function loadNeighborhoods(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(NEIGHBORHOODS_KEY) ?? '[]') as string[];
		const removed = loadRemovedNeighborhoods().map((item) => item.toLocaleLowerCase('es'));
		const used = restaurants.map((restaurant) => restaurant.neighborhood).filter((item): item is string => Boolean(item));
		return [...new Set([...stored, ...used])]
			.filter((item) => !removed.includes(item.toLocaleLowerCase('es')))
			.sort((a, b) => a.localeCompare(b, 'es'));
	} catch {
		return [];
	}
}

function loadRemovedNeighborhoods(): string[] {
	try { return JSON.parse(localStorage.getItem(REMOVED_NEIGHBORHOODS_KEY) ?? '[]') as string[]; }
	catch { return []; }
}

function saveNeighborhoodSettings() {
	persistCatalogSettings();
}

function ensureNeighborhoodOption(value?: string) {
	const neighborhood = value?.trim() ?? '';
	if (!neighborhood) return '';
	const existing = neighborhoods.find((item) => item.toLocaleLowerCase('es') === neighborhood.toLocaleLowerCase('es'));
	if (existing) return existing;
	const normalized = neighborhood.slice(0, 80);
	neighborhoods.push(normalized);
	neighborhoods.sort((a, b) => a.localeCompare(b, 'es'));
	removedNeighborhoods = removedNeighborhoods.filter((item) => item.toLocaleLowerCase('es') !== normalized.toLocaleLowerCase('es'));
	saveNeighborhoodSettings();
	return normalized;
}

type LocationOptionKind = 'city' | 'province' | 'country';

function loadRemovedLocationOptions(storageKey: string): string[] {
	try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]; }
	catch { return []; }
}

function loadLocationOptions(storageKey: string, removedStorageKey: string, field: LocationOptionKind): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[];
		const removed = loadRemovedLocationOptions(removedStorageKey).map((item) => item.toLocaleLowerCase('es'));
		const used = restaurants.map((restaurant) => restaurant[field]).filter((item): item is string => Boolean(item));
		return [...new Set([...stored, ...used])]
			.filter((item) => !removed.includes(item.toLocaleLowerCase('es')))
			.sort((a, b) => a.localeCompare(b, 'es'));
	} catch {
		return [];
	}
}

function getLocationOptionState(kind: LocationOptionKind) {
	if (kind === 'city') return { input: cityInput, combobox: cityCombobox, optionsElement: cityOptions, values: cities, removed: removedCities, storageKey: CITIES_KEY, removedStorageKey: REMOVED_CITIES_KEY, label: 'Ciudad' };
	if (kind === 'province') return { input: provinceInput, combobox: provinceCombobox, optionsElement: provinceOptions, values: provinces, removed: removedProvinces, storageKey: PROVINCES_KEY, removedStorageKey: REMOVED_PROVINCES_KEY, label: 'Provincia' };
	return { input: countryInput, combobox: countryCombobox, optionsElement: countryOptions, values: countries, removed: removedCountries, storageKey: COUNTRIES_KEY, removedStorageKey: REMOVED_COUNTRIES_KEY, label: 'País' };
}

function setLocationOptionState(kind: LocationOptionKind, values: string[], removed: string[]) {
	if (kind === 'city') { cities = values; removedCities = removed; }
	else if (kind === 'province') { provinces = values; removedProvinces = removed; }
	else { countries = values; removedCountries = removed; }
}

function saveLocationOptions(_kind: LocationOptionKind) {
	persistCatalogSettings();
}

function ensureLocationOption(kind: LocationOptionKind, value?: string) {
	const normalized = (value?.trim() ?? '').slice(0, 60);
	if (!normalized) return '';
	const state = getLocationOptionState(kind);
	const existing = state.values.find((item) => item.toLocaleLowerCase('es') === normalized.toLocaleLowerCase('es'));
	if (existing) return existing;
	const values = [...state.values, normalized].sort((a, b) => a.localeCompare(b, 'es'));
	const removed = state.removed.filter((item) => item.toLocaleLowerCase('es') !== normalized.toLocaleLowerCase('es'));
	setLocationOptionState(kind, values, removed);
	saveLocationOptions(kind);
	return normalized;
}

function loadEstablishmentTypes(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(ESTABLISHMENTS_KEY) ?? '[]') as string[];
		const removed = loadRemovedEstablishmentTypes().map((item) => item.toLocaleLowerCase('es'));
		const used = restaurants.flatMap(getRestaurantEstablishmentTypes);
		return capitalizedCatalogValues([...DEFAULT_ESTABLISHMENTS, ...stored, ...used])
			.filter((item) => !removed.includes(item.toLocaleLowerCase('es')))
			.sort((a, b) => a.localeCompare(b, 'es'));
	} catch {
		return [...DEFAULT_ESTABLISHMENTS];
	}
}

function loadRemovedEstablishmentTypes(): string[] {
	try { return JSON.parse(localStorage.getItem(REMOVED_ESTABLISHMENTS_KEY) ?? '[]') as string[]; }
	catch { return []; }
}

function saveEstablishmentSettings() {
	persistCatalogSettings();
}

function loadServiceTypes(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(SERVICES_KEY) ?? '[]') as string[];
		const removed = loadRemovedServiceTypes().map((item) => item.toLocaleLowerCase('es'));
		const used = restaurants.flatMap((restaurant) => restaurant.mealTypes ?? []);
		return [...new Set([...DEFAULT_SERVICES, ...stored, ...used])]
			.filter((item) => item !== 'Desayuno y merienda' && !removed.includes(item.toLocaleLowerCase('es')))
			.sort((a, b) => a.localeCompare(b, 'es'));
	} catch {
		return [...DEFAULT_SERVICES];
	}
}

function loadRemovedServiceTypes(): string[] {
	try { return JSON.parse(localStorage.getItem(REMOVED_SERVICES_KEY) ?? '[]') as string[]; }
	catch { return []; }
}

function saveServiceSettings() {
	persistCatalogSettings();
}

function safe(value = '') {
	const node = document.createElement('span');
	node.textContent = value;
	return node.innerHTML;
}

function normalizeWhatsAppNumber(phone = '', country = '') {
	let digits = phone.replace(/\D/g, '');
	if (!digits) return '';
	const isArgentina = country.toLocaleLowerCase('es').includes('argentina') || digits.startsWith('54');
	if (!isArgentina) return digits.replace(/^0+/, '');
	digits = digits.replace(/^0+/, '').replace(/^54/, '');
	if (digits.startsWith('9')) return `54${digits}`;
	digits = digits.replace(/^(\d{2,4})15(?=\d{6,8}$)/, '$1');
	return `549${digits}`;
}

function getWhatsAppUrl(phone = '', country = '') {
	const digits = normalizeWhatsAppNumber(phone, country);
	return digits ? `https://wa.me/${digits}` : '';
}

function getRestaurantCuisines(restaurant: Restaurant) {
	return capitalizedCatalogValues(restaurant.cuisines?.length ? restaurant.cuisines : restaurant.cuisine ? [restaurant.cuisine] : []);
}

function getRestaurantEstablishmentTypes(restaurant: Restaurant) {
	return capitalizedCatalogValues(restaurant.establishmentTypes?.length
		? restaurant.establishmentTypes
		: restaurant.establishmentType ? [restaurant.establishmentType] : []);
}

function renderAveragePriceOptions() {
	const values = new Map<string, string>();
	restaurants.map((restaurant) => restaurant.averagePrice?.trim()).filter(Boolean).forEach((value) => {
		const key = value.toLocaleLowerCase('es');
		if (!values.has(key)) values.set(key, value);
	});
	averagePriceOptions.innerHTML = [...values.values()]
		.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
		.map((value) => `<option value="${safe(value)}"></option>`).join('');
}

function updateDirectoryFilterLabels() {
	const summary = (values: Set<string>, emptyText: string) => {
		if (!values.size) return emptyText;
		if (values.size === 1) return [...values][0];
		return `${values.size} seleccionados`;
	};
	establishmentFilterLabel.textContent = summary(selectedEstablishmentFilters, 'Todos los lugares');
	mealFilterLabel.textContent = summary(selectedMealFilters, 'Todos los servicios');
	cuisineFilterLabel.textContent = summary(selectedCuisineFilters, 'Todos los tipos de cocina');
	neighborhoodFilterLabel.textContent = summary(selectedNeighborhoodFilters, 'Todos los barrios');
	cityFilterLabel.textContent = summary(selectedCityFilters, 'Todas las ciudades');
	const chips = (values: Set<string>, group: string) => [...values].map((value) => `
		<span class="filter-chip">${safe(value)}<button type="button" data-remove-filter="${group}" data-filter-value="${safe(value)}" aria-label="Quitar filtro ${safe(value)}" title="Quitar">×</button></span>`).join('');
	establishmentFilterChips.innerHTML = chips(selectedEstablishmentFilters, 'establishment');
	mealFilterChips.innerHTML = chips(selectedMealFilters, 'meal');
	cuisineFilterChips.innerHTML = chips(selectedCuisineFilters, 'cuisine');
	neighborhoodFilterChips.innerHTML = chips(selectedNeighborhoodFilters, 'neighborhood');
	cityFilterChips.innerHTML = chips(selectedCityFilters, 'city');
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('[data-establishment-filter]').forEach((input) => { input.checked = selectedEstablishmentFilters.has(input.value); });
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('[data-meal-filter]').forEach((input) => { input.checked = selectedMealFilters.has(input.value); });
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('[data-cuisine-filter]').forEach((input) => { input.checked = selectedCuisineFilters.has(input.value); });
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('[data-neighborhood-filter]').forEach((input) => { input.checked = selectedNeighborhoodFilters.has(input.value); });
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('[data-city-filter]').forEach((input) => { input.checked = selectedCityFilters.has(input.value); });
	favoriteFilterButton.setAttribute('aria-pressed', String(favoriteFilterActive));
	visitedFilterButton.setAttribute('aria-pressed', String(visitedFilterActive));
}

function renderAdditionalFilterOptions() {
	const availableNeighborhoods = [...new Set([...neighborhoods, ...restaurants.map((restaurant) => restaurant.neighborhood).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
	selectedNeighborhoodFilters = new Set([...selectedNeighborhoodFilters].filter((value) => availableNeighborhoods.includes(value)));
	neighborhoodFilterOptions.innerHTML = availableNeighborhoods.map((value) => `
		<label><input type="checkbox" value="${safe(value)}" data-neighborhood-filter${selectedNeighborhoodFilters.has(value) ? ' checked' : ''} />${safe(value)}</label>`).join('');
	const availableCities = [...new Set(restaurants.map((restaurant) => restaurant.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
	selectedCityFilters = new Set([...selectedCityFilters].filter((value) => availableCities.includes(value)));
	cityFilterOptions.innerHTML = availableCities.map((value) => `
		<label><input type="checkbox" value="${safe(value)}" data-city-filter${selectedCityFilters.has(value) ? ' checked' : ''} />${safe(value)}</label>`).join('');
	updateDirectoryFilterLabels();
	headerEstablishmentOptions.innerHTML = establishmentTypes.map((value) => `<button type="button" data-header-filter="establishment" data-header-filter-value="${safe(value)}">${safe(value)}</button>`).join('');
	headerServiceOptions.innerHTML = serviceTypes.map((value) => `<button type="button" data-header-filter="meal" data-header-filter-value="${safe(value)}">${safe(value)}</button>`).join('');
	headerCuisineOptions.innerHTML = cuisines.map((value) => `<button type="button" data-header-filter="cuisine" data-header-filter-value="${safe(value)}">${safe(value)}</button>`).join('');
}

function renderEstablishmentFilterOptions() {
	establishmentFilterOptions.innerHTML = establishmentTypes.map((type) => `
		<label><input type="checkbox" value="${safe(type)}" data-establishment-filter${selectedEstablishmentFilters.has(type) ? ' checked' : ''} />${safe(type)}</label>`).join('');
	updateDirectoryFilterLabels();
}

function renderCuisineFilterOptions() {
	cuisineFilterOptions.innerHTML = cuisines.map((cuisine) => `
		<label><input type="checkbox" value="${safe(cuisine)}" data-cuisine-filter${selectedCuisineFilters.has(cuisine) ? ' checked' : ''} />${safe(cuisine)}</label>`).join('');
	updateDirectoryFilterLabels();
}

function renderServiceFilterOptions() {
	mealFilterOptions.innerHTML = serviceTypes.map((service) => `
		<label><input type="checkbox" value="${safe(service)}" data-meal-filter${selectedMealFilters.has(service) ? ' checked' : ''} />${safe(service)}</label>`).join('');
	updateDirectoryFilterLabels();
}

function renderCuisineOptions(clearInput = true) {
	if (clearInput) cuisineSelect.value = '';
	const query = cuisineSelect.value.trim().toLocaleLowerCase('es');
	const filtered = cuisines.filter((cuisine) => cuisine.toLocaleLowerCase('es').includes(query));
	const hasExactMatch = cuisines.some((cuisine) => cuisine.toLocaleLowerCase('es') === query);
	cuisineOptions.innerHTML = [
		...filtered.map((cuisine) => `
			<div class="cuisine-dropdown-option${selectedCuisines.includes(cuisine) ? ' selected' : ''}" role="option" aria-selected="${selectedCuisines.includes(cuisine)}">
				<button type="button" data-select-cuisine="${safe(cuisine)}"><span class="cuisine-option-check">✓</span><span>${safe(cuisine)}</span></button>
				<button type="button" class="delete-cuisine-option" data-dropdown-delete-cuisine="${safe(cuisine)}" aria-label="Eliminar ${safe(cuisine)} de la lista" title="Eliminar de la lista">×</button>
			</div>`),
		...(query && !hasExactMatch ? [`<button type="button" class="create-cuisine-option" data-create-cuisine><span>＋</span> Agregar “${safe(cuisineSelect.value.trim())}”</button>`] : []),
	].join('') || '<p class="cuisine-empty">Sin resultados. Escribí un nombre y pulsá Enter.</p>';
	selectedCuisineFilters = new Set([...selectedCuisineFilters].filter((cuisine) => cuisines.includes(cuisine)));
	renderCuisineFilterOptions();
}

function renderNeighborhoodOptions() {
	const query = neighborhoodInput.value.trim().toLocaleLowerCase('es');
	const filtered = neighborhoods.filter((neighborhood) => neighborhood.toLocaleLowerCase('es').includes(query));
	const exact = neighborhoods.find((neighborhood) => neighborhood.toLocaleLowerCase('es') === query);
	neighborhoodOptions.innerHTML = [
		...filtered.map((neighborhood) => `
			<div class="cuisine-dropdown-option${exact === neighborhood ? ' selected' : ''}" role="option" aria-selected="${exact === neighborhood}">
				<button type="button" data-select-neighborhood="${safe(neighborhood)}"><span class="cuisine-option-check">✓</span><span>${safe(neighborhood)}</span></button>
				<button type="button" class="delete-cuisine-option" data-delete-neighborhood="${safe(neighborhood)}" aria-label="Eliminar ${safe(neighborhood)} de la lista" title="Eliminar de la lista">×</button>
			</div>`),
		...(query && !exact ? [`<button type="button" class="create-cuisine-option" data-create-neighborhood><span>＋</span> Agregar “${safe(neighborhoodInput.value.trim())}”</button>`] : []),
	].join('') || '<p class="cuisine-empty">Sin barrios guardados. Escribí un nombre y pulsá Enter.</p>';
}

function openNeighborhoodDropdown() {
	if (neighborhoodInput.disabled) return;
	renderNeighborhoodOptions();
	neighborhoodOptions.hidden = false;
	neighborhoodInput.setAttribute('aria-expanded', 'true');
}

function closeNeighborhoodDropdown() {
	neighborhoodOptions.hidden = true;
	neighborhoodInput.setAttribute('aria-expanded', 'false');
}

function commitNeighborhoodInput() {
	const neighborhood = ensureNeighborhoodOption(neighborhoodInput.value);
	if (!neighborhood) return;
	neighborhoodInput.value = neighborhood;
	neighborhoodInput.dispatchEvent(new Event('input', { bubbles: true }));
	renderNeighborhoodOptions();
	showToast('Barrio agregado');
}

function deleteNeighborhoodOption(neighborhood: string) {
	neighborhoods = neighborhoods.filter((item) => item !== neighborhood);
	removedNeighborhoods = [...new Set([...removedNeighborhoods, neighborhood])];
	if (neighborhoodInput.value.toLocaleLowerCase('es') === neighborhood.toLocaleLowerCase('es')) {
		neighborhoodInput.value = '';
		neighborhoodInput.dispatchEvent(new Event('input', { bubbles: true }));
	}
	saveNeighborhoodSettings();
	renderNeighborhoodOptions();
	showToast('Barrio eliminado de la lista');
}

function renderLocationOptions(kind: LocationOptionKind) {
	const state = getLocationOptionState(kind);
	const query = state.input.value.trim().toLocaleLowerCase('es');
	const filtered = state.values.filter((value) => value.toLocaleLowerCase('es').includes(query));
	const exact = state.values.find((value) => value.toLocaleLowerCase('es') === query);
	state.optionsElement.innerHTML = [
		...filtered.map((value) => `
			<div class="cuisine-dropdown-option${exact === value ? ' selected' : ''}" role="option" aria-selected="${exact === value}">
				<button type="button" data-select-location="${safe(value)}"><span class="cuisine-option-check">✓</span><span>${safe(value)}</span></button>
				<button type="button" class="delete-cuisine-option" data-delete-location="${safe(value)}" aria-label="Eliminar ${safe(value)} de la lista" title="Eliminar de la lista">×</button>
			</div>`),
		...(query && !exact ? [`<button type="button" class="create-cuisine-option" data-create-location><span>＋</span> Agregar “${safe(state.input.value.trim())}”</button>`] : []),
	].join('') || `<p class="cuisine-empty">Sin opciones guardadas. Escribí y pulsá Enter.</p>`;
}

function openLocationDropdown(kind: LocationOptionKind) {
	const state = getLocationOptionState(kind);
	if (state.input.disabled) return;
	renderLocationOptions(kind);
	state.optionsElement.hidden = false;
	state.input.setAttribute('aria-expanded', 'true');
}

function closeLocationDropdown(kind: LocationOptionKind) {
	const state = getLocationOptionState(kind);
	state.optionsElement.hidden = true;
	state.input.setAttribute('aria-expanded', 'false');
}

function commitLocationInput(kind: LocationOptionKind) {
	const state = getLocationOptionState(kind);
	const value = ensureLocationOption(kind, state.input.value);
	if (!value) return;
	state.input.value = value;
	state.input.dispatchEvent(new Event('input', { bubbles: true }));
	renderLocationOptions(kind);
	showToast(`${state.label} agregada a la lista`);
}

function deleteLocationOption(kind: LocationOptionKind, value: string) {
	const state = getLocationOptionState(kind);
	const values = state.values.filter((item) => item !== value);
	const removed = [...new Set([...state.removed, value])];
	setLocationOptionState(kind, values, removed);
	if (state.input.value.toLocaleLowerCase('es') === value.toLocaleLowerCase('es')) {
		state.input.value = '';
		state.input.dispatchEvent(new Event('input', { bubbles: true }));
	}
	saveLocationOptions(kind);
	renderLocationOptions(kind);
	showToast(`${state.label} eliminada de la lista`);
}

function renderSelectedCuisines() {
	selectedCuisinesContainer.innerHTML = selectedCuisines.map((cuisine, index) => `
		<span class="selected-option" draggable="true" data-cuisine-index="${index}" title="Arrastrá para cambiar el orden">
			${safe(cuisine)}
			<input type="hidden" name="cuisines" value="${safe(cuisine)}" />
			<button type="button" data-remove-cuisine="${safe(cuisine)}" aria-label="Quitar ${safe(cuisine)}" title="Quitar">×</button>
		</span>`).join('');
}

function renderSelectedTags() {
	selectedTagsContainer.innerHTML = selectedTags.map((tag) => `
		<span class="selected-option">
			${safe(tag)}
			<input type="hidden" name="tags" value="${safe(tag)}" />
			<button type="button" data-remove-tag="${safe(tag)}" aria-label="Quitar ${safe(tag)}" title="Quitar">×</button>
		</span>`).join('');
}

function renderTagOptions(clearInput = false) {
	if (clearInput) tagInput.value = '';
	const query = tagInput.value.trim().toLocaleLowerCase('es');
	const filtered = tagCatalog.filter((tag) => tag.toLocaleLowerCase('es').includes(query));
	const hasExactMatch = tagCatalog.some((tag) => tag.toLocaleLowerCase('es') === query);
	tagOptions.innerHTML = [
		...filtered.map((tag) => {
			const selected = selectedTags.some((item) => item.toLocaleLowerCase('es') === tag.toLocaleLowerCase('es'));
			return `
				<div class="cuisine-dropdown-option${selected ? ' selected' : ''}" role="option" aria-selected="${selected}">
					<button type="button" data-select-tag="${safe(tag)}"><span class="cuisine-option-check">✓</span><span>${safe(tag)}</span></button>
					<button type="button" class="delete-cuisine-option" data-delete-tag="${safe(tag)}" aria-label="Eliminar ${safe(tag)} de la lista" title="Eliminar de la lista">×</button>
				</div>`;
		}),
		...(query && !hasExactMatch ? [`<button type="button" class="create-cuisine-option" data-create-tag><span>＋</span> Agregar “${safe(tagInput.value.trim())}”</button>`] : []),
	].join('') || '<p class="cuisine-empty">Sin etiquetas guardadas. Escribí una nueva y pulsá Enter.</p>';
}

function addTagSelection(tag: string) {
	const normalizedTag = capitalizeFirstLetter(tag.slice(0, 50));
	if (!normalizedTag || selectedTags.some((item) => item.toLocaleLowerCase('es') === normalizedTag.toLocaleLowerCase('es'))) {
		renderTagOptions();
		return;
	}
	selectedTags.push(normalizedTag);
	renderSelectedTags();
	renderTagOptions(true);
	updateDirtyState();
}

function commitTagInput() {
	const enteredTags = tagInput.value.split(',').map((tag) => tag.trim()).filter(Boolean);
	if (!enteredTags.length) return;
	for (const entered of enteredTags) {
		const existing = tagCatalog.find((tag) => tag.toLocaleLowerCase('es') === entered.toLocaleLowerCase('es'));
		const tag = existing ?? capitalizeFirstLetter(entered.slice(0, 50));
		if (!existing) {
			tagCatalog.push(tag);
			tagCatalog.sort((a, b) => a.localeCompare(b, 'es'));
			removedTags = removedTags.filter((item) => item.toLocaleLowerCase('es') !== tag.toLocaleLowerCase('es'));
		}
		if (!selectedTags.some((item) => item.toLocaleLowerCase('es') === tag.toLocaleLowerCase('es'))) selectedTags.push(tag);
	}
	tagInput.value = '';
	saveTagSettings();
	renderSelectedTags();
	renderTagOptions();
	updateDirtyState();
}

function openTagDropdown() {
	if (tagInput.disabled) return;
	renderTagOptions();
	tagOptions.hidden = false;
	tagInput.setAttribute('aria-expanded', 'true');
}

function closeTagDropdown() {
	tagOptions.hidden = true;
	tagInput.setAttribute('aria-expanded', 'false');
}

function deleteTagOption(tag: string) {
	tagCatalog = tagCatalog.filter((item) => item !== tag);
	removedTags = [...new Set([...removedTags, tag])];
	selectedTags = selectedTags.filter((item) => item !== tag);
	saveTagSettings();
	renderSelectedTags();
	renderTagOptions();
	updateDirtyState();
	showToast('Etiqueta eliminada de la lista');
}

function addCuisineSelection(cuisine: string) {
	const normalizedCuisine = capitalizeFirstLetter(cuisine);
	if (!normalizedCuisine) return;
	if (selectedCuisines.some((item) => item.toLocaleLowerCase('es') === normalizedCuisine.toLocaleLowerCase('es'))) {
		renderCuisineOptions();
		return;
	}
	selectedCuisines.push(normalizedCuisine);
	renderSelectedCuisines();
	renderCuisineOptions();
	updateDirtyState();
}

function renderEstablishmentOptions(refreshFilter = false, clearInput = true) {
	if (clearInput) establishmentSelect.value = '';
	const query = establishmentSelect.value.trim().toLocaleLowerCase('es');
	const filtered = establishmentTypes.filter((type) => type.toLocaleLowerCase('es').includes(query));
	const hasExactMatch = establishmentTypes.some((type) => type.toLocaleLowerCase('es') === query);
	establishmentOptions.innerHTML = [
		...filtered.map((type) => `
			<div class="cuisine-dropdown-option${selectedEstablishments.includes(type) ? ' selected' : ''}" role="option" aria-selected="${selectedEstablishments.includes(type)}">
				<button type="button" data-select-establishment="${safe(type)}"><span class="cuisine-option-check">✓</span><span>${safe(type)}</span></button>
				<button type="button" class="delete-cuisine-option" data-delete-establishment="${safe(type)}" aria-label="Eliminar ${safe(type)} de la lista" title="Eliminar de la lista">×</button>
			</div>`),
		...(query && !hasExactMatch ? [`<button type="button" class="create-cuisine-option" data-create-establishment><span>＋</span> Agregar “${safe(establishmentSelect.value.trim())}”</button>`] : []),
	].join('') || '<p class="cuisine-empty">Sin resultados. Escribí un tipo de lugar y pulsá Enter.</p>';
	if (refreshFilter) {
		selectedEstablishmentFilters = new Set([...selectedEstablishmentFilters].filter((type) => establishmentTypes.includes(type)));
		renderEstablishmentFilterOptions();
	}
}

function renderSelectedEstablishments() {
	selectedEstablishmentsContainer.innerHTML = selectedEstablishments.map((type) => `
		<span class="selected-option">
			${safe(type)}
			<input type="hidden" name="establishmentTypes" value="${safe(type)}" />
			<button type="button" data-remove-establishment="${safe(type)}" aria-label="Quitar ${safe(type)}" title="Quitar">×</button>
		</span>`).join('');
}

function addEstablishmentSelection(type: string) {
	const normalizedType = capitalizeFirstLetter(type);
	if (!normalizedType || selectedEstablishments.some((item) => item.toLocaleLowerCase('es') === normalizedType.toLocaleLowerCase('es'))) return;
	selectedEstablishments.push(normalizedType);
	renderSelectedEstablishments();
	renderEstablishmentOptions();
	updateDirtyState();
}

function commitEstablishmentInput() {
	const entered = establishmentSelect.value.trim();
	if (!entered) return;
	const existing = establishmentTypes.find((type) => type.toLocaleLowerCase('es') === entered.toLocaleLowerCase('es'));
	if (existing) {
		addEstablishmentSelection(existing);
		return;
	}
	const type = capitalizeFirstLetter(entered.slice(0, 50));
	establishmentTypes.push(type);
	establishmentTypes.sort((a, b) => a.localeCompare(b, 'es'));
	removedEstablishmentTypes = removedEstablishmentTypes.filter((item) => item.toLocaleLowerCase('es') !== type.toLocaleLowerCase('es'));
	saveEstablishmentSettings();
	addEstablishmentSelection(type);
	renderEstablishmentOptions(true);
	showToast('Tipo de lugar agregado');
}

function openEstablishmentDropdown() {
	if (establishmentSelect.disabled) return;
	renderEstablishmentOptions(false, false);
	establishmentOptions.hidden = false;
	establishmentSelect.setAttribute('aria-expanded', 'true');
}

function closeEstablishmentDropdown() {
	establishmentOptions.hidden = true;
	establishmentSelect.setAttribute('aria-expanded', 'false');
}

function deleteEstablishmentOption(type: string) {
	backupRestaurants();
	establishmentTypes = establishmentTypes.filter((item) => item !== type);
	removedEstablishmentTypes = [...new Set([...removedEstablishmentTypes, type])];
	selectedEstablishments = selectedEstablishments.filter((item) => item !== type);
	restaurants.forEach((restaurant) => {
		const remaining = getRestaurantEstablishmentTypes(restaurant).filter((item) => item !== type);
		restaurant.establishmentTypes = remaining;
		restaurant.establishmentType = remaining[0] ?? '';
	});
	saveRestaurants();
	saveEstablishmentSettings();
	renderSelectedEstablishments();
	renderEstablishmentOptions(true, false);
	render();
	updateDirtyState();
	showToast('Tipo de lugar eliminado');
}

function renderServiceOptions(clearInput = true, refreshFilter = false) {
	if (clearInput) serviceSelect.value = '';
	const query = serviceSelect.value.trim().toLocaleLowerCase('es');
	const filtered = serviceTypes.filter((service) => service.toLocaleLowerCase('es').includes(query));
	const hasExactMatch = serviceTypes.some((service) => service.toLocaleLowerCase('es') === query);
	serviceOptions.innerHTML = [
		...filtered.map((service) => `
			<div class="cuisine-dropdown-option${selectedServices.includes(service) ? ' selected' : ''}" role="option" aria-selected="${selectedServices.includes(service)}">
				<button type="button" data-select-service="${safe(service)}"><span class="cuisine-option-check">✓</span><span>${safe(service)}</span></button>
				<button type="button" class="delete-cuisine-option" data-delete-service="${safe(service)}" aria-label="Eliminar ${safe(service)} de la lista" title="Eliminar de la lista">×</button>
			</div>`),
		...(query && !hasExactMatch ? [`<button type="button" class="create-cuisine-option" data-create-service><span>＋</span> Agregar “${safe(serviceSelect.value.trim())}”</button>`] : []),
	].join('') || '<p class="cuisine-empty">Sin resultados. Escribí un servicio y pulsá Enter.</p>';
	if (refreshFilter) {
		selectedMealFilters = new Set([...selectedMealFilters].filter((service) => serviceTypes.includes(service)));
		renderServiceFilterOptions();
	}
}

function renderSelectedServices() {
	selectedServicesContainer.innerHTML = selectedServices.map((service) => `
		<span class="selected-option">
			${safe(service)}
			<input type="hidden" name="mealTypes" value="${safe(service)}" />
			<button type="button" data-remove-service="${safe(service)}" aria-label="Quitar ${safe(service)}" title="Quitar">×</button>
		</span>`).join('');
}

function addServiceSelection(service: string) {
	if (!service || selectedServices.includes(service)) return;
	selectedServices.push(service);
	renderSelectedServices();
	renderServiceOptions();
	updateDirtyState();
}

function commitServiceInput() {
	const entered = serviceSelect.value.trim();
	if (!entered) return;
	const existing = serviceTypes.find((service) => service.toLocaleLowerCase('es') === entered.toLocaleLowerCase('es'));
	if (existing) {
		addServiceSelection(existing);
		return;
	}
	const service = entered.slice(0, 50);
	serviceTypes.push(service);
	serviceTypes.sort((a, b) => a.localeCompare(b, 'es'));
	removedServiceTypes = removedServiceTypes.filter((item) => item.toLocaleLowerCase('es') !== service.toLocaleLowerCase('es'));
	saveServiceSettings();
	addServiceSelection(service);
	renderServiceOptions(true, true);
	showToast('Servicio agregado');
}

function openServiceDropdown() {
	if (serviceSelect.disabled) return;
	renderServiceOptions(false);
	serviceOptions.hidden = false;
	serviceSelect.setAttribute('aria-expanded', 'true');
}

function closeServiceDropdown() {
	serviceOptions.hidden = true;
	serviceSelect.setAttribute('aria-expanded', 'false');
}

function deleteServiceOption(service: string) {
	backupRestaurants();
	serviceTypes = serviceTypes.filter((item) => item !== service);
	removedServiceTypes = [...new Set([...removedServiceTypes, service])];
	selectedServices = selectedServices.filter((item) => item !== service);
	restaurants.forEach((restaurant) => {
		restaurant.mealTypes = (restaurant.mealTypes ?? []).filter((item) => item !== service);
	});
	saveRestaurants();
	saveServiceSettings();
	renderSelectedServices();
	renderServiceOptions(false, true);
	render();
	updateDirtyState();
	showToast('Servicio eliminado');
}

function showToast(message: string) {
	toast.textContent = message;
	toast.classList.add('visible');
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2400);
}

function isPasteTarget(element: EventTarget | null): element is HTMLInputElement | HTMLTextAreaElement {
	if (element instanceof HTMLTextAreaElement) return true;
	return element instanceof HTMLInputElement && ['text', 'url', 'tel', 'search'].includes(element.type);
}

const SCHEDULE_DAYS = [
	{ key: 'lunes', label: 'Lunes' },
	{ key: 'martes', label: 'Martes' },
	{ key: 'miercoles', label: 'Miércoles' },
	{ key: 'jueves', label: 'Jueves' },
	{ key: 'viernes', label: 'Viernes' },
	{ key: 'sabado', label: 'Sábado' },
	{ key: 'domingo', label: 'Domingo' },
];

function scheduleDayKey(value: string) {
	const day = value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f.]/g, '');
	if (/^(lun|lunes|monday)$/.test(day)) return 'lunes';
	if (/^(mar|martes|tuesday)$/.test(day)) return 'martes';
	if (/^(mie|miercoles|wednesday)$/.test(day)) return 'miercoles';
	if (/^(jue|jueves|thursday)$/.test(day)) return 'jueves';
	if (/^(vie|viernes|friday)$/.test(day)) return 'viernes';
	if (/^(sab|sabado|saturday)$/.test(day)) return 'sabado';
	if (/^(dom|domingo|sunday)$/.test(day)) return 'domingo';
	return '';
}

function parseScheduleText(value: string) {
	const result = new Map<string, string>();
	const dayPattern = /\b(lunes?|lun\.?|monday|martes|mar\.?|tuesday|miércoles?|miercoles?|mié\.?|mie\.?|wednesday|jueves|jue\.?|thursday|viernes|vie\.?|friday|sábados?|sabados?|sáb\.?|sab\.?|saturday|domingos?|dom\.?|sunday)(?!\p{L})/giu;
	let activeDays: string[] = [];
	const appendHours = (keys: string[], hours: string) => {
		keys.forEach((key) => {
			const current = result.get(key);
			if (!current) {
				result.set(key, hours);
				return;
			}
			const ranges = current.split(' / ').map((item) => item.trim());
			if (!ranges.includes(hours)) result.set(key, `${current} / ${hours}`);
		});
	};
	const cleanLine = (line: string) => line
		.replace(/[\u00a0\u202f]/g, ' ')
		.replace(/[\u200b-\u200d\ufeff]/g, '')
		.replace(/[\ue000-\uf8ff]/g, '')
		.replace(/[\*_`]+/g, '')
		.trim();
	const isIgnoredLine = (line: string) => (
		/^\([^)]*\)$/.test(line)
		|| /^los horarios pueden variar\.?$/iu.test(line)
		|| /^horarios? (?:en|de) d[ií]as? festivos?\.?$/iu.test(line)
	);
	const isHoursLine = (line: string) => (
		/^(?:cerrado|abierto(?: las)? 24 horas|24 horas)$/iu.test(line)
		|| (/\d/.test(line) && /(?::|\b(?:a\.?m\.?|p\.?m\.?|hs?\.?|horas?)\b|[–—-])/iu.test(line))
	);

	value.replace(/\r/g, '').split(/\n|;/).map(cleanLine).filter(Boolean).forEach((line) => {
		if (isIgnoredLine(line)) return;
		const matches = [...line.matchAll(dayPattern)];
		if (!matches.length) {
			if (activeDays.length && isHoursLine(line)) appendHours(activeDays, line);
			return;
		}
		const firstKey = scheduleDayKey(matches[0][0]);
		const lastMatch = matches[matches.length - 1];
		const lastKey = scheduleDayKey(lastMatch[0]);
		const lastEnd = (lastMatch.index ?? 0) + lastMatch[0].length;
		const hours = line.slice(lastEnd)
			.replace(/^[\s,:–—-]+/, '')
			.replace(/^\([^)]*\)\s*/, '')
			.trim();
		let keys: string[] = matches.map((match) => scheduleDayKey(match[0])).filter(Boolean);
		const betweenDays = line.slice((matches[0].index ?? 0) + matches[0][0].length, lastMatch.index ?? 0);
		if (matches.length === 2 && /(?:\ba\b|\bal\b|\bto\b|–|—|-)/iu.test(betweenDays)) {
			const firstIndex = SCHEDULE_DAYS.findIndex((day) => day.key === firstKey);
			const lastIndex = SCHEDULE_DAYS.findIndex((day) => day.key === lastKey);
			if (firstIndex >= 0 && lastIndex >= firstIndex) keys = SCHEDULE_DAYS.slice(firstIndex, lastIndex + 1).map((day) => day.key);
		}
		activeDays = keys;
		if (hours && isHoursLine(hours)) appendHours(keys, hours);
	});
	return result;
}

function updateHoursValue() {
	hoursValue.value = SCHEDULE_DAYS.map((day) => {
		const input = scheduleInputs.find((item) => item.dataset.scheduleDay === day.key);
		return input?.value.trim() ? `${day.label}: ${input.value.trim()}` : '';
	}).filter(Boolean).join('\n');
}

function loadScheduleFromText(value: string) {
	const parsed = parseScheduleText(value);
	scheduleInputs.forEach((input) => { input.value = parsed.get(input.dataset.scheduleDay ?? '') ?? ''; });
	updateHoursValue();
	updateClearButtons();
}

function pasteScheduleText(value: string) {
	const parsed = parseScheduleText(value);
	if (!parsed.size) return false;
	scheduleInputs.forEach((input) => {
		const schedule = parsed.get(input.dataset.scheduleDay ?? '');
		if (schedule !== undefined) input.value = schedule;
	});
	updateHoursValue();
	scheduleInputs.forEach(updateClearButton);
	form.dispatchEvent(new Event('input', { bubbles: true }));
	showToast(`${parsed.size} ${parsed.size === 1 ? 'día organizado' : 'días organizados'} automáticamente`);
	return true;
}

function captureFormState() {
	return JSON.stringify([...new FormData(form).entries()]
		.filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function captureImageState() {
	return JSON.stringify(restaurantImages.map((image) => image.id));
}

function captureLogoState() {
	return restaurantLogo?.id ?? '';
}

function updateDirtyState() {
	if (!dirtyTrackingReady) {
		updateDataButton.disabled = true;
		return;
	}
	const formChanged = captureFormState() !== baselineFormState;
	const imagesChanged = imageBaselineReady && captureImageState() !== baselineImageState;
	const logoChanged = logoBaselineReady && captureLogoState() !== baselineLogoState;
	updateDataButton.disabled = !(formChanged || imagesChanged || logoChanged);
}

function updateClearButton(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
	const button = control.parentElement?.querySelector<HTMLButtonElement>('.clear-field-button');
	if (button) button.hidden = control.value.length === 0;
}

function updateClearButtons() {
	form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('.clearable-control > input, .clearable-control > select, .clearable-control > textarea')
		.forEach(updateClearButton);
}

function setupClearableFields() {
	const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
	controls.forEach((control) => {
		if (control instanceof HTMLInputElement && ['hidden', 'file', 'checkbox', 'radio'].includes(control.type)) return;
		if (['cuisine', 'establishment-type', 'service-type', 'tag-input'].includes(control.id)) return;
		const wrapper = document.createElement('div');
		wrapper.className = 'clearable-control';
		control.before(wrapper);
		wrapper.append(control);
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'clear-field-button';
		button.textContent = '×';
		button.title = 'Vaciar campo';
		button.setAttribute('aria-label', `Vaciar ${control.getAttribute('aria-label') || control.name || 'campo'}`);
		button.addEventListener('pointerdown', (event) => event.preventDefault());
		button.addEventListener('click', () => {
			control.value = '';
			control.dispatchEvent(new Event('input', { bubbles: true }));
			control.dispatchEvent(new Event('change', { bubbles: true }));
			control.focus();
			updateClearButton(control);
		});
		control.addEventListener('input', () => updateClearButton(control));
		control.addEventListener('change', () => updateClearButton(control));
		wrapper.append(button);
		updateClearButton(control);
	});
}

function activateFormTab(tabName: string) {
	formTabs.forEach((tab) => {
		const active = tab.dataset.formTab === tabName;
		tab.classList.toggle('active', active);
		tab.setAttribute('aria-selected', String(active));
		tab.tabIndex = active ? 0 : -1;
	});
	tabPanels.forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== tabName; });
}

function updateExternalLink(input: HTMLInputElement, link: HTMLAnchorElement) {
	const url = input.value.trim();
	const active = Boolean(url) && input.validity.valid;
	if (active) link.href = url;
	else link.removeAttribute('href');
	link.classList.toggle('disabled', !active);
	link.setAttribute('aria-disabled', String(!active));
	link.tabIndex = active ? 0 : -1;
}

function updateWhatsAppWebLink() {
	const digits = normalizeWhatsAppNumber(whatsappInput.value, countryInput.value);
	if (digits) openWhatsAppWeb.href = `https://web.whatsapp.com/send/?phone=${digits}&type=phone_number&app_absent=0`;
	else openWhatsAppWeb.removeAttribute('href');
	openWhatsAppWeb.classList.toggle('disabled', !digits);
	openWhatsAppWeb.setAttribute('aria-disabled', String(!digits));
	openWhatsAppWeb.tabIndex = digits ? 0 : -1;
}

function updateViewMapLink(readOnly: boolean) {
	const explicitUrl = mapUrlInput.value.trim();
	const addressQuery = ['address', 'neighborhood', 'city', 'province', 'country']
		.map((name) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '')
		.filter(Boolean)
		.join(', ');
	const targetUrl = explicitUrl && mapUrlInput.validity.valid
		? explicitUrl
		: addressQuery
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
			: '';
	const active = readOnly && Boolean(targetUrl);
	if (active) viewOpenMap.href = targetUrl;
	else viewOpenMap.removeAttribute('href');
	viewOpenMap.classList.toggle('disabled', !active);
	viewOpenMap.setAttribute('aria-disabled', String(!active));
	viewOpenMap.tabIndex = active ? 0 : -1;
	viewMapLinkField.classList.toggle('view-empty-field', !active);
}

function updateMapPreview(readOnly: boolean) {
	updateViewMapLink(readOnly);
	if (!readOnly) {
		mapPreview.hidden = true;
		mapPreviewFrame.removeAttribute('src');
		return;
	}
	const mapUrl = mapUrlInput.value.trim();
	const coordinateMatch = mapUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
	let query = coordinateMatch ? `${coordinateMatch[1]},${coordinateMatch[2]}` : '';
	if (!query) {
		query = ['address', 'neighborhood', 'city', 'province', 'country']
			.map((name) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '')
			.filter(Boolean)
			.join(', ');
	}
	if (!query && mapUrl) query = mapUrl;
	mapPreview.hidden = !query;
	if (query) mapPreviewFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
	else mapPreviewFrame.removeAttribute('src');
}

function placeMapField(readOnly: boolean) {
	if (readOnly) mapFieldGeneralAnchor.after(mapUrlField);
	else mapFieldLinksAnchor.after(mapUrlField);
}

function updateViewEmptyFields(readOnly: boolean) {
	form.querySelectorAll('.view-empty-field').forEach((element) => element.classList.remove('view-empty-field'));
	if (!readOnly) return;

	const markNamedField = (name: string) => {
		const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
		if (!field || field.value.trim()) return;
		(field.closest('.form-field') || field.closest('label'))?.classList.add('view-empty-field');
	};
	[
		'address', 'neighborhood', 'mobile', 'phone', 'city', 'province', 'country', 'rating', 'score', 'price', 'averagePrice',
		'website', 'googleUrl', 'linktreeUrl', 'menuUrl', 'instagramUrl', 'tiktokUrl', 'facebookUrl', 'wokiUrl', 'tripAdvisorUrl',
		'description', 'notes',
	].forEach(markNamedField);

	if (!selectedEstablishments.length) document.querySelector('.establishment-type-field')?.classList.add('view-empty-field');
	if (!selectedCuisines.length) selectedCuisinesContainer.closest('.form-field')?.classList.add('view-empty-field');
	if (!selectedTags.length) selectedTagsContainer.closest('.form-field')?.classList.add('view-empty-field');
	if (!selectedServices.length) document.querySelector('.meal-type-field')?.classList.add('view-empty-field');
	if (!hoursValue.value.trim()) document.querySelector('.schedule-field')?.classList.add('view-empty-field');
	if (!restaurantLogo) {
		document.querySelector('.primary-image-column')?.classList.add('view-empty-field');
		document.querySelector('.logo-field')?.classList.add('view-empty-field');
	}
}

function updatePrintPanelState() {
	printSelectedIds = new Set([...printSelectedIds].filter((id) => restaurants.some((restaurant) => restaurant.id === id)));
	const hasSelection = printSelectedIds.size > 0;
	clearPrintSelectionButton.disabled = !hasSelection;
	printPlacesPanel.querySelectorAll<HTMLButtonElement>('[data-print-mode]').forEach((button) => { button.disabled = !hasSelection; });
	selectVisiblePlacesButton.disabled = visibleRestaurantIds.length === 0;
	selectAllPlacesButton.disabled = restaurants.length === 0;
	editSelectVisibleButton.disabled = visibleRestaurantIds.length === 0;
	editSelectAllButton.disabled = restaurants.length === 0;
	editClearSelectionButton.disabled = !hasSelection;
	editSelectedPlacesButton.disabled = !hasSelection;
	editSelectedPlacesButton.querySelector('span')!.textContent = hasSelection ? `Editar seleccionados (${printSelectedIds.size})` : 'Editar seleccionados';
	deleteSelectVisibleButton.disabled = visibleRestaurantIds.length === 0;
	deleteSelectAllButton.disabled = restaurants.length === 0;
	deleteClearSelectionButton.disabled = !hasSelection;
	deleteSelectedPlacesButton.disabled = !hasSelection;
	deleteSelectedPlacesButton.querySelector('span')!.textContent = hasSelection ? `Eliminar seleccionados (${printSelectedIds.size})` : 'Eliminar seleccionados';
}

function render() {
	renderAveragePriceOptions();
	renderAdditionalFilterOptions();
	cardPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
	cardPreviewUrls = [];
	const normalizedSearchTerms = [...searchTerms, search.value]
		.map((term) => term.trim().toLocaleLowerCase('es'))
		.filter(Boolean);
	const keywordSearchTerms = normalizedSearchTerms.flatMap((term) => term.split(/\s+/).filter(Boolean));
	const filtered = restaurants.filter((restaurant) => {
		const searchable = [
			restaurant.name, restaurant.description, restaurant.tags ?? '', restaurant.address, ...(restaurant.branchAddresses ?? []), restaurant.neighborhood, restaurant.country, restaurant.province, restaurant.city,
			...getRestaurantCuisines(restaurant), ...getRestaurantEstablishmentTypes(restaurant), ...(restaurant.mealTypes ?? []),
		].map((value) => (value ?? '').toLocaleLowerCase('es'));
		const normalizedName = restaurant.name.toLocaleLowerCase('es');
		const matchesTerm = searchScope === 'name'
			? normalizedSearchTerms.every((term) => normalizedName.includes(term))
			: keywordSearchTerms.every((term) => searchable.some((value) => value.includes(term)));
		const restaurantEstablishments = getRestaurantEstablishmentTypes(restaurant);
		const restaurantMeals = restaurant.mealTypes ?? [];
		const restaurantCuisines = getRestaurantCuisines(restaurant);
		const matchesEstablishment = !selectedEstablishmentFilters.size || [...selectedEstablishmentFilters].some((value) => restaurantEstablishments.includes(value));
		const matchesMeal = !selectedMealFilters.size || [...selectedMealFilters].some((value) => restaurantMeals.includes(value));
		const matchesCuisine = !selectedCuisineFilters.size || [...selectedCuisineFilters].some((value) => restaurantCuisines.includes(value));
		const matchesNeighborhood = !selectedNeighborhoodFilters.size || selectedNeighborhoodFilters.has(restaurant.neighborhood ?? '');
		const matchesCity = !selectedCityFilters.size || selectedCityFilters.has(restaurant.city ?? '');
		const matchesFavorite = !favoriteFilterActive || Boolean(restaurant.favorite);
		const matchesVisited = !visitedFilterActive || Boolean(restaurant.visited);
		return matchesTerm
			&& matchesEstablishment
			&& matchesMeal
			&& matchesCuisine
			&& matchesNeighborhood
			&& matchesCity
			&& matchesFavorite
			&& matchesVisited;
	});
	filtered.sort((a, b) => {
		if (directorySort === 'name-asc') return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
		if (directorySort === 'name-desc') return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
		if (directorySort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
	visibleRestaurantIds = filtered.map((restaurant) => restaurant.id);
	list.classList.remove('view-columns-1', 'view-columns-2', 'view-columns-3', 'view-columns-4', 'view-columns-5', 'view-columns-6', 'view-small-icons', 'view-detail', 'view-list', 'view-cuisines', 'view-establishments');
	list.classList.add(`view-${directoryView}`);
	document.querySelectorAll<HTMLButtonElement>('[data-directory-view]').forEach((button) => {
		button.classList.toggle('active', button.dataset.directoryView === directoryView);
	});
	document.querySelector('#result-description')!.textContent = restaurants.length === 1 ? '1 lugar registrado' : `${restaurants.length} lugares registrados`;

	list.innerHTML = filtered.map((restaurant) => {
		const cardEstablishments = getRestaurantEstablishmentTypes(restaurant).join(', ') || 'Sin tipo de lugar';
		const cardCuisines = getRestaurantCuisines(restaurant).join(', ') || 'Sin tipo de cocina';
		const whatsappUrl = getWhatsAppUrl(restaurant.mobile, restaurant.country);
		const links = [
			whatsappUrl ? `<a href="${whatsappUrl}" target="_blank" rel="noreferrer" aria-label="Abrir WhatsApp de ${safe(restaurant.name)}" title="Abrir WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/><path d="M8.7 8.3c.3 3.7 2.3 5.8 6.1 6.4l1.2-1.3 2 1"/></svg></a>` : '',
			restaurant.mapUrl ? `<a href="${safe(restaurant.mapUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir ubicación de ${safe(restaurant.name)}" title="Abrir mapa"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg></a>` : '',
			restaurant.googleUrl ? `<a href="${safe(restaurant.googleUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir Google de ${safe(restaurant.name)}" title="Abrir Google"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.8 6.4A8 8 0 1 0 20 15h-8v-3h8"/><path d="M20 12v3"/></svg></a>` : '',
			restaurant.wokiUrl ? `<a href="${safe(restaurant.wokiUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir Woki de ${safe(restaurant.name)}" title="Abrir Woki"><span class="woki-brand-icon" aria-hidden="true"></span></a>` : '',
			restaurant.instagramUrl ? `<a href="${safe(restaurant.instagramUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir Instagram de ${safe(restaurant.name)}" title="Abrir Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.3" cy="6.7" r=".7"/></svg></a>` : '',
			restaurant.menuUrl ? `<a href="${safe(restaurant.menuUrl)}" target="_blank" rel="noreferrer" aria-label="Abrir menú de ${safe(restaurant.name)}" title="Abrir menú"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></a>` : '',
		].join('');
		return `
			<article class="restaurant-card${printSelectedIds.has(restaurant.id) ? ' print-selected' : ''}" data-restaurant-id="${restaurant.id}">
				<div class="restaurant-card-media">
					<button class="print-select-button" type="button" data-print-select="${restaurant.id}" aria-pressed="${printSelectedIds.has(restaurant.id)}" aria-label="${printSelectedIds.has(restaurant.id) ? 'Quitar' : 'Seleccionar'} ${safe(restaurant.name)} para imprimir" title="Seleccionar para imprimir">${printSelectedIds.has(restaurant.id) ? '✓' : ''}</button>
					<button class="restaurant-card-open" type="button" data-view="${restaurant.id}" aria-label="Ver ${safe(restaurant.name)}">
						<div class="restaurant-card-image" data-card-logo="${restaurant.id}"><span class="restaurant-card-placeholder">${safe(restaurant.name.charAt(0).toUpperCase())}</span></div>
					</button>
					<div class="restaurant-card-top-actions" aria-label="Acciones del restaurante">
						<button class="favorite-button${restaurant.favorite ? ' active' : ''}" type="button" data-favorite="${restaurant.id}" aria-pressed="${Boolean(restaurant.favorite)}" aria-label="${restaurant.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}" title="Favorito"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg></button>
						<button class="visited-button${restaurant.visited ? ' active' : ''}" type="button" data-visited="${restaurant.id}" aria-pressed="${Boolean(restaurant.visited)}" aria-label="${restaurant.visited ? 'Marcar como no visitado' : 'Marcar como visitado'}" title="Visitado"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg></button>
						<button class="checked-button${restaurant.checked ? ' active' : ''}" type="button" data-checked="${restaurant.id}" aria-pressed="${Boolean(restaurant.checked)}" aria-label="${restaurant.checked ? 'Marcar como no chequeado' : 'Marcar como chequeado'}" title="Checked"><img class="checked-icon" src="/icono-checked.png" alt="" /></button>
						<button class="view-images-button" type="button" data-view-images="${restaurant.id}" aria-label="Ver imágenes de ${safe(restaurant.name)}" title="Ver imágenes"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m5 17 4-4 3 3 3-3 4 4"/></svg></button>
						<details class="restaurant-card-actions-menu">
							<summary aria-label="Acciones de ${safe(restaurant.name)}" title="Acciones"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg></summary>
							<div class="restaurant-card-actions-popover">
								<button type="button" data-edit="${restaurant.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/></svg>Editar</button>
								<button type="button" data-duplicate="${restaurant.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>Duplicar</button>
								<button type="button" data-print="${restaurant.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>Imprimir</button>
								<button class="delete-button" type="button" data-delete="${restaurant.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>Eliminar</button>
							</div>
						</details>
					</div>
				</div>
				<div class="restaurant-card-body">
					<div class="restaurant-card-identity">
						<button class="restaurant-card-name" type="button" data-view="${restaurant.id}">${safe(restaurant.name)}</button>
						<p class="restaurant-card-establishments">${safe(cardEstablishments)}</p>
						<p class="restaurant-card-cuisines">${safe(cardCuisines)}</p>
					</div>
					<div class="restaurant-card-location">
						${restaurant.address ? `<p class="restaurant-card-address">${safe(restaurant.address)}</p>` : '<p class="restaurant-card-address" aria-hidden="true"></p>'}
						${restaurant.neighborhood ? `<p class="restaurant-card-neighborhood">${safe(restaurant.neighborhood)}</p>` : '<p class="restaurant-card-neighborhood" aria-hidden="true"></p>'}
					</div>
					<div class="restaurant-card-list-status" aria-label="Favorito, visitado y checked">
						<button class="favorite-button${restaurant.favorite ? ' active' : ''}" type="button" data-favorite="${restaurant.id}" aria-pressed="${Boolean(restaurant.favorite)}" aria-label="${restaurant.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}" title="Favorito"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg></button>
						<button class="visited-button${restaurant.visited ? ' active' : ''}" type="button" data-visited="${restaurant.id}" aria-pressed="${Boolean(restaurant.visited)}" aria-label="${restaurant.visited ? 'Marcar como no visitado' : 'Marcar como visitado'}" title="Visitado"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg></button>
						<button class="checked-button${restaurant.checked ? ' active' : ''}" type="button" data-checked="${restaurant.id}" aria-pressed="${Boolean(restaurant.checked)}" aria-label="${restaurant.checked ? 'Marcar como no chequeado' : 'Marcar como chequeado'}" title="Checked"><img class="checked-icon" src="/icono-checked.png" alt="" /></button>
					</div>
				</div>
				${links ? `<div class="restaurant-card-footer"><div class="row-links">${links}</div></div>` : ''}
			</article>`;
	}).join('');
	void hydrateRestaurantCardLogos(filtered, ++cardRenderVersion);

	const isFiltered = normalizedSearchTerms.length > 0
		|| selectedEstablishmentFilters.size > 0
		|| selectedMealFilters.size > 0
		|| selectedCuisineFilters.size > 0
		|| selectedNeighborhoodFilters.size > 0
		|| selectedCityFilters.size > 0
		|| favoriteFilterActive
		|| visitedFilterActive;
	emptyState.hidden = filtered.length > 0;
	list.hidden = filtered.length === 0;
	document.querySelector('#empty-title')!.textContent = isFiltered ? 'No encontramos resultados' : 'Tu directorio está vacío';
	document.querySelector('#empty-copy')!.textContent = isFiltered
		? 'Probá con otro término o cambiá el filtro seleccionado.'
		: 'Agregá tu primer restaurante para empezar a organizar la información.';
	emptyState.querySelector<HTMLButtonElement>('[data-open-form]')!.hidden = isFiltered;
	updatePrintPanelState();
}

function openLegacyImageDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('restobox-images', 2);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function fetchMediaBlob(media: ServerMedia): Promise<StoredImage> {
	const response = await fetch(media.url);
	requireActiveSession(response);
	if (!response.ok) throw new Error('No se pudo cargar una imagen');
	return { id: media.id, restaurantId: media.restaurantId, blob: await response.blob(), order: media.order };
}

async function getServerMedia(restaurantId?: string, kind?: 'image' | 'logo'): Promise<ServerMedia[]> {
	const parameters = new URLSearchParams();
	if (restaurantId) parameters.set('restaurantId', restaurantId);
	if (kind) parameters.set('kind', kind);
	const response = await fetch(`/api/media?${parameters}`);
	requireActiveSession(response);
	if (!response.ok) throw new Error('No se pudieron cargar las imágenes');
	return ((await response.json()) as { media: ServerMedia[] }).media;
}

async function hydrateRestaurantCardLogos(visibleRestaurants: Restaurant[], renderVersion: number) {
	try {
		const logos = await getServerMedia(undefined, 'logo');
		if (renderVersion !== cardRenderVersion) return;
		const visibleIds = new Set(visibleRestaurants.map((restaurant) => restaurant.id));
		const targets = new Map([...list.querySelectorAll<HTMLElement>('[data-card-logo]')]
			.map((element) => [element.dataset.cardLogo!, element]));
		logos.filter((logo) => visibleIds.has(logo.restaurantId)).forEach((logo) => {
			const target = targets.get(logo.restaurantId);
			if (!target) return;
			const image = document.createElement('img');
			image.src = logo.url;
			image.alt = 'Imagen principal del restaurante';
			target.replaceChildren(image);
		});
	} catch {
		/* Si no se puede leer el logo, la tarjeta conserva la inicial. */
	}
}

async function getRestaurantImages(restaurantId: string): Promise<StoredImage[]> {
	const media = await getServerMedia(restaurantId, 'image');
	return Promise.all(media.sort((a, b) => a.order - b.order).map(fetchMediaBlob));
}

async function uploadRestaurantMedia(restaurantId: string, kind: 'image' | 'logo', items: RestaurantImage[]) {
	const data = new FormData();
	data.set('kind', kind);
	data.set('manifest', JSON.stringify(items.map((image, order) => ({ id: image.id, order }))));
	items.forEach((image) => {
		if (image.isNew) data.append(`file:${image.id}`, image.blob, `${image.id}.${image.blob.type.split('/')[1] || 'jpg'}`);
	});
	const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/media`, { method: 'PUT', body: data });
	requireActiveSession(response);
	const result = await response.json().catch(() => ({})) as { media?: ServerMedia[]; error?: string };
	if (!response.ok || !result.media) throw new Error(result.error || 'No se pudieron guardar las imágenes');
	const blobs = new Map(items.map((image) => [image.id, image.blob]));
	return Promise.all(result.media.sort((a, b) => a.order - b.order).map(async (media) => ({
		id: media.id,
		restaurantId,
		blob: blobs.get(media.id) ?? (await fetchMediaBlob(media)).blob,
		order: media.order,
		isNew: false,
	})));
}

async function syncRestaurantImages(restaurantId: string) {
	return uploadRestaurantMedia(restaurantId, 'image', restaurantImages);
}

async function syncRestaurantLogo(restaurantId: string) {
	const saved = await uploadRestaurantMedia(restaurantId, 'logo', restaurantLogo ? [restaurantLogo] : []);
	return saved[0] ?? null;
}

async function getRestaurantLogo(restaurantId: string): Promise<StoredImage | null> {
	const media = await getServerMedia(restaurantId, 'logo');
	return media[0] ? fetchMediaBlob(media[0]) : null;
}

async function deleteRestaurantImages(_restaurantId: string) { /* Se eliminan junto con el registro del servidor. */ }
async function deleteRestaurantLogo(_restaurantId: string) { /* Se elimina junto con el registro del servidor. */ }

function clearImagePreviewUrls() {
	previewUrls.forEach((url) => URL.revokeObjectURL(url));
	previewUrls = [];
}

function clearLogoPreviewUrl() {
	if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
	logoPreviewUrl = '';
}

function clearPreviewUrls() {
	clearImagePreviewUrls();
	clearLogoPreviewUrl();
}

function renderLogoPreview() {
	clearLogoPreviewUrl();
	logoPreview.replaceChildren();
	if (restaurantLogo) {
		logoPreviewUrl = URL.createObjectURL(restaurantLogo.blob);
		const image = document.createElement('img');
		image.src = logoPreviewUrl;
		image.alt = 'Logo del restaurante';
		logoPreview.append(image);
	} else {
		logoPreview.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM7 16l4-4 3 3 2-2 3 3M8 9h.01"/></svg>';
	}
	logoDropZone.classList.toggle('has-logo', Boolean(restaurantLogo));
	logoDropText.textContent = restaurantLogo ? 'Cambiar logo' : 'Agregar logo';
	removeLogoButton.hidden = !restaurantLogo;
	renderImagePreviews();
	updateDirtyState();
}

function setRestaurantLogo(file?: File) {
	if (!file || !file.type.startsWith('image/')) {
		if (file) showToast('El archivo seleccionado no es una imagen');
		return;
	}
	restaurantLogo = { id: crypto.randomUUID(), restaurantId: '', blob: file, isNew: true };
	renderLogoPreview();
}

function renderImagePreviews() {
	clearImagePreviewUrls();
	imagePreviews.replaceChildren();
	restaurantImages.forEach((image, index) => {
		const url = URL.createObjectURL(image.blob);
		previewUrls.push(url);
		const wrapper = document.createElement('div');
		wrapper.className = 'image-preview';
		wrapper.draggable = true;
		wrapper.dataset.imageIndex = String(index);
		wrapper.title = 'Arrastrá para cambiar el orden';
		const preview = document.createElement('img');
		preview.src = url;
		preview.alt = `Imagen ${index + 1} del lugar`;
		preview.draggable = false;
		const position = document.createElement('span');
		position.className = 'image-position';
		position.textContent = String(index + 1);
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'remove-image';
		remove.textContent = '×';
		remove.dataset.imageIndex = String(index);
		remove.setAttribute('aria-label', 'Quitar imagen');
		wrapper.append(preview, position, remove);
		imagePreviews.append(wrapper);
	});
	primaryImagePreview.replaceChildren();
	const primaryImage = restaurantLogo;
	if (primaryImage) {
		const primaryUrl = URL.createObjectURL(primaryImage.blob);
		previewUrls.push(primaryUrl);
		const image = document.createElement('img');
		image.src = primaryUrl;
		image.alt = 'Logo del lugar';
		primaryImagePreview.append(image);
	} else {
		primaryImagePreview.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM7 16l4-4 3 3 2-2 3 3M8 9h.01"/></svg>';
	}
	const editPrimaryButton = document.createElement('button');
	editPrimaryButton.type = 'button';
	editPrimaryButton.className = 'primary-image-edit';
	editPrimaryButton.textContent = 'Editar imagen';
	editPrimaryButton.addEventListener('click', (event) => {
		event.stopPropagation();
		logoInput.click();
	});
	primaryImagePreview.append(editPrimaryButton);
	imageHelp.textContent = `${restaurantImages.length} de ${MAX_IMAGES} imágenes`;
	const isFull = restaurantImages.length >= MAX_IMAGES;
	imageDropZone.classList.toggle('full', isFull);
	imageDropText.textContent = isFull ? `Máximo de ${MAX_IMAGES} imágenes alcanzado` : 'Arrastrá o pegá aquí las imágenes';
	imageDropZone.setAttribute('aria-disabled', String(isFull));
	updateDirtyState();
}

function renderCarouselImage() {
	if (carouselImageUrl) URL.revokeObjectURL(carouselImageUrl);
	const image = restaurantImages[carouselImageIndex];
	if (!image) return;
	carouselImageUrl = URL.createObjectURL(image.blob);
	imageCarouselImage.src = carouselImageUrl;
	imageCarouselImage.alt = `Imagen ${carouselImageIndex + 1} del lugar`;
	imageCarouselCounter.textContent = `${carouselImageIndex + 1} de ${restaurantImages.length}`;
	const hasSeveralImages = restaurantImages.length > 1;
	previousCarouselImage.hidden = !hasSeveralImages;
	nextCarouselImage.hidden = !hasSeveralImages;
}

function openImageCarousel(index: number, usesTemporaryImages = false) {
	if (!restaurantImages[index]) return;
	carouselUsesTemporaryImages = usesTemporaryImages;
	carouselImageIndex = index;
	renderCarouselImage();
	imageCarouselDialog.showModal();
}

function moveCarouselImage(direction: number) {
	if (restaurantImages.length < 2) return;
	carouselImageIndex = (carouselImageIndex + direction + restaurantImages.length) % restaurantImages.length;
	renderCarouselImage();
}

function addImageFiles(files: File[], placeFirst = false) {
	const images = files.filter((file) => file.type.startsWith('image/'));
	const available = MAX_IMAGES - restaurantImages.length;
	const newImages = images.slice(0, available).map((file, index) => ({
		id: crypto.randomUUID(), restaurantId: '', blob: file, order: restaurantImages.length + index, isNew: true,
	}));
	if (placeFirst) restaurantImages.unshift(...newImages);
	else restaurantImages.push(...newImages);
	if (images.length > available) showToast(`Solo se permiten ${MAX_IMAGES} imágenes`);
	if (images.length === 0 && files.length > 0) showToast('Los archivos seleccionados no son imágenes');
	renderImagePreviews();
}

async function addDroppedWebImage(dataTransfer: DataTransfer) {
	const html = dataTransfer.getData('text/html');
	const htmlUrl = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '';
	const url = (dataTransfer.getData('text/uri-list') || htmlUrl || dataTransfer.getData('text/plain')).trim();
	if (!/^https?:\/\//i.test(url)) {
		showToast('No se reconoció una imagen');
		return;
	}
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error('No se pudo descargar');
		const blob = await response.blob();
		if (!blob.type.startsWith('image/')) throw new Error('No es una imagen');
		const filename = new URL(url).pathname.split('/').pop() || 'imagen-web';
		addImageFiles([new File([blob], filename, { type: blob.type })]);
	} catch {
		showToast('Esa página no permite copiar la imagen; descargala y arrastrala desde tu PC');
	}
}

function getClipboardImageFiles(dataTransfer: DataTransfer) {
	const files = [...dataTransfer.files].filter((file) => file.type.startsWith('image/'));
	if (files.length > 0) return files;
	return [...dataTransfer.items]
		.filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
		.map((item) => item.getAsFile())
		.filter((file): file is File => Boolean(file));
}

function addPastedImages(dataTransfer: DataTransfer) {
	if (restaurantImages.length >= MAX_IMAGES) {
		showToast(`Solo se permiten ${MAX_IMAGES} imágenes`);
		return;
	}
	const files = getClipboardImageFiles(dataTransfer);
	if (files.length > 0) {
		const available = MAX_IMAGES - restaurantImages.length;
		addImageFiles(files);
		if (files.length <= available) showToast(files.length === 1 ? 'Imagen pegada' : `${files.length} imágenes pegadas`);
		return;
	}
	void addDroppedWebImage(dataTransfer);
}

async function addDroppedWebLogo(dataTransfer: DataTransfer) {
	const html = dataTransfer.getData('text/html');
	const htmlUrl = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '';
	const url = (dataTransfer.getData('text/uri-list') || htmlUrl || dataTransfer.getData('text/plain')).trim();
	if (!/^https?:\/\//i.test(url)) {
		showToast('No se reconoció una imagen para el logo');
		return;
	}
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error('No se pudo descargar');
		const blob = await response.blob();
		if (!blob.type.startsWith('image/')) throw new Error('No es una imagen');
		const filename = new URL(url).pathname.split('/').pop() || 'logo-web';
		setRestaurantLogo(new File([blob], filename, { type: blob.type }));
	} catch {
		showToast('Esa página no permite copiar el logo; descargalo y arrastralo desde tu PC');
	}
}

async function openForm(restaurant?: Restaurant, readOnly = false, initialTab = 'general') {
	activeRestaurantId = restaurant?.id ?? null;
	form.classList.remove('importing-record');
	form.classList.toggle('creating-record', !restaurant && !readOnly);
	form.classList.toggle('view-mode', readOnly);
	form.classList.toggle('editing-record', Boolean(restaurant) && !readOnly);
	placeMapField(readOnly);
	viewEditButton.hidden = !readOnly;
	closeFormButton.textContent = readOnly ? 'Cerrar' : 'Cancelar';
	form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
		.forEach((control) => { control.disabled = readOnly; });
	dirtyTrackingReady = false;
	imageBaselineReady = false;
	logoBaselineReady = false;
	updateDirtyState();
	form.reset();
	closeCuisineDropdown();
	closeTagDropdown();
	closeNeighborhoodDropdown();
	(['city', 'province', 'country'] as LocationOptionKind[]).forEach(closeLocationDropdown);
	closeEstablishmentDropdown();
	closeServiceDropdown();
	activateFormTab(initialTab);
	restaurantImages = [];
	restaurantLogo = null;
	selectedEstablishments = restaurant ? [...getRestaurantEstablishmentTypes(restaurant)] : [];
	renderSelectedEstablishments();
	renderEstablishmentOptions();
	selectedServices = restaurant ? [...(restaurant.mealTypes ?? [])] : [];
	if (selectedServices.includes('Desayuno y merienda')) {
		selectedServices = [...new Set([...selectedServices.filter((service) => service !== 'Desayuno y merienda'), 'Desayuno', 'Merienda'])];
	}
	renderSelectedServices();
	renderServiceOptions();
	selectedCuisines = restaurant ? [...getRestaurantCuisines(restaurant)] : [];
	renderSelectedCuisines();
	renderCuisineOptions();
	selectedTags = restaurant?.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
	renderSelectedTags();
	renderTagOptions(true);
	renderImagePreviews();
	renderLogoPreview();
	dialogTitle.textContent = restaurant ? '' : 'Nuevo lugar';
	dialogTitle.hidden = Boolean(restaurant);
	dialogRecordName.textContent = restaurant?.name ?? '';
	dialogRecordName.hidden = !restaurant;
	const visibleIndex = restaurant ? visibleRestaurantIds.indexOf(restaurant.id) : -1;
	restaurantRecordNavigation.hidden = !readOnly || visibleIndex < 0;
	previousRestaurantButton.disabled = visibleIndex <= 0;
	nextRestaurantButton.disabled = visibleIndex < 0 || visibleIndex >= visibleRestaurantIds.length - 1;
	if (restaurant) {
		Object.entries(restaurant).forEach(([key, value]) => {
			if (['mealTypes', 'cuisine', 'cuisines', 'establishmentType', 'establishmentTypes'].includes(key)) return;
			const field = form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
			if (field && typeof value === 'string') field.value = value;
		});
		(form.elements.namedItem('province') as HTMLInputElement).value = restaurant.province ?? '';
		(form.elements.namedItem('favorite') as HTMLInputElement).checked = Boolean(restaurant.favorite);
		(form.elements.namedItem('visited') as HTMLInputElement).checked = Boolean(restaurant.visited);
		(form.elements.namedItem('checked') as HTMLInputElement).checked = Boolean(restaurant.checked);
		(form.elements.namedItem('delivery') as HTMLInputElement).checked = Boolean(restaurant.delivery);
		(form.elements.namedItem('takeAway') as HTMLInputElement).checked = Boolean(restaurant.takeAway);
		(form.elements.namedItem('glutenFree') as HTMLInputElement).checked = Boolean(restaurant.glutenFree);
	} else {
		cityInput.value = ensureLocationOption('city', DEFAULT_CITY);
		provinceInput.value = ensureLocationOption('province', DEFAULT_PROVINCE);
		countryInput.value = ensureLocationOption('country', DEFAULT_COUNTRY);
	}
	viewFavoriteStatus.hidden = !(readOnly && restaurant?.favorite);
	viewVisitedStatus.hidden = !(readOnly && restaurant?.visited);
	viewCheckedStatus.hidden = !(readOnly && restaurant?.checked);
	loadScheduleFromText(restaurant?.hours ?? '');
	updateExternalLink(linktreeInput, openLinktree);
	updateExternalLink(menuUrlInput, openMenuLink);
	updateExternalLink(websiteInput, openWebsite);
	updateExternalLink(googleInput, openGoogle);
	updateExternalLink(mapUrlInput, openMap);
	updateExternalLink(instagramInput, openInstagram);
	updateExternalLink(tiktokInput, openTiktok);
	updateExternalLink(facebookInput, openFacebook);
	updateExternalLink(wokiInput, openWoki);
	updateExternalLink(tripAdvisorInput, openTripAdvisor);
	updateWhatsAppWebLink();
	updateViewEmptyFields(readOnly);
	updateMapPreview(readOnly);
	updateClearButtons();
	baselineFormState = captureFormState();
	baselineImageState = captureImageState();
	baselineLogoState = captureLogoState();
	imageBaselineReady = !restaurant;
	logoBaselineReady = !restaurant;
	dirtyTrackingReady = !readOnly;
	updateDirtyState();
	if (!dialog.open) dialog.showModal();
	window.setTimeout(() => (form.elements.namedItem('name') as HTMLInputElement).focus(), 50);
	if (restaurant) {
		try {
			const [storedImages, storedLogo] = await Promise.all([
				getRestaurantImages(restaurant.id),
				getRestaurantLogo(restaurant.id),
			]);
			if (activeRestaurantId !== restaurant.id) return;
			restaurantImages = storedImages.map((image) => ({ ...image, isNew: false }));
			restaurantLogo = storedLogo ? { ...storedLogo, isNew: false } : null;
			renderImagePreviews();
			renderLogoPreview();
			updateViewEmptyFields(readOnly);
			baselineImageState = captureImageState();
			baselineLogoState = captureLogoState();
			imageBaselineReady = true;
			logoBaselineReady = true;
			updateDirtyState();
		} catch {
			if (activeRestaurantId !== restaurant.id) return;
			updateViewEmptyFields(readOnly);
			baselineImageState = captureImageState();
			baselineLogoState = captureLogoState();
			imageBaselineReady = true;
			logoBaselineReady = true;
			updateDirtyState();
			showToast('No se pudieron cargar las imágenes');
		}
	}
}

function setImportedField(name: string, value: string | undefined) {
	if (!value) return;
	const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
	if (!field) return;
	const maxLength = 'maxLength' in field && field.maxLength > 0 ? field.maxLength : value.length;
	field.value = value.slice(0, maxLength);
}

async function downloadImportedImage(url: string, filename: string) {
	try {
		const response = await fetch('/api/import-restaurant', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ url, mode: 'image' }),
		});
		if (!response.ok) return null;
		const blob = await response.blob();
		return new File([blob], filename, { type: blob.type || 'image/jpeg' });
	} catch {
		return null;
	}
}

function getImportUrls(value: string) {
	const candidates = value
		.split(/\s+/)
		.map((item) => item.trim().replace(/^[<({\[]+|[>)}\],;]+$/g, ''))
		.filter(Boolean);
	const urls: string[] = [];
	for (const candidate of candidates) {
		try {
			const url = new URL(candidate);
			if (!['http:', 'https:'].includes(url.protocol)) continue;
			if (!urls.includes(url.href)) urls.push(url.href);
		} catch {
			/* El mensaje de validación se muestra al enviar el formulario. */
		}
	}
	return urls;
}

async function fetchImportedRestaurant(url: string) {
	const response = await fetch('/api/import-restaurant', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ url }),
	});
	const result = await response.json() as ImportedRestaurant & { error?: string };
	if (!response.ok) throw new Error(result.error || 'No se pudo leer la página');
	if (!result.collectionUrls?.length && !result.name?.trim()) throw new Error('La página no publica un nombre de restaurante reconocible');
	return result;
}

async function saveImportedMedia(restaurantId: string, imported: ImportedRestaurant) {
	const [logoFile, imageFiles] = await Promise.all([
		imported.logo ? downloadImportedImage(imported.logo, 'logo-importado') : Promise.resolve(null),
		Promise.all((imported.images ?? []).slice(0, MAX_IMAGES).map((url, index) => downloadImportedImage(url, `imagen-importada-${index + 1}`))),
	]);
	const validImages = imageFiles.filter((file): file is File => Boolean(file));
	if (!logoFile && !validImages.length) return 0;
	const images: RestaurantImage[] = validImages.map((file, order) => ({ id: crypto.randomUUID(), restaurantId, blob: file, order, isNew: true }));
	await uploadRestaurantMedia(restaurantId, 'image', images);
	if (logoFile) await uploadRestaurantMedia(restaurantId, 'logo', [{ id: crypto.randomUUID(), restaurantId, blob: logoFile, order: 0, isNew: true }]);
	return validImages.length;
}

async function saveImportedRestaurant(imported: ImportedRestaurant) {
	const restaurantId = crypto.randomUUID();
	const establishmentTypesForImport = capitalizedCatalogValues((imported.establishmentTypes ?? ['Restaurante']).filter(Boolean));
	const importedNeighborhood = ensureNeighborhoodOption(imported.neighborhood);
	const importedCity = ensureLocationOption('city', imported.city);
	const importedProvince = ensureLocationOption('province', imported.province);
	const importedCountry = ensureLocationOption('country', imported.country);
	const restaurant: Restaurant = {
		id: restaurantId,
		name: imported.name?.trim() ?? '',
		description: imported.description?.trim() ?? '',
		establishmentType: establishmentTypesForImport[0] ?? '',
		establishmentTypes: establishmentTypesForImport,
		cuisine: '',
		cuisines: [],
		tags: imported.tags?.trim() ?? '',
		rating: imported.rating?.trim() ?? '',
		mealTypes: [],
		price: imported.price ?? '',
		averagePrice: imported.averagePrice?.trim() ?? '',
		score: imported.score?.trim() ?? '',
		country: importedCountry,
		province: importedProvince,
		city: importedCity,
		address: imported.address?.trim() ?? '',
		neighborhood: importedNeighborhood,
		hasBranches: false,
		branchAddresses: [],
		phone: imported.phone?.trim() ?? '',
		mobile: imported.mobile?.trim() ?? '',
		website: imported.website?.trim() ?? '',
		googleUrl: imported.googleUrl?.trim() ?? '',
		linktreeUrl: imported.linktreeUrl?.trim() ?? '',
		menuUrl: imported.menuUrl?.trim() ?? '',
		instagramUrl: imported.instagramUrl?.trim() ?? '',
		tiktokUrl: imported.tiktokUrl?.trim() ?? '',
		facebookUrl: imported.facebookUrl?.trim() ?? '',
		wokiUrl: imported.wokiUrl?.trim() ?? '',
		tripAdvisorUrl: imported.tripAdvisorUrl?.trim() ?? '',
		mapUrl: imported.mapUrl?.trim() ?? '',
		hours: imported.hours?.trim() ?? '',
		notes: '',
		favorite: false,
		visited: false,
		checked: false,
		delivery: Boolean(imported.delivery),
		takeAway: Boolean(imported.takeAway),
		glutenFree: Boolean(imported.glutenFree),
		imageCount: 0,
		createdAt: new Date().toISOString(),
	};
	restaurants.unshift(restaurant);
	establishmentTypesForImport.forEach((type) => {
		if (!establishmentTypes.some((item) => item.toLocaleLowerCase('es') === type.toLocaleLowerCase('es'))) establishmentTypes.push(type);
		removedEstablishmentTypes = removedEstablishmentTypes.filter((item) => item.toLocaleLowerCase('es') !== type.toLocaleLowerCase('es'));
	});
	saveEstablishmentSettings();
	await saveRestaurants();
	const imageCount = await saveImportedMedia(restaurantId, imported).catch(() => 0);
	restaurant.imageCount = imageCount;
	await saveRestaurants();
	return restaurant;
}

async function applyImportedRestaurant(imported: ImportedRestaurant) {
	await openForm();
	form.classList.add('importing-record');
	['city', 'province', 'country'].forEach((name) => {
		const field = form.elements.namedItem(name) as HTMLInputElement | null;
		if (field) field.value = '';
	});
	setImportedField('name', imported.name);
	setImportedField('description', imported.description);
	selectedTags = imported.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
	renderSelectedTags();
	if (['1', '2', '3', '4', '5'].includes(imported.rating ?? '')) setImportedField('rating', imported.rating);
	setImportedField('address', imported.address);
	setImportedField('neighborhood', ensureNeighborhoodOption(imported.neighborhood));
	setImportedField('city', ensureLocationOption('city', imported.city));
	setImportedField('province', ensureLocationOption('province', imported.province));
	setImportedField('country', ensureLocationOption('country', imported.country));
	setImportedField('phone', imported.phone);
	setImportedField('mobile', imported.mobile);
	setImportedField('website', imported.website);
	setImportedField('googleUrl', imported.googleUrl);
	setImportedField('menuUrl', imported.menuUrl);
	setImportedField('mapUrl', imported.mapUrl);
	setImportedField('instagramUrl', imported.instagramUrl);
	setImportedField('tiktokUrl', imported.tiktokUrl);
	setImportedField('facebookUrl', imported.facebookUrl);
	setImportedField('wokiUrl', imported.wokiUrl);
	setImportedField('tripAdvisorUrl', imported.tripAdvisorUrl);
	setImportedField('linktreeUrl', imported.linktreeUrl);
	loadScheduleFromText(imported.hours ?? '');
	if (['$', '$$', '$$$', '$$$$'].includes(imported.price ?? '')) setImportedField('price', imported.price);
	setImportedField('averagePrice', imported.averagePrice);
	setImportedField('score', imported.score);
	(form.elements.namedItem('delivery') as HTMLInputElement).checked = Boolean(imported.delivery);
	(form.elements.namedItem('takeAway') as HTMLInputElement).checked = Boolean(imported.takeAway);
	(form.elements.namedItem('glutenFree') as HTMLInputElement).checked = Boolean(imported.glutenFree);

	selectedEstablishments = capitalizedCatalogValues((imported.establishmentTypes ?? ['Restaurante']).filter(Boolean));
	selectedEstablishments.forEach((type) => {
		if (!establishmentTypes.some((item) => item.toLocaleLowerCase('es') === type.toLocaleLowerCase('es'))) establishmentTypes.push(type);
		removedEstablishmentTypes = removedEstablishmentTypes.filter((item) => item.toLocaleLowerCase('es') !== type.toLocaleLowerCase('es'));
	});
	selectedCuisines = [];
	saveEstablishmentSettings();
	saveCuisineSettings();
	renderSelectedEstablishments();
	renderEstablishmentOptions(true);
	renderSelectedCuisines();
	renderCuisineOptions();

	updateExternalLink(linktreeInput, openLinktree);
	updateExternalLink(menuUrlInput, openMenuLink);
	updateExternalLink(websiteInput, openWebsite);
	updateExternalLink(googleInput, openGoogle);
	updateExternalLink(mapUrlInput, openMap);
	updateExternalLink(instagramInput, openInstagram);
	updateExternalLink(tiktokInput, openTiktok);
	updateExternalLink(facebookInput, openFacebook);
	updateExternalLink(wokiInput, openWoki);
	updateExternalLink(tripAdvisorInput, openTripAdvisor);
	updateWhatsAppWebLink();
	updateClearButtons();
	form.dispatchEvent(new Event('input', { bubbles: true }));

	const [logoFile, imageFiles] = await Promise.all([
		imported.logo ? downloadImportedImage(imported.logo, 'logo-importado') : Promise.resolve(null),
		Promise.all((imported.images ?? []).slice(0, MAX_IMAGES).map((url, index) => downloadImportedImage(url, `imagen-importada-${index + 1}`))),
	]);
	if (logoFile) setRestaurantLogo(logoFile);
	const validImages = imageFiles.filter((file): file is File => Boolean(file));
	if (validImages.length) addImageFiles(validImages);
	showToast(`Importación lista para revisar${validImages.length ? ` · ${validImages.length} imágenes` : ''}`);
}

document.querySelectorAll<HTMLElement>('[data-open-form]').forEach((button) => button.addEventListener('click', () => {
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	void openForm();
}));
document.querySelectorAll<HTMLButtonElement>('[data-open-name-import]').forEach((button) => button.addEventListener('click', () => {
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	nameImportForm.reset();
	nameImportProgress.hidden = true;
	nameImportProgress.classList.remove('is-error');
	nameImportProgress.textContent = '';
	searchNameImport.disabled = false;
	searchNameImport.textContent = 'Buscar e importar';
	nameImportDialog.showModal();
	window.setTimeout(() => placeSearchName.focus(), 50);
}));
cancelNameImport.addEventListener('click', () => nameImportDialog.close());
nameImportForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const name = placeSearchName.value.trim();
	if (name.length < 2) {
		nameImportProgress.hidden = false;
		nameImportProgress.classList.add('is-error');
		nameImportProgress.textContent = 'Ingresá el nombre del lugar que querés buscar';
		placeSearchName.focus();
		return;
	}
	searchNameImport.disabled = true;
	cancelNameImport.disabled = true;
	searchNameImport.textContent = 'Buscando…';
	nameImportProgress.hidden = false;
	nameImportProgress.classList.remove('is-error');
	nameImportProgress.textContent = 'Buscando el lugar y sus datos en Google…';
	try {
		const response = await fetch('/api/search-google-place', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		});
		const result = await response.json() as ImportedRestaurant & { error?: string };
		if (!response.ok) throw new Error(result.error || 'No se pudo buscar el lugar en Google');
		nameImportDialog.close();
		await applyImportedRestaurant(result);
		showToast('Datos encontrados en Google. Revisalos antes de guardar.');
	} catch (error) {
		const message = error instanceof Error ? error.message : 'No se pudo buscar el lugar en Google';
		nameImportProgress.hidden = false;
		nameImportProgress.classList.add('is-error');
		nameImportProgress.textContent = message;
		showToast(message);
	} finally {
		searchNameImport.disabled = false;
		cancelNameImport.disabled = false;
		searchNameImport.textContent = 'Buscar e importar';
	}
});

const SPREADSHEET_HEADER_ALIASES: Record<string, keyof SpreadsheetRestaurant> = {
	nombre: 'name', 'nombre del lugar': 'name', restaurante: 'name',
	descripcion: 'description', detalle: 'description',
	lugar: 'establishmentTypes', 'tipo de lugar': 'establishmentTypes', 'tipos de lugar': 'establishmentTypes', categoria: 'establishmentTypes',
	cocina: 'cuisines', 'tipo de cocina': 'cuisines', 'tipos de cocina': 'cuisines',
	servicio: 'mealTypes', servicios: 'mealTypes',
	etiqueta: 'tags', etiquetas: 'tags', tags: 'tags',
	calificacion: 'rating', rating: 'rating', puntaje: 'score', puntuacion: 'score', score: 'score',
	precio: 'price', 'nivel de precio': 'price',
	'precio promedio': 'averagePrice', 'precio promedio por persona': 'averagePrice',
	pais: 'country', provincia: 'province', ciudad: 'city', direccion: 'address', domicilio: 'address', barrio: 'neighborhood',
	telefono: 'phone', 'telefono fijo': 'phone', celular: 'mobile', movil: 'mobile', whatsapp: 'mobile',
	web: 'website', 'sitio web': 'website', website: 'website', 'pagina web': 'website', 'link a la pagina web': 'website', 'link pagina web': 'website',
	google: 'googleUrl', 'url google': 'googleUrl', 'link de google': 'googleUrl', 'link a google': 'googleUrl',
	linktree: 'linktreeUrl', menu: 'menuUrl', 'url menu': 'menuUrl', 'link al menu': 'menuUrl', 'link a menu': 'menuUrl',
	instagram: 'instagramUrl', 'link al instagram': 'instagramUrl', 'link a instagram': 'instagramUrl',
	tiktok: 'tiktokUrl', 'link al tiktok': 'tiktokUrl', 'link a tiktok': 'tiktokUrl',
	facebook: 'facebookUrl', 'link al facebook': 'facebookUrl', 'link a facebook': 'facebookUrl',
	woki: 'wokiUrl', 'link a woki': 'wokiUrl', tripadvisor: 'tripAdvisorUrl', 'link a tripadvisor': 'tripAdvisorUrl',
	mapa: 'mapUrl', 'url mapa': 'mapUrl', 'google maps': 'mapUrl', 'link a google maps': 'mapUrl',
	horario: 'hours', horarios: 'hours', 'horarios de lunes a viernes': 'hours', 'horario de lunes a viernes': 'hours', notas: 'notes', observaciones: 'notes',
	favorito: 'favorite', favorita: 'favorite', visitado: 'visited', visitada: 'visited', delivery: 'delivery', 'take away': 'takeAway', takeaway: 'takeAway', 'sin gluten': 'glutenFree', glutenfree: 'glutenFree',
};

function normalizeSpreadsheetHeader(value: string) {
	return value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function spreadsheetCellText(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toLocaleDateString('es-AR');
	if (typeof value !== 'object') return String(value).trim();
	const cell = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: unknown }> };
	if (cell.text !== undefined) return String(cell.text).trim();
	if (cell.result !== undefined) return spreadsheetCellText(cell.result);
	if (Array.isArray(cell.richText)) return cell.richText.map((part) => String(part.text ?? '')).join('').trim();
	return '';
}

function parseDelimitedText(source: string): string[][] {
	const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
	const delimiters = [',', ';', '\t'];
	const delimiter = delimiters.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
	const rows: string[][] = [];
	let row: string[] = [];
	let value = '';
	let quoted = false;
	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (character === '"') {
			if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
			else quoted = !quoted;
		} else if (character === delimiter && !quoted) {
			row.push(value.trim()); value = '';
		} else if ((character === '\n' || character === '\r') && !quoted) {
			if (character === '\r' && source[index + 1] === '\n') index += 1;
			row.push(value.trim());
			if (row.some(Boolean)) rows.push(row);
			row = []; value = '';
		} else value += character;
	}
	row.push(value.trim());
	if (row.some(Boolean)) rows.push(row);
	return rows;
}

async function readSpreadsheet(file: File): Promise<Array<{ rowNumber: number; cells: string[] }>> {
	if (file.name.toLocaleLowerCase('es').endsWith('.csv')) {
		return parseDelimitedText(await file.text()).map((cells, index) => ({ rowNumber: index + 1, cells }));
	}
	const { default: readXlsxFile } = await import('read-excel-file/browser');
	const sheets = await readXlsxFile(file);
	const rows = sheets[0]?.data;
	if (!rows) throw new Error('La planilla no contiene hojas');
	return rows
		.map((cells, index) => ({ rowNumber: index + 1, cells: cells.map(spreadsheetCellText) }))
		.filter(({ cells }) => cells.some(Boolean));
}

function splitSpreadsheetValues(value: string) {
	return [...new Set(value.split(/[,;|/\n]+/).map((item) => item.trim()).filter(Boolean))];
}

function spreadsheetBoolean(value: string) {
	return ['si', 'sí', 'true', 'verdadero', '1', 'x'].includes(value.trim().toLocaleLowerCase('es'));
}

function emptySpreadsheetRestaurant(): SpreadsheetRestaurant {
	return {
		name: '', description: '', establishmentTypes: [], cuisines: [], tags: '', rating: '', mealTypes: [], price: '', averagePrice: '', score: '',
		country: '', province: '', city: '', address: '', neighborhood: '', phone: '', mobile: '', website: '', googleUrl: '', linktreeUrl: '',
		menuUrl: '', tiktokUrl: '', instagramUrl: '', facebookUrl: '', wokiUrl: '', tripAdvisorUrl: '', mapUrl: '', hours: '', notes: '', favorite: false, visited: false, delivery: false, takeAway: false, glutenFree: false,
	};
}

function spreadsheetRowsToPreview(rows: Array<{ rowNumber: number; cells: string[] }>): SpreadsheetPreviewRow[] {
	if (rows.length < 2) throw new Error('La planilla debe incluir encabezados y al menos un lugar');
	const headerRow = rows[0];
	const columns = headerRow.cells.map((header) => SPREADSHEET_HEADER_ALIASES[normalizeSpreadsheetHeader(header)]);
	if (!columns.includes('name')) throw new Error('No se encontró la columna obligatoria “Nombre”');
	return rows.slice(1).filter(({ cells }) => cells.some((cell) => cell.trim())).map(({ rowNumber, cells }) => {
		const data = emptySpreadsheetRestaurant();
		columns.forEach((column, index) => {
			if (!column) return;
			const value = cells[index]?.trim() ?? '';
			if (column === 'establishmentTypes' || column === 'cuisines') data[column] = capitalizedCatalogValues(splitSpreadsheetValues(value));
			else if (column === 'mealTypes') data[column] = splitSpreadsheetValues(value);
			else if (column === 'favorite' || column === 'visited' || column === 'delivery' || column === 'takeAway' || column === 'glutenFree') data[column] = spreadsheetBoolean(value);
			else data[column] = value;
		});
		data.rating = ['1', '2', '3', '4', '5'].includes(data.rating) ? data.rating : '';
		data.score = /^\d+(?:[.,]\d+)?$/.test(data.score) && Number(data.score.replace(',', '.')) <= 10 ? data.score.replace(',', '.') : '';
		data.price = ['$','$$','$$$','$$$$'].includes(data.price.replace(/\s/g, '')) ? data.price.replace(/\s/g, '') : '';
		return { rowNumber, data, error: data.name ? '' : 'Falta el nombre' };
	});
}

function renderSpreadsheetPreview() {
	const valid = spreadsheetPreviewRows.filter((row) => !row.error).length;
	const invalid = spreadsheetPreviewRows.length - valid;
	excelImportSummary.textContent = `${valid} ${valid === 1 ? 'lugar listo' : 'lugares listos'}${invalid ? ` · ${invalid} ${invalid === 1 ? 'fila omitida' : 'filas omitidas'}` : ''}`;
	excelImportPreviewBody.innerHTML = spreadsheetPreviewRows.slice(0, 200).map(({ rowNumber, data, error }) => `
		<tr class="${error ? 'is-invalid' : ''}"><td>${rowNumber}</td><td>${safe(data.name || 'Sin nombre')}</td><td>${safe(data.establishmentTypes.join(', ') || '—')}</td><td>${safe(data.city || '—')}</td><td>${safe(error || 'Lista')}</td></tr>`).join('');
	excelImportPreview.hidden = false;
	importExcelButton.disabled = valid === 0;
}

function normalizedSpreadsheetIdentity(value: string) {
	return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findSpreadsheetRestaurant(data: SpreadsheetRestaurant, collection: Restaurant[]) {
	const name = normalizedSpreadsheetIdentity(data.name);
	const address = normalizedSpreadsheetIdentity(data.address);
	const city = normalizedSpreadsheetIdentity(data.city);
	const googleUrl = data.googleUrl.trim().replace(/\/$/, '').toLocaleLowerCase('es');
	const wokiUrl = data.wokiUrl.trim().replace(/\/$/, '').toLocaleLowerCase('es');
	return collection.find((restaurant) => {
		if (googleUrl && restaurant.googleUrl?.trim().replace(/\/$/, '').toLocaleLowerCase('es') === googleUrl) return true;
		if (wokiUrl && restaurant.wokiUrl?.trim().replace(/\/$/, '').toLocaleLowerCase('es') === wokiUrl) return true;
		if (normalizedSpreadsheetIdentity(restaurant.name) !== name) return false;
		if (address) return normalizedSpreadsheetIdentity(restaurant.address) === address;
		return Boolean(city) && normalizedSpreadsheetIdentity(restaurant.city) === city;
	});
}

function addSpreadsheetCatalogValue(values: string[], removed: string[], value: string, maxLength = 80) {
	const normalized = value.trim().slice(0, maxLength);
	if (!normalized) return '';
	const existing = values.find((item) => item.toLocaleLowerCase('es') === normalized.toLocaleLowerCase('es'));
	if (!existing) values.push(normalized);
	const canonical = existing ?? normalized;
	const removedIndex = removed.findIndex((item) => item.toLocaleLowerCase('es') === canonical.toLocaleLowerCase('es'));
	if (removedIndex >= 0) removed.splice(removedIndex, 1);
	return canonical;
}

function createRestaurantFromSpreadsheet(data: SpreadsheetRestaurant, index: number): Restaurant {
	const importedEstablishments = (data.establishmentTypes.length ? data.establishmentTypes : ['Restaurante'])
		.map((value) => addSpreadsheetCatalogValue(establishmentTypes, removedEstablishmentTypes, capitalizeFirstLetter(value))).filter(Boolean);
	const importedCuisines = data.cuisines.map((value) => addSpreadsheetCatalogValue(cuisines, removedCuisines, capitalizeFirstLetter(value))).filter(Boolean);
	const importedServices = data.mealTypes.map((value) => addSpreadsheetCatalogValue(serviceTypes, removedServiceTypes, value)).filter(Boolean);
	const neighborhood = addSpreadsheetCatalogValue(neighborhoods, removedNeighborhoods, data.neighborhood);
	const city = addSpreadsheetCatalogValue(cities, removedCities, data.city, 60);
	const province = addSpreadsheetCatalogValue(provinces, removedProvinces, data.province, 60);
	const country = addSpreadsheetCatalogValue(countries, removedCountries, data.country, 60);
	return {
		id: crypto.randomUUID(), name: data.name.trim(), description: data.description.trim(),
		establishmentType: importedEstablishments[0] ?? '', establishmentTypes: importedEstablishments,
		cuisine: importedCuisines[0] ?? '', cuisines: importedCuisines, tags: data.tags.trim(), rating: data.rating,
		mealTypes: importedServices, price: data.price, averagePrice: data.averagePrice.trim(), score: data.score, country, province, city,
		address: data.address.trim(), neighborhood, hasBranches: false, branchAddresses: [], phone: data.phone.trim(), mobile: data.mobile.trim(),
		website: data.website.trim(), googleUrl: data.googleUrl.trim(), linktreeUrl: data.linktreeUrl.trim(), menuUrl: data.menuUrl.trim(),
		tiktokUrl: data.tiktokUrl.trim(), instagramUrl: data.instagramUrl.trim(), facebookUrl: data.facebookUrl.trim(), wokiUrl: data.wokiUrl.trim(),
		tripAdvisorUrl: data.tripAdvisorUrl.trim(), mapUrl: data.mapUrl.trim(), hours: data.hours.trim(), notes: data.notes.trim(),
		favorite: data.favorite, visited: data.visited, checked: false, delivery: data.delivery, takeAway: data.takeAway, glutenFree: data.glutenFree, imageCount: 0, createdAt: new Date(Date.now() + index).toISOString(),
	};
}

function completeRestaurantFromSpreadsheet(existing: Restaurant, imported: Restaurant) {
	const before = JSON.stringify(existing);
	const textFields: Array<keyof Restaurant> = [
		'description', 'establishmentType', 'cuisine', 'tags', 'rating', 'score', 'price', 'averagePrice', 'country', 'province', 'city', 'address', 'neighborhood',
		'phone', 'mobile', 'website', 'googleUrl', 'linktreeUrl', 'menuUrl', 'tiktokUrl', 'instagramUrl', 'facebookUrl', 'wokiUrl', 'tripAdvisorUrl', 'mapUrl', 'hours', 'notes',
	];
	textFields.forEach((field) => {
		if (!existing[field] && imported[field]) (existing[field] as string) = imported[field] as string;
	});
	if (!existing.establishmentTypes?.length && imported.establishmentTypes?.length) existing.establishmentTypes = imported.establishmentTypes;
	if (!existing.cuisines?.length && imported.cuisines?.length) existing.cuisines = imported.cuisines;
	if (!existing.mealTypes?.length && imported.mealTypes?.length) existing.mealTypes = imported.mealTypes;
	existing.favorite = Boolean(existing.favorite || imported.favorite);
	existing.visited = Boolean(existing.visited || imported.visited);
	existing.delivery = Boolean(existing.delivery || imported.delivery);
	existing.takeAway = Boolean(existing.takeAway || imported.takeAway);
	existing.glutenFree = Boolean(existing.glutenFree || imported.glutenFree);
	return before !== JSON.stringify(existing);
}

openExcelImportButtons.forEach((button) => button.addEventListener('click', () => {
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	excelImportForm.reset();
	spreadsheetPreviewRows = [];
	excelImportProgress.hidden = true;
	excelImportProgress.classList.remove('is-error');
	excelImportPreview.hidden = true;
	excelImportPreviewBody.innerHTML = '';
	importExcelButton.disabled = true;
	importExcelButton.textContent = 'Importar lugares';
	excelImportDialog.showModal();
}));

cancelExcelImport.addEventListener('click', () => excelImportDialog.close());

excelImportFile.addEventListener('change', async () => {
	spreadsheetPreviewRows = [];
	excelImportPreview.hidden = true;
	importExcelButton.disabled = true;
	const file = excelImportFile.files?.[0];
	if (!file) return;
	excelImportProgress.hidden = false;
	excelImportProgress.classList.remove('is-error');
	excelImportProgress.textContent = 'Leyendo la planilla…';
	try {
		spreadsheetPreviewRows = spreadsheetRowsToPreview(await readSpreadsheet(file));
		if (!spreadsheetPreviewRows.length) throw new Error('La planilla no contiene lugares para importar');
		renderSpreadsheetPreview();
		excelImportProgress.hidden = true;
	} catch (error) {
		excelImportProgress.classList.add('is-error');
		excelImportProgress.textContent = error instanceof Error ? error.message : 'No se pudo leer la planilla';
	}
});

excelImportForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const validRows = spreadsheetPreviewRows.filter((row) => !row.error);
	if (!validRows.length) return;
	importExcelButton.disabled = true;
	cancelExcelImport.disabled = true;
	importExcelButton.textContent = 'Importando…';
	excelImportProgress.hidden = false;
	excelImportProgress.classList.remove('is-error');
	excelImportProgress.textContent = `Guardando ${validRows.length} lugares…`;
	const previousRestaurants = structuredClone(restaurants);
	const catalogSnapshot = structuredClone({ cuisines, removedCuisines, establishmentTypes, removedEstablishmentTypes, serviceTypes, removedServiceTypes, neighborhoods, removedNeighborhoods, cities, removedCities, provinces, removedProvinces, countries, removedCountries });
	try {
		backupRestaurants();
		const imported: Restaurant[] = [];
		let updated = 0;
		let skipped = 0;
		validRows.forEach(({ data }, index) => {
			const existing = findSpreadsheetRestaurant(data, [...restaurants, ...imported]);
			const spreadsheetRestaurant = createRestaurantFromSpreadsheet(data, index);
			if (!existing) { imported.push(spreadsheetRestaurant); return; }
			if (completeRestaurantFromSpreadsheet(existing, spreadsheetRestaurant)) updated += 1;
			else skipped += 1;
		});
		if (!imported.length && !updated) throw new Error('Los lugares ya existen y no tienen datos nuevos para completar');
		restaurants.unshift(...imported);
		if (!await saveRestaurants()) throw new Error('No se pudieron guardar los lugares importados');
		[cuisines, establishmentTypes, serviceTypes, neighborhoods, cities, provinces, countries].forEach((values) => values.sort((a, b) => a.localeCompare(b, 'es')));
		persistCatalogSettings();
		renderEstablishmentFilterOptions();
		renderCuisineFilterOptions();
		renderServiceFilterOptions();
		render();
		const resultParts = [`${imported.length} nuevos`, `${updated} actualizados`];
		if (skipped) resultParts.push(`${skipped} sin cambios`);
		excelImportProgress.textContent = `Listo: ${resultParts.join(' · ')}.`;
		showToast(resultParts.join(' · '));
		spreadsheetPreviewRows = [];
		window.setTimeout(() => excelImportDialog.close(), 900);
	} catch (error) {
		restaurants = previousRestaurants;
		({ cuisines, removedCuisines, establishmentTypes, removedEstablishmentTypes, serviceTypes, removedServiceTypes, neighborhoods, removedNeighborhoods, cities, removedCities, provinces, removedProvinces, countries, removedCountries } = catalogSnapshot);
		excelImportProgress.classList.add('is-error');
		excelImportProgress.textContent = error instanceof Error ? error.message : 'No se pudo completar la importación';
		render();
	} finally {
		cancelExcelImport.disabled = false;
		importExcelButton.disabled = spreadsheetPreviewRows.every((row) => Boolean(row.error));
		importExcelButton.textContent = 'Importar lugares';
	}
});

openUrlImportButton.addEventListener('click', () => {
	openUrlImportButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	urlImportForm.reset();
	urlImportProgress.hidden = true;
	urlImportProgress.classList.remove('is-error');
	urlImportProgress.textContent = '';
	clearUrlImport.disabled = false;
	pasteUrlImport.disabled = false;
	cancelUrlImport.disabled = false;
	importUrlButton.disabled = false;
	finishUrlImport.disabled = false;
	importUrlButton.textContent = 'Importar';
	urlImportDialog.showModal();
	window.setTimeout(() => restaurantSourceUrl.focus(), 50);
});
cancelUrlImport.addEventListener('click', () => urlImportDialog.close());
finishUrlImport.addEventListener('click', () => urlImportDialog.close());
clearUrlImport.addEventListener('click', () => {
	restaurantSourceUrl.value = '';
	restaurantSourceUrl.dispatchEvent(new Event('input', { bubbles: true }));
	urlImportProgress.hidden = true;
	urlImportProgress.classList.remove('is-error');
	urlImportProgress.textContent = '';
	restaurantSourceUrl.focus();
	showToast('Texto borrado');
});
pasteUrlImport.addEventListener('click', async () => {
	try {
		const clipboardText = await navigator.clipboard.readText();
		if (!clipboardText.trim()) {
			showToast('El portapapeles no contiene texto');
			return;
		}
		const start = restaurantSourceUrl.selectionStart ?? restaurantSourceUrl.value.length;
		const end = restaurantSourceUrl.selectionEnd ?? start;
		restaurantSourceUrl.setRangeText(clipboardText, start, end, 'end');
		restaurantSourceUrl.dispatchEvent(new Event('input', { bubbles: true }));
		restaurantSourceUrl.focus();
		showToast('Enlaces pegados');
	} catch {
		showToast('El navegador no permitiÃ³ acceder al portapapeles');
	}
});
urlImportForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	let urls = getImportUrls(restaurantSourceUrl.value);
	if (!urls.length) {
		urlImportProgress.hidden = false;
		urlImportProgress.classList.add('is-error');
		urlImportProgress.textContent = 'Pegá al menos un enlace válido que comience con http:// o https://';
		restaurantSourceUrl.focus();
		return;
	}
	clearUrlImport.disabled = true;
	pasteUrlImport.disabled = true;
	importUrlButton.disabled = true;
	cancelUrlImport.disabled = true;
	finishUrlImport.disabled = true;
	importUrlButton.textContent = urls.length > 1 ? `Importando 1 de ${urls.length}…` : 'Importando…';
	urlImportProgress.hidden = false;
	urlImportProgress.classList.remove('is-error');
	urlImportProgress.textContent = urls.length > 1 ? `Preparando la importación de ${urls.length} restaurantes…` : 'Leyendo la página…';
	try {
		if (urls.length === 1) {
			const result = await fetchImportedRestaurant(urls[0]);
			if (result.collectionUrls?.length) {
				urls = [...new Set(result.collectionUrls)];
				importUrlButton.textContent = `Importando 1 de ${urls.length}…`;
				urlImportProgress.textContent = `Woki: se encontraron ${urls.length} lugares únicos. Preparando la importación…`;
			} else {
				urlImportDialog.close();
				await applyImportedRestaurant(result);
				return;
			}
		}

		backupRestaurants();
		const importedNames: string[] = [];
		const skippedNames: string[] = [];
		const failures: Array<{ url: string; message: string }> = [];
		for (let index = 0; index < urls.length; index += 1) {
			const url = urls[index];
			importUrlButton.textContent = `Importando ${index + 1} de ${urls.length}…`;
			urlImportProgress.textContent = `${index + 1} de ${urls.length} · ${new URL(url).hostname}`;
			try {
				const imported = await fetchImportedRestaurant(url);
				const normalizedWokiUrl = imported.wokiUrl?.replace(/\/$/, '').toLocaleLowerCase('es');
				const duplicate = restaurants.some((restaurant) =>
					(Boolean(normalizedWokiUrl) && restaurant.wokiUrl?.replace(/\/$/, '').toLocaleLowerCase('es') === normalizedWokiUrl)
					|| (restaurant.name.trim().toLocaleLowerCase('es') === imported.name?.trim().toLocaleLowerCase('es')
						&& Boolean(restaurant.address) && restaurant.address.trim().toLocaleLowerCase('es') === imported.address?.trim().toLocaleLowerCase('es')));
				if (duplicate) {
					skippedNames.push(imported.name?.trim() || new URL(url).pathname.split('/').filter(Boolean).at(-1) || 'Lugar existente');
					continue;
				}
				const restaurant = await saveImportedRestaurant(imported);
				importedNames.push(restaurant.name);
			} catch (error) {
				failures.push({ url, message: error instanceof Error ? error.message : 'No se pudo importar' });
			}
		}
		saveEstablishmentSettings();
		renderEstablishmentFilterOptions();
		render();
		if (!failures.length) {
			urlImportProgress.textContent = `Listo: se importaron ${importedNames.length} lugares${skippedNames.length ? ` y se omitieron ${skippedNames.length} que ya existían` : ''}.`;
			showToast(`${importedNames.length} lugares importados${skippedNames.length ? ` · ${skippedNames.length} existentes` : ''}`);
		} else {
			urlImportProgress.classList.add('is-error');
			const failedHosts = failures.map(({ url }) => new URL(url).hostname).join(', ');
			urlImportProgress.textContent = `Se importaron ${importedNames.length} de ${urls.length}${skippedNames.length ? `; ${skippedNames.length} ya existían` : ''}. No se pudieron leer: ${failedHosts}.`;
			showToast(`${importedNames.length} importados · ${failures.length} con error`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'No se pudo importar la página';
		urlImportProgress.hidden = false;
		urlImportProgress.classList.add('is-error');
		urlImportProgress.textContent = message;
		showToast(message);
	} finally {
		clearUrlImport.disabled = false;
		pasteUrlImport.disabled = false;
		cancelUrlImport.disabled = false;
		importUrlButton.disabled = false;
		finishUrlImport.disabled = false;
		importUrlButton.textContent = 'Importar';
	}
});
function navigateVisibleRestaurant(direction: -1 | 1) {
	if (!activeRestaurantId || !form.classList.contains('view-mode')) return;
	const currentIndex = visibleRestaurantIds.indexOf(activeRestaurantId);
	const targetId = visibleRestaurantIds[currentIndex + direction];
	const target = restaurants.find((restaurant) => restaurant.id === targetId);
	if (!target) return;
	const activeTab = [...formTabs].find((tab) => tab.classList.contains('active'))?.dataset.formTab ?? 'general';
	void openForm(target, true, activeTab);
}
previousRestaurantButton.addEventListener('click', () => navigateVisibleRestaurant(-1));
nextRestaurantButton.addEventListener('click', () => navigateVisibleRestaurant(1));
viewEditButton.addEventListener('click', () => {
	form.classList.remove('view-mode');
	form.classList.add('editing-record');
	restaurantRecordNavigation.hidden = true;
	placeMapField(false);
	updateViewEmptyFields(false);
	viewEditButton.hidden = true;
	closeFormButton.textContent = 'Cancelar';
	form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
		.forEach((control) => { control.disabled = false; });
	updateMapPreview(false);
	updateClearButtons();
	baselineFormState = captureFormState();
	dirtyTrackingReady = true;
	updateDirtyState();
});
document.querySelectorAll<HTMLElement>('[data-close-form]').forEach((button) => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('close', () => {
	activeRestaurantId = null;
	closeCuisineDropdown();
	closeTagDropdown();
	closeNeighborhoodDropdown();
	(['city', 'province', 'country'] as LocationOptionKind[]).forEach(closeLocationDropdown);
	closeEstablishmentDropdown();
	closeServiceDropdown();
	clearPreviewUrls();
});
formTabs.forEach((tab) => tab.addEventListener('click', () => activateFormTab(tab.dataset.formTab!)));
form.addEventListener('input', updateDirtyState);
form.addEventListener('change', updateDirtyState);
function commitCuisineInput(createIfMissing: boolean) {
	const entered = cuisineSelect.value.trim();
	if (!entered) return;
	const existing = cuisines.find((cuisine) => cuisine.toLocaleLowerCase('es') === entered.toLocaleLowerCase('es'));
	if (existing) {
		addCuisineSelection(existing);
		return;
	}
	if (!createIfMissing) return;
	const cuisine = capitalizeFirstLetter(entered.slice(0, 50));
	cuisines.push(cuisine);
	cuisines.sort((a, b) => a.localeCompare(b, 'es'));
	removedCuisines = removedCuisines.filter((item) => item.toLocaleLowerCase('es') !== cuisine.toLocaleLowerCase('es'));
	saveCuisineSettings();
	addCuisineSelection(cuisine);
	showToast('Tipo de cocina agregado');
}
function openCuisineDropdown() {
	if (cuisineSelect.disabled) return;
	renderCuisineOptions(false);
	cuisineOptions.hidden = false;
	cuisineSelect.setAttribute('aria-expanded', 'true');
}

function closeCuisineDropdown() {
	cuisineOptions.hidden = true;
	cuisineSelect.setAttribute('aria-expanded', 'false');
}

cuisineSelect.addEventListener('focus', openCuisineDropdown);
cuisineSelect.addEventListener('click', openCuisineDropdown);
cuisineSelect.addEventListener('input', () => {
	openCuisineDropdown();
	renderCuisineOptions(false);
});
cuisineSelect.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeCuisineDropdown();
		return;
	}
	if (event.key === 'Enter') {
		event.preventDefault();
		commitCuisineInput(true);
		openCuisineDropdown();
	}
});
cuisineOptions.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const deleteButton = target.closest<HTMLButtonElement>('[data-dropdown-delete-cuisine]');
	if (deleteButton?.dataset.dropdownDeleteCuisine) {
		deleteCuisineOption(deleteButton.dataset.dropdownDeleteCuisine);
		cuisineSelect.focus();
		openCuisineDropdown();
		return;
	}
	const selectButton = target.closest<HTMLButtonElement>('[data-select-cuisine]');
	if (selectButton?.dataset.selectCuisine) {
		addCuisineSelection(selectButton.dataset.selectCuisine);
		cuisineSelect.focus();
		openCuisineDropdown();
		return;
	}
	if (target.closest('[data-create-cuisine]')) {
		commitCuisineInput(true);
		cuisineSelect.focus();
		openCuisineDropdown();
	}
});
neighborhoodInput.addEventListener('focus', openNeighborhoodDropdown);
neighborhoodInput.addEventListener('click', openNeighborhoodDropdown);
neighborhoodInput.addEventListener('input', () => {
	openNeighborhoodDropdown();
	renderNeighborhoodOptions();
});
neighborhoodInput.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeNeighborhoodDropdown();
		return;
	}
	if (event.key === 'Enter') {
		event.preventDefault();
		commitNeighborhoodInput();
		closeNeighborhoodDropdown();
	}
});
neighborhoodOptions.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const deleteButton = target.closest<HTMLButtonElement>('[data-delete-neighborhood]');
	if (deleteButton?.dataset.deleteNeighborhood) {
		deleteNeighborhoodOption(deleteButton.dataset.deleteNeighborhood);
		neighborhoodInput.focus();
		openNeighborhoodDropdown();
		return;
	}
	const selectButton = target.closest<HTMLButtonElement>('[data-select-neighborhood]');
	if (selectButton?.dataset.selectNeighborhood) {
		neighborhoodInput.value = selectButton.dataset.selectNeighborhood;
		neighborhoodInput.dispatchEvent(new Event('input', { bubbles: true }));
		closeNeighborhoodDropdown();
		neighborhoodInput.focus({ preventScroll: true });
		return;
	}
	if (target.closest('[data-create-neighborhood]')) {
		commitNeighborhoodInput();
		closeNeighborhoodDropdown();
		neighborhoodInput.focus({ preventScroll: true });
	}
});
(['city', 'province', 'country'] as LocationOptionKind[]).forEach((kind) => {
	const state = getLocationOptionState(kind);
	state.input.addEventListener('focus', () => openLocationDropdown(kind));
	state.input.addEventListener('click', () => openLocationDropdown(kind));
	state.input.addEventListener('input', () => {
		openLocationDropdown(kind);
		renderLocationOptions(kind);
	});
	state.input.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closeLocationDropdown(kind);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			commitLocationInput(kind);
			closeLocationDropdown(kind);
		}
	});
	state.optionsElement.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		const deleteButton = target.closest<HTMLButtonElement>('[data-delete-location]');
		if (deleteButton?.dataset.deleteLocation) {
			deleteLocationOption(kind, deleteButton.dataset.deleteLocation);
			state.input.focus();
			openLocationDropdown(kind);
			return;
		}
		const selectButton = target.closest<HTMLButtonElement>('[data-select-location]');
		if (selectButton?.dataset.selectLocation) {
			state.input.value = selectButton.dataset.selectLocation;
			state.input.dispatchEvent(new Event('input', { bubbles: true }));
			closeLocationDropdown(kind);
			state.input.focus({ preventScroll: true });
			return;
		}
		if (target.closest('[data-create-location]')) {
			commitLocationInput(kind);
			closeLocationDropdown(kind);
			state.input.focus({ preventScroll: true });
		}
	});
});
document.addEventListener('pointerdown', (event) => {
	if (!cuisineCombobox.contains(event.target as Node)) closeCuisineDropdown();
	if (!tagCombobox.contains(event.target as Node)) closeTagDropdown();
	if (!neighborhoodCombobox.contains(event.target as Node)) closeNeighborhoodDropdown();
	(['city', 'province', 'country'] as LocationOptionKind[]).forEach((kind) => {
		if (!getLocationOptionState(kind).combobox.contains(event.target as Node)) closeLocationDropdown(kind);
	});
	if (!establishmentCombobox.contains(event.target as Node)) closeEstablishmentDropdown();
	if (!serviceCombobox.contains(event.target as Node)) closeServiceDropdown();
});
selectedCuisinesContainer.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-cuisine]');
	if (!button) return;
	selectedCuisines = selectedCuisines.filter((cuisine) => cuisine !== button.dataset.removeCuisine);
	renderSelectedCuisines();
	renderCuisineOptions();
	updateDirtyState();
});

tagInput.addEventListener('focus', openTagDropdown);
tagInput.addEventListener('click', openTagDropdown);
tagInput.addEventListener('input', () => {
	openTagDropdown();
	renderTagOptions();
});
tagInput.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeTagDropdown();
		return;
	}
	if (event.key !== 'Enter') return;
	event.preventDefault();
	commitTagInput();
	openTagDropdown();
});
tagOptions.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const deleteButton = target.closest<HTMLButtonElement>('[data-delete-tag]');
	if (deleteButton?.dataset.deleteTag) {
		deleteTagOption(deleteButton.dataset.deleteTag);
		tagInput.focus();
		openTagDropdown();
		return;
	}
	const selectButton = target.closest<HTMLButtonElement>('[data-select-tag]');
	if (selectButton?.dataset.selectTag) {
		addTagSelection(selectButton.dataset.selectTag);
		tagInput.focus();
		openTagDropdown();
		return;
	}
	if (target.closest('[data-create-tag]')) {
		commitTagInput();
		tagInput.focus();
		openTagDropdown();
	}
});
manageTagsButton.addEventListener('click', () => {
	if (tagOptions.hidden) {
		openTagDropdown();
		tagInput.focus();
	} else {
		closeTagDropdown();
	}
});

selectedTagsContainer.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-tag]');
	if (!button) return;
	selectedTags = selectedTags.filter((tag) => tag !== button.dataset.removeTag);
	renderSelectedTags();
	renderTagOptions();
	updateDirtyState();
});
selectedCuisinesContainer.addEventListener('dragstart', (event) => {
	if (form.classList.contains('view-mode') || (event.target as HTMLElement).closest('button')) {
		event.preventDefault();
		return;
	}
	const option = (event.target as HTMLElement).closest<HTMLElement>('[data-cuisine-index]');
	if (!option) return;
	draggedCuisineIndex = Number(option.dataset.cuisineIndex);
	option.classList.add('dragging');
	event.dataTransfer!.effectAllowed = 'move';
});
selectedCuisinesContainer.addEventListener('dragover', (event) => {
	if (draggedCuisineIndex === null) return;
	event.preventDefault();
	const option = (event.target as HTMLElement).closest<HTMLElement>('[data-cuisine-index]');
	selectedCuisinesContainer.querySelectorAll('.drag-over').forEach((item) => item.classList.remove('drag-over'));
	if (option && Number(option.dataset.cuisineIndex) !== draggedCuisineIndex) option.classList.add('drag-over');
});
selectedCuisinesContainer.addEventListener('drop', (event) => {
	event.preventDefault();
	if (draggedCuisineIndex === null) return;
	const option = (event.target as HTMLElement).closest<HTMLElement>('[data-cuisine-index]');
	const targetIndex = option ? Number(option.dataset.cuisineIndex) : selectedCuisines.length - 1;
	if (targetIndex !== draggedCuisineIndex) {
		const [moved] = selectedCuisines.splice(draggedCuisineIndex, 1);
		selectedCuisines.splice(targetIndex, 0, moved);
		renderSelectedCuisines();
		renderCuisineOptions();
		updateDirtyState();
	}
	draggedCuisineIndex = null;
});
selectedCuisinesContainer.addEventListener('dragend', () => {
	draggedCuisineIndex = null;
	selectedCuisinesContainer.querySelectorAll('.dragging, .drag-over').forEach((item) => item.classList.remove('dragging', 'drag-over'));
});
establishmentSelect.addEventListener('focus', openEstablishmentDropdown);
establishmentSelect.addEventListener('click', openEstablishmentDropdown);
establishmentSelect.addEventListener('input', () => {
	openEstablishmentDropdown();
	renderEstablishmentOptions(false, false);
});
establishmentSelect.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeEstablishmentDropdown();
		return;
	}
	if (event.key === 'Enter') {
		event.preventDefault();
		commitEstablishmentInput();
		openEstablishmentDropdown();
	}
});
establishmentOptions.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const deleteButton = target.closest<HTMLButtonElement>('[data-delete-establishment]');
	if (deleteButton?.dataset.deleteEstablishment) {
		deleteEstablishmentOption(deleteButton.dataset.deleteEstablishment);
		establishmentSelect.focus();
		openEstablishmentDropdown();
		return;
	}
	const selectButton = target.closest<HTMLButtonElement>('[data-select-establishment]');
	if (selectButton?.dataset.selectEstablishment) {
		addEstablishmentSelection(selectButton.dataset.selectEstablishment);
		establishmentSelect.focus();
		openEstablishmentDropdown();
		return;
	}
	if (target.closest('[data-create-establishment]')) {
		commitEstablishmentInput();
		establishmentSelect.focus();
		openEstablishmentDropdown();
	}
});
selectedEstablishmentsContainer.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-establishment]');
	if (!button) return;
	selectedEstablishments = selectedEstablishments.filter((type) => type !== button.dataset.removeEstablishment);
	renderSelectedEstablishments();
	renderEstablishmentOptions();
	updateDirtyState();
});
serviceSelect.addEventListener('focus', openServiceDropdown);
serviceSelect.addEventListener('click', openServiceDropdown);
serviceSelect.addEventListener('input', () => {
	openServiceDropdown();
	renderServiceOptions(false);
});
serviceSelect.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeServiceDropdown();
		return;
	}
	if (event.key === 'Enter') {
		event.preventDefault();
		commitServiceInput();
		openServiceDropdown();
	}
});
serviceOptions.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const deleteButton = target.closest<HTMLButtonElement>('[data-delete-service]');
	if (deleteButton?.dataset.deleteService) {
		deleteServiceOption(deleteButton.dataset.deleteService);
		serviceSelect.focus();
		openServiceDropdown();
		return;
	}
	const selectButton = target.closest<HTMLButtonElement>('[data-select-service]');
	if (selectButton?.dataset.selectService) {
		addServiceSelection(selectButton.dataset.selectService);
		serviceSelect.focus();
		openServiceDropdown();
		return;
	}
	if (target.closest('[data-create-service]')) {
		commitServiceInput();
		serviceSelect.focus();
		openServiceDropdown();
	}
});
selectedServicesContainer.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-service]');
	if (!button) return;
	selectedServices = selectedServices.filter((service) => service !== button.dataset.removeService);
	renderSelectedServices();
	renderServiceOptions();
	updateDirtyState();
});
form.addEventListener('focusin', (event) => {
	if (isPasteTarget(event.target)) pasteTarget = event.target;
});
scheduleTable.addEventListener('input', () => updateHoursValue());
scheduleTable.addEventListener('paste', (event) => {
	const clipboardText = event.clipboardData?.getData('text/plain') ?? '';
	if (clipboardText && pasteScheduleText(clipboardText)) event.preventDefault();
});
pasteScheduleHoursButton.addEventListener('click', async () => {
	try {
		const clipboardText = await navigator.clipboard.readText();
		if (!clipboardText.trim()) {
			showToast('El portapapeles no contiene horarios');
			return;
		}
		if (!pasteScheduleText(clipboardText)) showToast('No se encontraron días y horarios en el texto copiado');
	} catch {
		showToast('El navegador no permitió acceder al portapapeles');
	}
});
clearScheduleHoursButton.addEventListener('click', () => {
	scheduleInputs.forEach((input) => {
		input.value = '';
		updateClearButton(input);
	});
	updateHoursValue();
	form.dispatchEvent(new Event('input', { bubbles: true }));
	showToast('Horarios borrados');
});
pasteTextButton.addEventListener('pointerdown', (event) => {
	if (pasteTarget) event.preventDefault();
});
pasteTextButton.addEventListener('click', async () => {
	if (!pasteTarget || !form.contains(pasteTarget) || pasteTarget.disabled || pasteTarget.readOnly) {
		showToast('Seleccioná primero el campo donde querés pegar el texto');
		return;
	}
	try {
		const clipboardText = await navigator.clipboard.readText();
		if (!clipboardText) {
			showToast('El portapapeles no contiene texto');
			return;
		}
		if (pasteTarget.classList.contains('schedule-hours-input') && pasteScheduleText(clipboardText)) {
			pasteTarget.focus();
			return;
		}
		const start = pasteTarget.selectionStart ?? pasteTarget.value.length;
		const end = pasteTarget.selectionEnd ?? start;
		pasteTarget.setRangeText(clipboardText, start, end, 'end');
		pasteTarget.dispatchEvent(new Event('input', { bubbles: true }));
		pasteTarget.focus();
		showToast('Texto pegado');
	} catch {
		showToast('El navegador no permitió acceder al portapapeles');
	}
});
linktreeInput.addEventListener('input', () => updateExternalLink(linktreeInput, openLinktree));
menuUrlInput.addEventListener('input', () => updateExternalLink(menuUrlInput, openMenuLink));
websiteInput.addEventListener('input', () => updateExternalLink(websiteInput, openWebsite));
googleInput.addEventListener('input', () => updateExternalLink(googleInput, openGoogle));
mapUrlInput.addEventListener('input', () => updateExternalLink(mapUrlInput, openMap));
instagramInput.addEventListener('input', () => updateExternalLink(instagramInput, openInstagram));
tiktokInput.addEventListener('input', () => updateExternalLink(tiktokInput, openTiktok));
facebookInput.addEventListener('input', () => updateExternalLink(facebookInput, openFacebook));
wokiInput.addEventListener('input', () => updateExternalLink(wokiInput, openWoki));
tripAdvisorInput.addEventListener('input', () => updateExternalLink(tripAdvisorInput, openTripAdvisor));
whatsappInput.addEventListener('input', updateWhatsAppWebLink);
countryInput.addEventListener('input', updateWhatsAppWebLink);
function renderSearchTerms() {
	searchTermsList.innerHTML = searchTerms.map((term, index) => `
		<span class="search-term-chip">
			${safe(term)}
			<button type="button" data-remove-search-term="${index}" aria-label="Quitar ${safe(term)}" title="Quitar">×</button>
		</span>
	`).join('');
	searchTermsRow.hidden = searchTerms.length === 0;
}

function clearSearchTerms() {
	searchTerms = [];
	search.value = '';
	renderSearchTerms();
}

search.addEventListener('input', render);
search.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	const term = search.value.trim();
	if (!term) return;
	if (!searchTerms.some((item) => item.toLocaleLowerCase('es') === term.toLocaleLowerCase('es'))) searchTerms.push(term);
	search.value = '';
	renderSearchTerms();
	render();
});
searchTermsList.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-search-term]');
	if (!button) return;
	searchTerms.splice(Number(button.dataset.removeSearchTerm), 1);
	renderSearchTerms();
	render();
});
clearSearchTermsButton.addEventListener('click', () => {
	clearSearchTerms();
	render();
	search.focus();
});
searchScopeInputs.forEach((input) => input.addEventListener('change', () => {
	if (!input.checked) return;
	searchScope = input.value === 'name' ? 'name' : 'keyword';
	render();
}));
directoryFilterPanel.addEventListener('change', (event) => {
	const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[type="checkbox"]');
	if (!input) return;
	const targetSet = input.hasAttribute('data-establishment-filter')
		? selectedEstablishmentFilters
		: input.hasAttribute('data-meal-filter')
			? selectedMealFilters
		: input.hasAttribute('data-cuisine-filter')
				? selectedCuisineFilters
				: input.hasAttribute('data-neighborhood-filter')
					? selectedNeighborhoodFilters
					: selectedCityFilters;
	if (input.checked) targetSet.add(input.value);
	else targetSet.delete(input.value);
	input.closest<HTMLDetailsElement>('.filter-multiselect')?.removeAttribute('open');
	updateDirectoryFilterLabels();
	render();
});
directoryFilterPanel.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-filter]');
	const value = button?.dataset.filterValue;
	if (!button || !value) return;
	const targetSet = button.dataset.removeFilter === 'establishment'
		? selectedEstablishmentFilters
		: button.dataset.removeFilter === 'meal'
			? selectedMealFilters
		: button.dataset.removeFilter === 'cuisine'
				? selectedCuisineFilters
				: button.dataset.removeFilter === 'neighborhood'
					? selectedNeighborhoodFilters
					: selectedCityFilters;
	targetSet.delete(value);
	updateDirectoryFilterLabels();
	render();
});
favoriteFilterButton.addEventListener('click', () => {
	favoriteFilterActive = !favoriteFilterActive;
	updateDirectoryFilterLabels();
	render();
});
visitedFilterButton.addEventListener('click', () => {
	visitedFilterActive = !visitedFilterActive;
	updateDirectoryFilterLabels();
	render();
});
function clearDirectoryFilterSelections() {
	selectedEstablishmentFilters.clear();
	selectedMealFilters.clear();
	selectedCuisineFilters.clear();
	selectedNeighborhoodFilters.clear();
	selectedCityFilters.clear();
	favoriteFilterActive = false;
	visitedFilterActive = false;
	directoryFilterPanel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { input.checked = false; });
	updateDirectoryFilterLabels();
}

clearDirectoryFiltersButton.addEventListener('click', () => {
	clearDirectoryFilterSelections();
	render();
});
toolbarImportUrl.addEventListener('click', () => openUrlImportButton.click());
document.querySelectorAll<HTMLButtonElement>('[data-directory-view]').forEach((button) => button.addEventListener('click', () => {
	directoryView = button.dataset.directoryView || 'normal';
	localStorage.setItem('restobox-directory-view', directoryView);
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	render();
}));
document.querySelectorAll<HTMLButtonElement>('[data-directory-sort]').forEach((button) => button.addEventListener('click', () => {
	directorySort = button.dataset.directorySort || 'recent';
	localStorage.setItem('restobox-directory-sort', directorySort);
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	render();
}));
document.querySelectorAll<HTMLDetailsElement>('.directory-action-menu').forEach((menu) => menu.addEventListener('toggle', () => {
	if (!menu.open) return;
	document.querySelectorAll<HTMLDetailsElement>('.directory-action-menu[open]').forEach((other) => {
		if (other !== menu) other.removeAttribute('open');
	});
}));
filterActionMenu.addEventListener('toggle', () => {
	directoryFilterPanel.hidden = !filterActionMenu.open;
	if (!filterActionMenu.open) directoryFilterPanel.querySelectorAll<HTMLDetailsElement>('.filter-multiselect[open]').forEach((menu) => menu.removeAttribute('open'));
});
directoryFilterPanel.querySelectorAll<HTMLDetailsElement>('.filter-multiselect').forEach((menu) => menu.addEventListener('toggle', () => {
	if (!menu.open) return;
	directoryFilterPanel.querySelectorAll<HTMLDetailsElement>('.filter-multiselect[open]').forEach((other) => {
		if (other !== menu) other.removeAttribute('open');
	});
}));

function renderCuisineManagementList() {
	cuisineOptionsList.innerHTML = cuisines.length ? cuisines.map((cuisine) => `
		<div class="option-management-item">
			<span>${safe(cuisine)}</span>
			<button type="button" data-delete-cuisine="${safe(cuisine)}" aria-label="Quitar ${safe(cuisine)} de la lista" title="Quitar de la lista">×</button>
		</div>`).join('') : '<div class="option-management-item"><span>No hay tipos de cocina</span></div>';
}

manageCuisinesButton.addEventListener('click', () => {
	if (cuisineOptions.hidden) {
		openCuisineDropdown();
		cuisineSelect.focus();
	} else {
		closeCuisineDropdown();
	}
});
document.querySelector<HTMLButtonElement>('#header-cuisines')?.addEventListener('click', () => {
	renderCuisineManagementList();
	manageCuisinesDialog.showModal();
});
closeManageCuisines.addEventListener('click', () => manageCuisinesDialog.close());
function deleteCuisineOption(cuisine: string) {
	backupRestaurants();
	cuisines = cuisines.filter((item) => item !== cuisine);
	removedCuisines = [...new Set([...removedCuisines, cuisine])];
	selectedCuisines = selectedCuisines.filter((item) => item !== cuisine);
	restaurants.forEach((restaurant) => {
		const remaining = getRestaurantCuisines(restaurant).filter((item) => item !== cuisine);
		restaurant.cuisines = remaining;
		restaurant.cuisine = remaining[0] ?? '';
	});
	saveRestaurants();
	saveCuisineSettings();
	renderSelectedCuisines();
	renderCuisineOptions();
	renderCuisineManagementList();
	render();
	updateDirtyState();
	showToast('Tipo de cocina eliminado');
}
cuisineOptionsList.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-delete-cuisine]');
	const cuisine = button?.dataset.deleteCuisine;
	if (!cuisine) return;
	deleteCuisineOption(cuisine);
});

logoInput.addEventListener('change', () => {
	setRestaurantLogo(logoInput.files?.[0]);
	logoInput.value = '';
});
logoDropZone.addEventListener('click', (event) => {
	if ((event.target as HTMLElement).closest('#remove-logo')) return;
	logoInput.click();
});
logoDropZone.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		logoInput.click();
	}
});
logoDropZone.addEventListener('dragover', (event) => {
	event.preventDefault();
	event.dataTransfer!.dropEffect = 'copy';
	logoDropZone.classList.add('dragging');
});
logoDropZone.addEventListener('dragleave', (event) => {
	if (!logoDropZone.contains(event.relatedTarget as Node | null)) logoDropZone.classList.remove('dragging');
});
logoDropZone.addEventListener('drop', (event) => {
	event.preventDefault();
	logoDropZone.classList.remove('dragging');
	const file = event.dataTransfer?.files[0];
	if (file) setRestaurantLogo(file);
	else if (event.dataTransfer) void addDroppedWebLogo(event.dataTransfer);
});
removeLogoButton.addEventListener('click', (event) => {
	event.stopPropagation();
	restaurantLogo = null;
	renderLogoPreview();
});

imageInput.addEventListener('change', () => {
	addImageFiles([...(imageInput.files ?? [])], imageInsertMode === 'primary');
	imageInput.value = '';
	imageInsertMode = 'append';
});

imageDropZone.addEventListener('click', () => {
	if (restaurantImages.length < MAX_IMAGES) {
		imageInsertMode = 'append';
		imageInput.click();
	}
});
imageDropZone.addEventListener('keydown', (event) => {
	if ((event.key === 'Enter' || event.key === ' ') && restaurantImages.length < MAX_IMAGES) {
		event.preventDefault();
		imageInsertMode = 'append';
		imageInput.click();
	}
});

primaryImagePreview.addEventListener('click', () => logoInput.click());
primaryImagePreview.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		logoInput.click();
	}
});
primaryImagePreview.addEventListener('dragover', (event) => {
	event.preventDefault();
	event.dataTransfer!.dropEffect = 'copy';
	primaryImagePreview.classList.add('dragging');
});
primaryImagePreview.addEventListener('dragleave', (event) => {
	if (!primaryImagePreview.contains(event.relatedTarget as Node | null)) primaryImagePreview.classList.remove('dragging');
});
primaryImagePreview.addEventListener('drop', (event) => {
	event.preventDefault();
	primaryImagePreview.classList.remove('dragging');
	const file = event.dataTransfer?.files[0];
	if (file) setRestaurantLogo(file);
	else if (event.dataTransfer) void addDroppedWebLogo(event.dataTransfer);
});
imageDropZone.addEventListener('dragover', (event) => {
	event.preventDefault();
	if (restaurantImages.length < MAX_IMAGES) {
		event.dataTransfer!.dropEffect = 'copy';
		imageDropZone.classList.add('dragging');
	}
});
imageDropZone.addEventListener('dragleave', (event) => {
	if (!imageDropZone.contains(event.relatedTarget as Node | null)) imageDropZone.classList.remove('dragging');
});
imageDropZone.addEventListener('drop', (event) => {
	event.preventDefault();
	imageDropZone.classList.remove('dragging');
	if (restaurantImages.length >= MAX_IMAGES) {
		showToast(`Solo se permiten ${MAX_IMAGES} imágenes`);
		return;
	}
	const files = [...event.dataTransfer!.files];
	if (files.length > 0) addImageFiles(files);
	else void addDroppedWebImage(event.dataTransfer!);
});

document.addEventListener('paste', (event) => {
	if (!dialog.open || imagesPanel.hidden || form.classList.contains('view-mode') || isPasteTarget(event.target)) return;
	if (!event.clipboardData) return;
	event.preventDefault();
	addPastedImages(event.clipboardData);
});

imagePreviews.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.remove-image');
	if (button) {
		const index = Number(button.dataset.imageIndex);
		restaurantImages.splice(index, 1);
		renderImagePreviews();
		return;
	}
	if (!form.classList.contains('view-mode')) return;
	const preview = (event.target as HTMLElement).closest<HTMLElement>('.image-preview');
	if (preview) openImageCarousel(Number(preview.dataset.imageIndex));
});

previousCarouselImage.addEventListener('click', () => moveCarouselImage(-1));
nextCarouselImage.addEventListener('click', () => moveCarouselImage(1));
closeImageCarousel.addEventListener('click', () => imageCarouselDialog.close());
imageCarouselDialog.addEventListener('click', (event) => {
	if (event.target === imageCarouselDialog) imageCarouselDialog.close();
});
imageCarouselDialog.addEventListener('keydown', (event) => {
	if (event.key === 'ArrowLeft') moveCarouselImage(-1);
	if (event.key === 'ArrowRight') moveCarouselImage(1);
});
imageCarouselDialog.addEventListener('close', () => {
	if (carouselImageUrl) URL.revokeObjectURL(carouselImageUrl);
	carouselImageUrl = '';
	imageCarouselImage.removeAttribute('src');
	if (carouselUsesTemporaryImages) restaurantImages = [];
	carouselUsesTemporaryImages = false;
});

imagePreviews.addEventListener('dragstart', (event) => {
	if (form.classList.contains('view-mode')) {
		event.preventDefault();
		return;
	}
	const preview = (event.target as HTMLElement).closest<HTMLElement>('.image-preview');
	if (!preview) return;
	draggedImageIndex = Number(preview.dataset.imageIndex);
	event.dataTransfer!.effectAllowed = 'move';
	event.dataTransfer!.setData('text/plain', String(draggedImageIndex));
	window.setTimeout(() => preview.classList.add('dragging'), 0);
});

imagePreviews.addEventListener('dragover', (event) => {
	event.preventDefault();
	if (draggedImageIndex === null) {
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		if (restaurantImages.length < MAX_IMAGES) imagePreviews.classList.add('external-dragging');
		return;
	}
	const preview = (event.target as HTMLElement).closest<HTMLElement>('.image-preview');
	imagePreviews.querySelectorAll('.drag-over').forEach((item) => item.classList.remove('drag-over'));
	if (preview && Number(preview.dataset.imageIndex) !== draggedImageIndex) preview.classList.add('drag-over');
	if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
});

imagePreviews.addEventListener('dragleave', (event) => {
	if (!imagePreviews.contains(event.relatedTarget as Node | null)) imagePreviews.classList.remove('external-dragging');
});

imagePreviews.addEventListener('drop', (event) => {
	event.preventDefault();
	imagePreviews.classList.remove('external-dragging');
	if (draggedImageIndex === null) {
		if (restaurantImages.length >= MAX_IMAGES) {
			showToast(`Solo se permiten ${MAX_IMAGES} imágenes`);
			return;
		}
		const files = [...(event.dataTransfer?.files ?? [])];
		if (files.length > 0) addImageFiles(files);
		else if (event.dataTransfer) void addDroppedWebImage(event.dataTransfer);
		return;
	}
	const target = (event.target as HTMLElement).closest<HTMLElement>('.image-preview');
	const targetIndex = target ? Number(target.dataset.imageIndex) : restaurantImages.length - 1;
	if (draggedImageIndex === null || targetIndex === draggedImageIndex) return;
	const [moved] = restaurantImages.splice(draggedImageIndex, 1);
	restaurantImages.splice(targetIndex, 0, moved);
	draggedImageIndex = null;
	renderImagePreviews();
});

imagePreviews.addEventListener('dragend', () => {
	draggedImageIndex = null;
	imagePreviews.querySelectorAll('.dragging, .drag-over').forEach((item) => item.classList.remove('dragging', 'drag-over'));
});

document.querySelector('#menu-button')?.addEventListener('click', () => document.body.classList.toggle('menu-open'));
document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => document.body.classList.remove('menu-open')));

const themeButtons = document.querySelectorAll<HTMLButtonElement>('[data-theme-value]');
const fontThemeButtons = document.querySelectorAll<HTMLButtonElement>('[data-font-theme-value]');
const headerThemeLogo = document.querySelector<HTMLImageElement>('#header-theme-logo')!;
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
function applyTheme(theme: string) {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem('theme', theme);
	headerThemeLogo.src = themeLogos[theme] ?? '/restobox-logo-transparent.png';
	themeButtons.forEach((button) => button.classList.toggle('active', button.dataset.themeValue === theme));
}

themeButtons.forEach((button) => button.addEventListener('click', () => {
	applyTheme(button.dataset.themeValue!);
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
}));

const FONT_THEMES = new Set(['original', 'moderna', 'elegante', 'amable', 'clasica']);
function applyFontTheme(fontTheme: string) {
	const selectedFontTheme = FONT_THEMES.has(fontTheme) ? fontTheme : 'original';
	document.documentElement.dataset.fontTheme = selectedFontTheme;
	localStorage.setItem('font-theme', selectedFontTheme);
	fontThemeButtons.forEach((button) => button.classList.toggle('active', button.dataset.fontThemeValue === selectedFontTheme));
}

fontThemeButtons.forEach((button) => button.addEventListener('click', () => {
	applyFontTheme(button.dataset.fontThemeValue!);
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
}));

document.querySelector('#main-search-button')!.addEventListener('click', () => {
	document.querySelectorAll<HTMLDetailsElement>('.top-dropdown[open]').forEach((dropdown) => dropdown.removeAttribute('open'));
	const searchBounds = search.getBoundingClientRect();
	const headerBottom = document.querySelector<HTMLElement>('.topbar')?.getBoundingClientRect().bottom ?? 0;
	const searchIsVisible = searchBounds.top >= headerBottom && searchBounds.bottom <= window.innerHeight;
	if (!searchIsVisible) search.scrollIntoView({ behavior: 'smooth', block: 'center' });
	search.focus({ preventScroll: true });
});

document.querySelector('#header-directory')?.addEventListener('click', () => {
	clearSearchTerms();
	clearDirectoryFilterSelections();
	filterActionMenu.removeAttribute('open');
	directoryFilterPanel.hidden = true;
	render();
	document.querySelector('#directorio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('.top-actions')?.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-header-filter]');
	const value = button?.dataset.headerFilterValue;
	if (!button || !value) return;
	clearSearchTerms();
	clearDirectoryFilterSelections();
	const targetSet = button.dataset.headerFilter === 'establishment'
		? selectedEstablishmentFilters
		: button.dataset.headerFilter === 'meal'
			? selectedMealFilters
			: selectedCuisineFilters;
	targetSet.add(value);
	button.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	render();
	document.querySelector('#directorio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#header-print-directory')?.addEventListener('click', () => {
	document.querySelector<HTMLDetailsElement>('.actions-dropdown')?.removeAttribute('open');
	selectionMode = 'print';
	editPlacesPanel.hidden = true;
	deletePlacesPanel.hidden = true;
	printPlacesPanel.hidden = false;
	document.body.classList.add('print-selection-mode');
	updatePrintPanelState();
	render();
	printPlacesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.querySelector('#header-import-place')?.addEventListener('click', () => {
	document.querySelector<HTMLDetailsElement>('.actions-dropdown')?.removeAttribute('open');
	openUrlImportButton.click();
});
document.querySelector('#header-edit-places')?.addEventListener('click', () => {
	document.querySelector<HTMLDetailsElement>('.actions-dropdown')?.removeAttribute('open');
	selectionMode = 'edit';
	rangeSelectionAnchorId = null;
	printSelectedIds.clear();
	printPlacesPanel.hidden = true;
	deletePlacesPanel.hidden = true;
	editPlacesPanel.hidden = false;
	document.body.classList.add('print-selection-mode');
	updatePrintPanelState();
	render();
	editPlacesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
document.querySelector('#header-delete-places')?.addEventListener('click', () => {
	document.querySelector<HTMLDetailsElement>('.actions-dropdown')?.removeAttribute('open');
	selectionMode = 'delete';
	rangeSelectionAnchorId = null;
	printSelectedIds.clear();
	printPlacesPanel.hidden = true;
	editPlacesPanel.hidden = true;
	deletePlacesPanel.hidden = false;
	document.body.classList.add('print-selection-mode');
	updatePrintPanelState();
	render();
	deletePlacesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

selectVisiblePlacesButton.addEventListener('click', () => {
	visibleRestaurantIds.forEach((id) => printSelectedIds.add(id));
	render();
});
selectAllPlacesButton.addEventListener('click', () => {
	printSelectedIds = new Set(restaurants.map((restaurant) => restaurant.id));
	render();
});
clearPrintSelectionButton.addEventListener('click', () => {
	printSelectedIds.clear();
	render();
});
closePrintPanelButton.addEventListener('click', () => {
	printPlacesPanel.hidden = true;
	selectionMode = null;
	document.body.classList.remove('print-selection-mode');
	render();
});

editSelectVisibleButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	visibleRestaurantIds.forEach((id) => printSelectedIds.add(id));
	render();
});
editSelectAllButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	printSelectedIds = new Set(restaurants.map((restaurant) => restaurant.id));
	render();
});
editClearSelectionButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	printSelectedIds.clear();
	render();
});
closeEditPanelButton.addEventListener('click', () => {
	editPlacesPanel.hidden = true;
	selectionMode = null;
	rangeSelectionAnchorId = null;
	document.body.classList.remove('print-selection-mode');
	render();
});

deleteSelectVisibleButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	visibleRestaurantIds.forEach((id) => printSelectedIds.add(id));
	render();
});
deleteSelectAllButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	printSelectedIds = new Set(restaurants.map((restaurant) => restaurant.id));
	render();
});
deleteClearSelectionButton.addEventListener('click', () => {
	rangeSelectionAnchorId = null;
	printSelectedIds.clear();
	render();
});
closeDeletePanelButton.addEventListener('click', () => {
	deletePlacesPanel.hidden = true;
	selectionMode = null;
	rangeSelectionAnchorId = null;
	document.body.classList.remove('print-selection-mode');
	render();
});
deleteSelectedPlacesButton.addEventListener('click', async () => {
	const selected = restaurants.filter((restaurant) => printSelectedIds.has(restaurant.id));
	if (!selected.length) return;
	deletePlaceMessage.textContent = selected.length === 1
		? `¿Eliminar “${selected[0].name}”? Esta acción no se puede deshacer.`
		: `¿Eliminar los ${selected.length} lugares seleccionados? Esta acción no se puede deshacer.`;
	deletePlaceDialog.returnValue = '';
	deletePlaceDialog.showModal();
	const confirmed = await new Promise<boolean>((resolve) => {
		deletePlaceDialog.addEventListener('close', () => resolve(deletePlaceDialog.returnValue === 'confirm'), { once: true });
	});
	if (!confirmed) return;
	backupRestaurants();
	const selectedIds = new Set(selected.map((restaurant) => restaurant.id));
	restaurants = restaurants.filter((restaurant) => !selectedIds.has(restaurant.id));
	await saveRestaurants();
	await Promise.all(selected.flatMap((restaurant) => [deleteRestaurantImages(restaurant.id), deleteRestaurantLogo(restaurant.id)])).catch(() => undefined);
	printSelectedIds.clear();
	deletePlacesPanel.hidden = true;
	selectionMode = null;
	rangeSelectionAnchorId = null;
	document.body.classList.remove('print-selection-mode');
	render();
	showToast(selected.length === 1 ? 'Lugar eliminado' : `${selected.length} lugares eliminados`);
});

function setBulkEditLists() {
	const fill = (id: string, values: string[]) => {
		document.querySelector<HTMLDataListElement>(id)!.innerHTML = values.map((value) => `<option value="${safe(value)}"></option>`).join('');
	};
	fill('#bulk-neighborhoods', neighborhoods);
	fill('#bulk-cities', cities);
	fill('#bulk-provinces', provinces);
	fill('#bulk-countries', countries);
	const choices = (values: string[], name: string) => values.map((value) => `<label><input type="checkbox" name="${name}" value="${safe(value)}" />${safe(value)}</label>`).join('');
	document.querySelector<HTMLDivElement>('#bulk-establishment-options')!.innerHTML = choices(establishmentTypes, 'establishmentTypes');
	document.querySelector<HTMLDivElement>('#bulk-service-options')!.innerHTML = choices(serviceTypes, 'mealTypes');
	document.querySelector<HTMLDivElement>('#bulk-cuisine-options')!.innerHTML = choices(cuisines, 'cuisines');
	const availableTags = capitalizedCatalogValues([...tagCatalog, ...restaurants.flatMap(restaurantTags)]).sort((a, b) => a.localeCompare(b, 'es'));
	document.querySelector<HTMLDivElement>('#bulk-tag-options')!.innerHTML = choices(availableTags, 'tags') || '<span class="cuisine-empty">No hay etiquetas guardadas.</span>';
	document.querySelector<HTMLElement>('#bulk-tags-label')!.textContent = 'Seleccionar etiquetas';
}

function openBulkEditDialog() {
	bulkEditForm.reset();
	bulkEditForm.querySelectorAll<HTMLDetailsElement>('details').forEach((details) => details.removeAttribute('open'));
	bulkEditCount.textContent = `${printSelectedIds.size} lugares seleccionados. Completá únicamente los campos que quieras reemplazar en todos.`;
	setBulkEditLists();
	bulkEditDialog.showModal();
}

editSelectedPlacesButton.addEventListener('click', () => {
	const selected = restaurants.filter((restaurant) => printSelectedIds.has(restaurant.id));
	if (selected.length === 1) {
		editPlacesPanel.hidden = true;
		selectionMode = null;
		rangeSelectionAnchorId = null;
		document.body.classList.remove('print-selection-mode');
		void openForm(selected[0]);
		return;
	}
	if (selected.length > 1) openBulkEditDialog();
});

cancelBulkEdit.addEventListener('click', () => bulkEditDialog.close());
bulkEditForm.addEventListener('change', (event) => {
	if (!(event.target as HTMLInputElement).matches('input[name="tags"]')) return;
	const count = bulkEditForm.querySelectorAll<HTMLInputElement>('input[name="tags"]:checked').length;
	document.querySelector<HTMLElement>('#bulk-tags-label')!.textContent = count ? `${count} etiquetas seleccionadas` : 'Seleccionar etiquetas';
});
bulkEditForm.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') event.preventDefault();
});

bulkEditForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
	const finishEditing = submitter?.dataset.bulkSaveMode === 'finish';
	const value = (name: string) => (bulkEditForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value.trim();
	const listValues = (name: string) => [...new Set([...bulkEditForm.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((input) => input.value))];
	const simpleFields = ['neighborhood', 'city', 'province', 'country', 'price', 'averagePrice', 'rating', 'favorite', 'visited', 'checked', 'delivery', 'takeAway', 'glutenFree'];
	const enabled = [
		...simpleFields.filter((field) => value(field) !== ''),
		...(['establishmentTypes', 'mealTypes', 'cuisines', 'tags'] as const).filter((field) => listValues(field).length > 0),
	];
	if (!enabled.length) {
		showToast('Completá al menos un campo para aplicar');
		return;
	}
	backupRestaurants();
	for (const restaurant of restaurants.filter((item) => printSelectedIds.has(item.id))) {
		for (const field of enabled) {
			if (field === 'neighborhood') restaurant.neighborhood = ensureNeighborhoodOption(value(field));
			else if (field === 'city' || field === 'province' || field === 'country') restaurant[field] = ensureLocationOption(field, value(field));
			else if (field === 'establishmentTypes') {
				const values = listValues(field);
				values.forEach((item) => { if (!establishmentTypes.some((type) => type.toLocaleLowerCase('es') === item.toLocaleLowerCase('es'))) establishmentTypes.push(item); });
				restaurant.establishmentTypes = values;
				restaurant.establishmentType = values[0] ?? '';
			} else if (field === 'mealTypes') {
				const values = listValues(field);
				values.forEach((item) => { if (!serviceTypes.some((service) => service.toLocaleLowerCase('es') === item.toLocaleLowerCase('es'))) serviceTypes.push(item); });
				restaurant.mealTypes = values;
			} else if (field === 'cuisines') {
				const values = listValues(field);
				values.forEach((item) => { if (!cuisines.some((cuisine) => cuisine.toLocaleLowerCase('es') === item.toLocaleLowerCase('es'))) cuisines.push(item); });
				restaurant.cuisines = values;
				restaurant.cuisine = values[0] ?? '';
			} else if (field === 'tags') {
				restaurant.tags = listValues(field).join(', ');
			} else if (field === 'favorite' || field === 'visited' || field === 'checked' || field === 'delivery' || field === 'takeAway' || field === 'glutenFree') restaurant[field] = value(field) === 'true';
			else if (field === 'price' || field === 'averagePrice' || field === 'rating') restaurant[field] = value(field);
		}
	}
	establishmentTypes.sort((a, b) => a.localeCompare(b, 'es'));
	serviceTypes.sort((a, b) => a.localeCompare(b, 'es'));
	cuisines.sort((a, b) => a.localeCompare(b, 'es'));
	saveEstablishmentSettings();
	saveServiceSettings();
	saveCuisineSettings();
	await saveRestaurants();
	renderEstablishmentFilterOptions();
	renderServiceFilterOptions();
	renderCuisineFilterOptions();
	render();
	if (finishEditing) {
		bulkEditDialog.close();
		editPlacesPanel.hidden = true;
		selectionMode = null;
		document.body.classList.remove('print-selection-mode');
		printSelectedIds.clear();
		render();
		showToast('Edición común finalizada');
	} else {
		showToast('Campos comunes actualizados');
	}
});
printPlacesPanel.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-print-mode]');
	if (!button || !printSelectedIds.size) return;
	document.body.classList.remove('print-mode-places', 'print-mode-cards', 'print-mode-list', 'print-mode-single');
	document.body.classList.add('print-has-selection', `print-mode-${button.dataset.printMode}`);
	window.addEventListener('afterprint', () => {
		document.body.classList.remove('print-has-selection', 'print-mode-places', 'print-mode-cards', 'print-mode-list');
	}, { once: true });
	window.print();
});
document.querySelectorAll<HTMLDetailsElement>('.top-dropdown').forEach((dropdown) => {
	dropdown.addEventListener('toggle', () => {
		if (!dropdown.open) return;
		document.querySelectorAll<HTMLDetailsElement>('.top-dropdown').forEach((other) => {
			if (other !== dropdown) other.removeAttribute('open');
		});
	});
});

document.addEventListener('click', (event) => {
	const target = event.target as HTMLElement;
	const activeCardMenu = target.closest<HTMLDetailsElement>('.restaurant-card-actions-menu');
	document.querySelectorAll<HTMLDetailsElement>('.restaurant-card-actions-menu[open]').forEach((menu) => {
		if (menu !== activeCardMenu) menu.removeAttribute('open');
	});
	if (target.closest('.top-dropdown')) return;
	document.querySelectorAll<HTMLDetailsElement>('.top-dropdown').forEach((dropdown) => dropdown.removeAttribute('open'));
});

form.addEventListener('submit', async (event) => {
	event.preventDefault();
	const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
	const keepOpen = submitter?.dataset.saveMode === 'update';
	if (!form.checkValidity()) {
		const invalidField = form.querySelector<HTMLElement>(':invalid');
		const invalidPanel = invalidField?.closest<HTMLElement>('[data-tab-panel]');
		if (invalidPanel?.dataset.tabPanel) activateFormTab(invalidPanel.dataset.tabPanel);
		form.reportValidity();
		return;
	}
	const saveButtons = form.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
	saveButtons.forEach((button) => { button.disabled = true; });
	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries()) as Record<string, string>;
	const savedNeighborhood = ensureNeighborhoodOption(data.neighborhood);
	const savedCity = ensureLocationOption('city', data.city);
	const savedProvince = ensureLocationOption('province', data.province);
	const savedCountry = ensureLocationOption('country', data.country);
	const missingTags = selectedTags.filter((tag) => !tagCatalog.some((item) => item.toLocaleLowerCase('es') === tag.toLocaleLowerCase('es')));
	if (missingTags.length) {
		tagCatalog = capitalizedCatalogValues([...tagCatalog, ...missingTags]).sort((a, b) => a.localeCompare(b, 'es'));
		removedTags = removedTags.filter((removed) => !missingTags.some((tag) => tag.toLocaleLowerCase('es') === removed.toLocaleLowerCase('es')));
		saveTagSettings();
	}
	const existingIndex = activeRestaurantId
		? restaurants.findIndex((restaurant) => restaurant.id === activeRestaurantId)
		: -1;
	const existingRestaurant = existingIndex >= 0 ? restaurants[existingIndex] : undefined;
	const restaurant: Restaurant = {
		id: activeRestaurantId ?? crypto.randomUUID(),
		name: data.name.trim(),
		description: data.description.trim(),
		establishmentType: selectedEstablishments[0] ?? '',
		establishmentTypes: [...selectedEstablishments],
		cuisine: selectedCuisines[0] ?? '',
		cuisines: [...selectedCuisines],
		tags: selectedTags.join(', '),
		rating: data.rating,
		score: data.score.trim(),
		mealTypes: [...selectedServices],
		price: data.price,
		averagePrice: data.averagePrice.trim(),
		country: savedCountry,
		province: savedProvince,
		city: savedCity,
		address: data.address.trim(),
		neighborhood: savedNeighborhood,
		hasBranches: existingRestaurant?.hasBranches ?? false,
		branchAddresses: existingRestaurant?.branchAddresses ?? [],
		phone: data.phone.trim(),
		mobile: data.mobile.trim(),
		website: data.website.trim(),
		googleUrl: data.googleUrl.trim(),
		linktreeUrl: data.linktreeUrl.trim(),
		menuUrl: data.menuUrl.trim(),
		instagramUrl: data.instagramUrl.trim(),
		tiktokUrl: data.tiktokUrl.trim(),
		facebookUrl: data.facebookUrl.trim(),
		wokiUrl: data.wokiUrl.trim(),
		tripAdvisorUrl: data.tripAdvisorUrl.trim(),
		mapUrl: data.mapUrl.trim(),
		hours: data.hours.trim(),
		notes: data.notes.trim(),
		favorite: formData.has('favorite'),
		visited: formData.has('visited'),
		checked: formData.has('checked'),
		delivery: formData.has('delivery'),
		takeAway: formData.has('takeAway'),
		glutenFree: formData.has('glutenFree'),
		imageCount: restaurantImages.length,
		createdAt: existingIndex >= 0 ? restaurants[existingIndex].createdAt : new Date().toISOString(),
	};
	backupRestaurants();
	if (existingIndex >= 0) restaurants[existingIndex] = restaurant;
	else restaurants.unshift(restaurant);
	const recordSaved = await saveRestaurants();
	if (!recordSaved) {
		saveButtons.forEach((button) => { button.disabled = false; });
		return;
	}
	let imagesSaved = false;
	try {
		const [savedImages, savedLogo] = await Promise.all([
			syncRestaurantImages(restaurant.id),
			syncRestaurantLogo(restaurant.id),
		]);
		restaurantImages = savedImages;
		restaurantLogo = savedLogo;
		imagesSaved = true;
		showToast(keepOpen ? 'Datos actualizados' : 'Lugar guardado');
	} catch (error) {
		restaurant.imageCount = restaurantImages.filter((image) => !image.isNew).length;
		await saveRestaurants();
		const reason = error instanceof Error ? error.message : 'No se pudieron guardar las imágenes';
		showToast(`Datos guardados, pero ${reason.charAt(0).toLocaleLowerCase('es')}${reason.slice(1)}`);
	}
	render();
	if (keepOpen) {
		activeRestaurantId = restaurant.id;
		form.classList.add('editing-record');
		(form.elements.namedItem('id') as HTMLInputElement).value = restaurant.id;
		dialogTitle.textContent = '';
		dialogTitle.hidden = true;
		dialogRecordName.textContent = restaurant.name;
		dialogRecordName.hidden = false;
		if (imagesSaved) {
			renderImagePreviews();
			renderLogoPreview();
		}
	} else {
		dialog.close();
	}
	saveButtons.forEach((button) => { button.disabled = false; });
	if (keepOpen) {
		baselineFormState = captureFormState();
		if (imagesSaved) {
			baselineImageState = captureImageState();
			baselineLogoState = captureLogoState();
			imageBaselineReady = true;
			logoBaselineReady = true;
		}
		updateDirtyState();
	}
});

async function removeRestaurant(restaurantId: string) {
	const restaurant = restaurants.find((item) => item.id === restaurantId);
	if (!restaurant) return;
	deletePlaceMessage.textContent = `¿Eliminar “${restaurant.name}”? Esta acción no se puede deshacer.`;
	deletePlaceDialog.returnValue = '';
	deletePlaceDialog.showModal();
	const confirmed = await new Promise<boolean>((resolve) => {
		deletePlaceDialog.addEventListener('close', () => resolve(deletePlaceDialog.returnValue === 'confirm'), { once: true });
	});
	if (!confirmed) return;
	backupRestaurants();
	restaurants = restaurants.filter((item) => item.id !== restaurant.id);
	await saveRestaurants();
	try { await Promise.all([deleteRestaurantImages(restaurant.id), deleteRestaurantLogo(restaurant.id)]); } catch { /* El registro principal ya fue eliminado. */ }
	render();
	showToast('Lugar eliminado');
}

async function duplicateRestaurant(restaurantId: string) {
	const original = restaurants.find((restaurant) => restaurant.id === restaurantId);
	if (!original) return;
	const duplicateId = crypto.randomUUID();
	const duplicate: Restaurant = structuredClone({
		...original,
		id: duplicateId,
		name: `${original.name} (copia)`,
		createdAt: new Date().toISOString(),
	});
	backupRestaurants();
	restaurants.unshift(duplicate);
	if (!await saveRestaurants()) {
		restaurants = restaurants.filter((restaurant) => restaurant.id !== duplicateId);
		render();
		return;
	}
	render();
	try {
		const [images, logo] = await Promise.all([getRestaurantImages(original.id), getRestaurantLogo(original.id)]);
		const duplicateImages: RestaurantImage[] = images.map((image) => ({
			...image,
			id: crypto.randomUUID(),
			restaurantId: duplicateId,
			isNew: true,
		}));
		const duplicateLogos: RestaurantImage[] = logo ? [{
			...logo,
			id: crypto.randomUUID(),
			restaurantId: duplicateId,
			isNew: true,
		}] : [];
		await Promise.all([
			uploadRestaurantMedia(duplicateId, 'image', duplicateImages),
			uploadRestaurantMedia(duplicateId, 'logo', duplicateLogos),
		]);
		render();
		showToast('Lugar duplicado');
	} catch {
		showToast('Lugar duplicado, pero no se pudieron copiar todas las imágenes');
	}
}

function printRestaurant(restaurantId: string) {
	const card = list.querySelector<HTMLElement>(`[data-restaurant-id="${CSS.escape(restaurantId)}"]`);
	if (!card) return;
	list.querySelectorAll('.restaurant-card.print-selected').forEach((selected) => selected.classList.remove('print-selected'));
	card.classList.add('print-selected');
	document.body.classList.remove('print-mode-places', 'print-mode-cards', 'print-mode-list');
	document.body.classList.add('print-has-selection', 'print-mode-single');
	window.addEventListener('afterprint', () => {
		document.body.classList.remove('print-has-selection', 'print-mode-single');
		render();
	}, { once: true });
	window.requestAnimationFrame(() => window.print());
}

async function viewRestaurantImages(restaurantId: string) {
	try {
		const storedImages = await getRestaurantImages(restaurantId);
		if (!storedImages.length) {
			showToast('Este lugar no tiene imágenes guardadas');
			return;
		}
		restaurantImages = storedImages.map((image) => ({ ...image, isNew: false }));
		openImageCarousel(0, true);
	} catch {
		showToast('No se pudieron cargar las imágenes');
	}
}

list.addEventListener('click', async (event) => {
	const target = event.target as HTMLElement;
	const printSelectButton = target.closest<HTMLButtonElement>('[data-print-select]');
	const favoriteButton = target.closest<HTMLButtonElement>('[data-favorite]');
	const visitedButton = target.closest<HTMLButtonElement>('[data-visited]');
	const checkedButton = target.closest<HTMLButtonElement>('[data-checked]');
	const viewButton = target.closest<HTMLButtonElement>('[data-view]');
	const viewImagesButton = target.closest<HTMLButtonElement>('[data-view-images]');
	const editButton = target.closest<HTMLButtonElement>('[data-edit]');
	const duplicateButton = target.closest<HTMLButtonElement>('[data-duplicate]');
	const printButton = target.closest<HTMLButtonElement>('[data-print]');
	const deleteButton = target.closest<HTMLButtonElement>('[data-delete]');
	if (printSelectButton) {
		const id = printSelectButton.dataset.printSelect;
		if (!id) return;
		const rangeMode = selectionMode === 'edit' || selectionMode === 'delete';
		const anchorIndex = rangeSelectionAnchorId ? visibleRestaurantIds.indexOf(rangeSelectionAnchorId) : -1;
		const currentIndex = visibleRestaurantIds.indexOf(id);
		if (rangeMode && event.shiftKey && anchorIndex >= 0 && currentIndex >= 0) {
			event.preventDefault();
			const firstIndex = Math.min(anchorIndex, currentIndex);
			const lastIndex = Math.max(anchorIndex, currentIndex);
			visibleRestaurantIds.slice(firstIndex, lastIndex + 1).forEach((restaurantId) => printSelectedIds.add(restaurantId));
		} else if (printSelectedIds.has(id)) printSelectedIds.delete(id);
		else printSelectedIds.add(id);
		rangeSelectionAnchorId = id;
		render();
		return;
	}
	if (favoriteButton) {
		const restaurant = restaurants.find((item) => item.id === favoriteButton.dataset.favorite);
		if (restaurant) {
			backupRestaurants();
			restaurant.favorite = !restaurant.favorite;
			saveRestaurants();
			render();
			showToast(restaurant.favorite ? 'Agregado a favoritos' : 'Quitado de favoritos');
		}
		return;
	}
	if (visitedButton) {
		const restaurant = restaurants.find((item) => item.id === visitedButton.dataset.visited);
		if (restaurant) {
			backupRestaurants();
			restaurant.visited = !restaurant.visited;
			saveRestaurants();
			render();
			showToast(restaurant.visited ? 'Marcado como visitado' : 'Marcado como no visitado');
		}
		return;
	}
	if (checkedButton) {
		const restaurant = restaurants.find((item) => item.id === checkedButton.dataset.checked);
		if (restaurant) {
			backupRestaurants();
			restaurant.checked = !restaurant.checked;
			saveRestaurants();
			render();
			showToast(restaurant.checked ? 'Marcado como chequeado' : 'Marcado como no chequeado');
		}
		return;
	}
	if (viewButton) {
		const restaurant = restaurants.find((item) => item.id === viewButton.dataset.view);
		if (restaurant) void openForm(restaurant, true);
		return;
	}
	if (viewImagesButton?.dataset.viewImages) {
		viewImagesButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
		viewImagesButton.disabled = true;
		await viewRestaurantImages(viewImagesButton.dataset.viewImages);
		viewImagesButton.disabled = false;
		return;
	}
	if (editButton) {
		editButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
		const restaurant = restaurants.find((item) => item.id === editButton.dataset.edit);
		if (restaurant) void openForm(restaurant);
		return;
	}
	if (duplicateButton?.dataset.duplicate) {
		duplicateButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
		await duplicateRestaurant(duplicateButton.dataset.duplicate);
		return;
	}
	if (printButton?.dataset.print) {
		printButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
		printRestaurant(printButton.dataset.print);
		return;
	}
	if (deleteButton) {
		deleteButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
		if (deleteButton.dataset.delete) await removeRestaurant(deleteButton.dataset.delete);
	}
});

function stringArray(value: unknown, fallback: string[] = []) {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
}

function applyServerCatalogs(value: unknown) {
	if (!value || typeof value !== 'object') return false;
	const catalogs = value as Record<string, unknown>;
	cuisines = capitalizedCatalogValues(stringArray(catalogs.cuisines, [...DEFAULT_CUISINES]));
	removedCuisines = stringArray(catalogs.removedCuisines);
	tagCatalog = capitalizedCatalogValues(stringArray(catalogs.tags, tagCatalog));
	removedTags = stringArray(catalogs.removedTags);
	establishmentTypes = capitalizedCatalogValues(stringArray(catalogs.establishmentTypes, [...DEFAULT_ESTABLISHMENTS]));
	removedEstablishmentTypes = stringArray(catalogs.removedEstablishmentTypes);
	serviceTypes = stringArray(catalogs.serviceTypes, [...DEFAULT_SERVICES]);
	removedServiceTypes = stringArray(catalogs.removedServiceTypes);
	neighborhoods = stringArray(catalogs.neighborhoods);
	removedNeighborhoods = stringArray(catalogs.removedNeighborhoods);
	cities = stringArray(catalogs.cities);
	removedCities = stringArray(catalogs.removedCities);
	provinces = stringArray(catalogs.provinces);
	removedProvinces = stringArray(catalogs.removedProvinces);
	countries = stringArray(catalogs.countries);
	removedCountries = stringArray(catalogs.removedCountries);
	return true;
}

async function readLegacyStore(database: IDBDatabase, storeName: 'images' | 'logos'): Promise<StoredImage[]> {
	if (!database.objectStoreNames.contains(storeName)) return [];
	return new Promise((resolve, reject) => {
		const request = database.transaction(storeName).objectStore(storeName).getAll();
		request.onsuccess = () => resolve(request.result as StoredImage[]);
		request.onerror = () => reject(request.error);
	});
}

async function migrateLegacyImages() {
	if (localStorage.getItem(SERVER_MIGRATION_KEY) !== 'pending-media') return;
	const database = await openLegacyImageDatabase();
	try {
		const [images, logos] = await Promise.all([readLegacyStore(database, 'images'), readLegacyStore(database, 'logos')]);
		for (const restaurant of restaurants) {
			const restaurantImagesToMigrate = images
				.filter((image) => image.restaurantId === restaurant.id)
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
				.slice(0, MAX_IMAGES)
				.map((image) => ({ ...image, isNew: true }));
			const logo = logos.find((item) => item.restaurantId === restaurant.id);
			if (restaurantImagesToMigrate.length) await uploadRestaurantMedia(restaurant.id, 'image', restaurantImagesToMigrate);
			if (logo) await uploadRestaurantMedia(restaurant.id, 'logo', [{ ...logo, isNew: true }]);
		}
		localStorage.setItem(SERVER_MIGRATION_KEY, 'complete');
		if (images.length || logos.length) showToast('Datos e imágenes migrados al servidor');
	} finally {
		database.close();
	}
}

async function initializeServerPersistence() {
	const localRestaurants = structuredClone(restaurants);
	try {
		const [restaurantResponse, settingsResponse] = await Promise.all([fetch('/api/restaurants'), fetch('/api/settings')]);
		requireActiveSession(restaurantResponse);
		requireActiveSession(settingsResponse);
		if (!restaurantResponse.ok || !settingsResponse.ok) throw new Error('No se pudo conectar con la base de datos');
		let serverRestaurants = ((await restaurantResponse.json()) as { restaurants: Restaurant[] }).restaurants;
		const serverSettings = ((await settingsResponse.json()) as { settings: Record<string, unknown> }).settings;
		if (!serverRestaurants.length && localRestaurants.length) {
			const migrationResponse = await fetch('/api/restaurants', {
				method: 'PUT', headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ upserts: localRestaurants, deletedIds: [] }),
			});
			requireActiveSession(migrationResponse);
			if (!migrationResponse.ok) throw new Error('No se pudieron migrar los lugares guardados');
			serverRestaurants = ((await migrationResponse.json()) as { restaurants: Restaurant[] }).restaurants;
			localStorage.setItem(SERVER_MIGRATION_KEY, 'pending-media');
		}
		restaurants = serverRestaurants;
		persistedRestaurants = new Map(restaurants.map((restaurant) => [restaurant.id, JSON.stringify(restaurant)]));
		serverPersistenceReady = true;
		if (!applyServerCatalogs(serverSettings.catalogs)) persistCatalogSettings();
		const removedCuisineNames = new Set(removedCuisines.map((item) => item.toLocaleLowerCase('es')));
		cuisines = [...new Set([...cuisines, ...restaurants.flatMap(getRestaurantCuisines)])].filter((item) => !removedCuisineNames.has(item.toLocaleLowerCase('es'))).sort((a, b) => a.localeCompare(b, 'es'));
		const removedTagNames = new Set(removedTags.map((item) => item.toLocaleLowerCase('es')));
		tagCatalog = capitalizedCatalogValues([...tagCatalog, ...restaurants.flatMap(restaurantTags)]).filter((item) => !removedTagNames.has(item.toLocaleLowerCase('es'))).sort((a, b) => a.localeCompare(b, 'es'));
		const removedEstablishmentNames = new Set(removedEstablishmentTypes.map((item) => item.toLocaleLowerCase('es')));
		establishmentTypes = [...new Set([...establishmentTypes, ...restaurants.flatMap(getRestaurantEstablishmentTypes)])].filter((item) => !removedEstablishmentNames.has(item.toLocaleLowerCase('es'))).sort((a, b) => a.localeCompare(b, 'es'));
		serviceTypes = [...new Set([...serviceTypes, ...restaurants.flatMap((restaurant) => restaurant.mealTypes ?? [])])].sort((a, b) => a.localeCompare(b, 'es'));
		neighborhoods = [...new Set([...neighborhoods, ...restaurants.map((restaurant) => restaurant.neighborhood).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
		cities = [...new Set([...cities, ...restaurants.map((restaurant) => restaurant.city).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
		provinces = [...new Set([...provinces, ...restaurants.map((restaurant) => restaurant.province).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
		countries = [...new Set([...countries, ...restaurants.map((restaurant) => restaurant.country).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es'));
		renderCuisineOptions();
		renderTagOptions(true);
		renderEstablishmentOptions(true);
		renderServiceOptions(true, true);
		renderNeighborhoodOptions();
		(['city', 'province', 'country'] as LocationOptionKind[]).forEach(renderLocationOptions);
		render();
		await migrateLegacyImages();
		render();
	} catch (error) {
		showToast(error instanceof Error ? error.message : 'No se pudo conectar con el servidor');
	}
}

setupClearableFields();
document.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', async () => {
	const response = await fetch('/api/auth/logout', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: '{}',
	});
	if (response.ok) window.location.assign('/login');
	else showToast('No se pudo cerrar la sesión');
});
applyTheme(localStorage.getItem('theme') || 'carrot');
applyFontTheme(localStorage.getItem('font-theme') || 'original');
renderSelectedCuisines();
renderCuisineOptions();
renderSelectedTags();
renderTagOptions();
selectedEstablishments = [];
renderSelectedEstablishments();
renderEstablishmentOptions(true);
selectedServices = [];
renderSelectedServices();
renderServiceOptions(true, true);
render();
const extensionImportUrl = new URL(window.location.href).searchParams.get('import_url');
if (extensionImportUrl) {
	try {
		const parsedImportUrl = new URL(extensionImportUrl);
		if (['http:', 'https:'].includes(parsedImportUrl.protocol)) {
			openUrlImportButton.click();
			restaurantSourceUrl.value = parsedImportUrl.toString();
			restaurantSourceUrl.dispatchEvent(new Event('input', { bubbles: true }));
			const cleanUrl = new URL(window.location.href);
			cleanUrl.searchParams.delete('import_url');
			history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
			window.setTimeout(() => urlImportForm.requestSubmit(), 100);
		}
	} catch { /* La URL inválida simplemente se ignora. */ }
}
void initializeServerPersistence();
