import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type RestaurantRecord = Record<string, unknown> & {
	id: string;
	name: string;
	createdAt: string;
	imageCount?: number;
};

export type MediaRecord = {
	id: string;
	restaurantId: string;
	kind: 'image' | 'logo';
	sortOrder: number;
	filename: string;
	mimeType: string;
	size: number;
};

const dataDirectory = resolve(process.env.RESTOBOX_DATA_DIR || join(process.cwd(), 'data'));
export const uploadsDirectory = join(dataDirectory, 'uploads');
export const profilePhotosDirectory = join(dataDirectory, 'profile-photos');
mkdirSync(uploadsDirectory, { recursive: true });
mkdirSync(profilePhotosDirectory, { recursive: true });

const database = new DatabaseSync(join(dataDirectory, 'restobox.sqlite'), {
	enableForeignKeyConstraints: true,
});

database.exec(`
	PRAGMA busy_timeout = 5000;
	PRAGMA journal_mode = WAL;
	PRAGMA synchronous = NORMAL;
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT NOT NULL UNIQUE COLLATE NOCASE,
		password_hash TEXT NOT NULL,
		password_salt TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
		created_at TEXT NOT NULL
	) STRICT;
	CREATE TABLE IF NOT EXISTS restaurants (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		city TEXT NOT NULL DEFAULT '',
		neighborhood TEXT NOT NULL DEFAULT '',
		data_json TEXT NOT NULL CHECK (json_valid(data_json)),
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	) STRICT;
	CREATE INDEX IF NOT EXISTS restaurants_name_idx ON restaurants(name COLLATE NOCASE);
	CREATE INDEX IF NOT EXISTS restaurants_city_idx ON restaurants(city COLLATE NOCASE);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value_json TEXT NOT NULL CHECK (json_valid(value_json)),
		updated_at TEXT NOT NULL
	) STRICT;
	CREATE TABLE IF NOT EXISTS media (
		id TEXT PRIMARY KEY,
		restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
		kind TEXT NOT NULL CHECK (kind IN ('image', 'logo')),
		sort_order INTEGER NOT NULL DEFAULT 0,
		filename TEXT NOT NULL UNIQUE,
		mime_type TEXT NOT NULL,
		size INTEGER NOT NULL CHECK (size >= 0),
		created_at TEXT NOT NULL
	) STRICT;
	CREATE INDEX IF NOT EXISTS media_restaurant_idx ON media(restaurant_id, kind, sort_order);
`);

function ensureColumn(name: string, definition: string) {
	const columns = database.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
	if (!columns.some((column) => column.name === name)) database.exec(`ALTER TABLE users ADD COLUMN ${definition}`);
}

ensureColumn('email', "email TEXT NOT NULL DEFAULT ''");
ensureColumn('name', "name TEXT NOT NULL DEFAULT ''");
ensureColumn('alias', "alias TEXT NOT NULL DEFAULT ''");
ensureColumn('profile_photo', "profile_photo TEXT NOT NULL DEFAULT ''");
ensureColumn('auth_provider', "auth_provider TEXT NOT NULL DEFAULT 'local'");

export function getDatabase() {
	return database;
}

function normalizeRestaurant(value: unknown): RestaurantRecord {
	if (!value || typeof value !== 'object') throw new Error('Registro inválido');
	const candidate = value as Record<string, unknown>;
	const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
	const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
	if (!id || id.length > 100 || !name || name.length > 150) throw new Error('El lugar necesita id y nombre válidos');
	const createdAt = typeof candidate.createdAt === 'string' && candidate.createdAt
		? candidate.createdAt
		: new Date().toISOString();
	return { ...candidate, id, name, createdAt } as RestaurantRecord;
}

function transaction<T>(operation: () => T): T {
	database.exec('BEGIN IMMEDIATE');
	try {
		const result = operation();
		database.exec('COMMIT');
		return result;
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}

export function listRestaurants(): RestaurantRecord[] {
	const rows = database.prepare(`
		SELECT r.data_json,
			(SELECT COUNT(*) FROM media m WHERE m.restaurant_id = r.id AND m.kind = 'image') AS image_count
		FROM restaurants r
		ORDER BY r.created_at DESC
	`).all() as Array<{ data_json: string; image_count: number }>;
	return rows.map((row) => ({ ...JSON.parse(row.data_json), imageCount: Number(row.image_count) } as RestaurantRecord));
}

export function getRestaurant(id: string): RestaurantRecord | null {
	const row = database.prepare(`
		SELECT r.data_json,
			(SELECT COUNT(*) FROM media m WHERE m.restaurant_id = r.id AND m.kind = 'image') AS image_count
		FROM restaurants r WHERE r.id = ?
	`).get(id) as { data_json: string; image_count: number } | undefined;
	return row ? { ...JSON.parse(row.data_json), imageCount: Number(row.image_count) } as RestaurantRecord : null;
}

export function upsertRestaurant(value: unknown): RestaurantRecord {
	const restaurant = normalizeRestaurant(value);
	const now = new Date().toISOString();
	const city = typeof restaurant.city === 'string' ? restaurant.city : '';
	const neighborhood = typeof restaurant.neighborhood === 'string' ? restaurant.neighborhood : '';
	database.prepare(`
		INSERT INTO restaurants (id, name, city, neighborhood, data_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			city = excluded.city,
			neighborhood = excluded.neighborhood,
			data_json = excluded.data_json,
			updated_at = excluded.updated_at
	`).run(restaurant.id, restaurant.name, city, neighborhood, JSON.stringify(restaurant), restaurant.createdAt, now);
	return restaurant;
}

export function syncRestaurants(upserts: unknown[], deletedIds: string[]) {
	return transaction(() => {
		for (const value of upserts) upsertRestaurant(value);
		const remove = database.prepare('DELETE FROM restaurants WHERE id = ?');
		for (const id of deletedIds) if (typeof id === 'string' && id) remove.run(id);
	});
}

export function deleteRestaurant(id: string) {
	database.prepare('DELETE FROM restaurants WHERE id = ?').run(id);
}

export function getSettings(): Record<string, unknown> {
	const rows = database.prepare('SELECT key, value_json FROM settings').all() as Array<{ key: string; value_json: string }>;
	return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json)]));
}

export function setSetting(key: string, value: unknown) {
	if (!/^[a-z0-9-]{1,80}$/i.test(key)) throw new Error('Clave de configuración inválida');
	database.prepare(`
		INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
	`).run(key, JSON.stringify(value), new Date().toISOString());
}

export function listMedia(restaurantId?: string, kind?: 'image' | 'logo'): MediaRecord[] {
	let sql = 'SELECT id, restaurant_id, kind, sort_order, filename, mime_type, size FROM media';
	const conditions: string[] = [];
	const parameters: string[] = [];
	if (restaurantId) { conditions.push('restaurant_id = ?'); parameters.push(restaurantId); }
	if (kind) { conditions.push('kind = ?'); parameters.push(kind); }
	if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
	sql += ' ORDER BY restaurant_id, kind, sort_order';
	const rows = database.prepare(sql).all(...parameters) as Array<Record<string, string | number>>;
	return rows.map((row) => ({
		id: String(row.id), restaurantId: String(row.restaurant_id), kind: String(row.kind) as 'image' | 'logo',
		sortOrder: Number(row.sort_order), filename: String(row.filename), mimeType: String(row.mime_type), size: Number(row.size),
	}));
}

export function getMedia(id: string): MediaRecord | null {
	const row = database.prepare('SELECT id, restaurant_id, kind, sort_order, filename, mime_type, size FROM media WHERE id = ?').get(id) as Record<string, string | number> | undefined;
	return row ? {
		id: String(row.id), restaurantId: String(row.restaurant_id), kind: String(row.kind) as 'image' | 'logo',
		sortOrder: Number(row.sort_order), filename: String(row.filename), mimeType: String(row.mime_type), size: Number(row.size),
	} : null;
}

export function replaceMediaRecords(restaurantId: string, kind: 'image' | 'logo', records: MediaRecord[]) {
	transaction(() => {
		database.prepare('DELETE FROM media WHERE restaurant_id = ? AND kind = ?').run(restaurantId, kind);
		const insert = database.prepare(`INSERT INTO media (id, restaurant_id, kind, sort_order, filename, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
		for (const record of records) insert.run(record.id, restaurantId, kind, record.sortOrder, record.filename, record.mimeType, record.size, new Date().toISOString());
	});
}
