import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabase } from './database';

const scrypt = promisify(scryptCallback);
let bootstrapPromise: Promise<void> | null = null;

export type AuthUser = {
	id: string;
	username: string;
	role: 'admin' | 'user';
	email: string;
	name: string;
	alias: string;
	profilePhoto: string;
	authProvider: 'local' | 'google';
};

type UserRow = {
	id: string;
	username: string;
	password_hash: string;
	password_salt: string;
	role: 'admin' | 'user';
	email: string;
	name: string;
	alias: string;
	profile_photo: string;
	auth_provider: 'local' | 'google';
};

async function derivePassword(password: string, salt: string) {
	return Buffer.from(await scrypt(password, salt, 64) as Buffer);
}

export function countUsers() {
	const row = getDatabase().prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
	return Number(row.total);
}

export async function createUser(username: string, password: string, role: 'admin' | 'user' = 'user') {
	const normalizedUsername = username.trim();
	if (!/^[\p{L}\p{N}._-]{3,64}$/u.test(normalizedUsername)) throw new Error('El usuario debe tener entre 3 y 64 caracteres');
	if (password.length < 12 || password.length > 200) throw new Error('La contraseña debe tener al menos 12 caracteres');
	const salt = randomBytes(24).toString('base64url');
	const hash = (await derivePassword(password, salt)).toString('base64url');
	getDatabase().prepare('INSERT INTO users (id, username, password_hash, password_salt, role, created_at, name) VALUES (?, ?, ?, ?, ?, ?, ?)')
		.run(randomUUID(), normalizedUsername, hash, salt, role, new Date().toISOString(), normalizedUsername);
}

function toAuthUser(row: UserRow): AuthUser {
	return {
		id: row.id,
		username: row.username,
		role: row.role,
		email: row.email || '',
		name: row.name || row.username,
		alias: row.alias || '',
		profilePhoto: row.profile_photo || '',
		authProvider: row.auth_provider === 'google' ? 'google' : 'local',
	};
}

const userSelect = `
	SELECT id, username, password_hash, password_salt, role, email, name, alias, profile_photo, auth_provider
	FROM users
`;

export function getUserProfile(id: string): AuthUser | null {
	const row = getDatabase().prepare(`${userSelect} WHERE id = ?`).get(id) as UserRow | undefined;
	return row ? toAuthUser(row) : null;
}

export async function ensureBootstrapAdmin() {
	if (bootstrapPromise) return bootstrapPromise;
	bootstrapPromise = (async () => {
		const username = process.env.RESTOBOX_ADMIN_USERNAME?.trim();
		const password = process.env.RESTOBOX_ADMIN_PASSWORD;
		if (!username || !password) return;
		const existing = getDatabase().prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
		if (!existing) await createUser(username, password, 'admin');
	})();
	return bootstrapPromise;
}

export async function verifyUser(username: string, password: string) {
	await ensureBootstrapAdmin();
	const row = getDatabase().prepare(`${userSelect} WHERE username = ? COLLATE NOCASE`).get(username.trim()) as UserRow | undefined;
	if (!row) {
		await derivePassword(password || 'invalid-password', randomBytes(24).toString('base64url'));
		return null;
	}
	const actual = await derivePassword(password, row.password_salt);
	const expected = Buffer.from(row.password_hash, 'base64url');
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
	return toAuthUser(row);
}

export function upsertGoogleUser(profile: { subject: string; email: string; name: string; picture?: string }): AuthUser {
	const database = getDatabase();
	const googleId = `google:${profile.subject}`;
	const existing = database.prepare(`${userSelect} WHERE id = ? OR email = ? COLLATE NOCASE LIMIT 1`)
		.get(googleId, profile.email) as UserRow | undefined;
	if (existing) {
		database.prepare(`
			UPDATE users SET email = ?, name = CASE WHEN name = '' THEN ? ELSE name END
			WHERE id = ?
		`).run(profile.email, profile.name, existing.id);
		return getUserProfile(existing.id)!;
	}
	const salt = randomBytes(24).toString('base64url');
	const unusablePassword = randomBytes(64).toString('base64url');
	database.prepare(`
		INSERT INTO users (id, username, password_hash, password_salt, role, created_at, email, name, profile_photo, auth_provider)
		VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, 'google')
	`).run(googleId, profile.email, unusablePassword, salt, new Date().toISOString(), profile.email, profile.name, profile.picture || '');
	return getUserProfile(googleId)!;
}

export function updateUserProfile(id: string, input: { email: string; name: string; alias: string }): AuthUser {
	const email = input.email.trim().toLocaleLowerCase('en');
	const name = input.name.trim();
	const alias = input.alias.trim();
	if (!name || name.length > 100) throw new Error('Ingresá un nombre válido');
	if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Ingresá un email válido');
	if (alias.length > 80) throw new Error('El alias no puede superar los 80 caracteres');
	const duplicate = email
		? getDatabase().prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id <> ?').get(email, id)
		: null;
	if (duplicate) throw new Error('Ese email ya está asociado a otro usuario');
	const result = getDatabase().prepare('UPDATE users SET email = ?, name = ?, alias = ? WHERE id = ?').run(email, name, alias, id);
	if (!result.changes) throw new Error('No se encontró el usuario');
	return getUserProfile(id)!;
}

export function updateUserPhoto(id: string, profilePhoto: string): AuthUser {
	const result = getDatabase().prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(profilePhoto, id);
	if (!result.changes) throw new Error('No se encontró el usuario');
	return getUserProfile(id)!;
}

export async function changeUserPassword(id: string, currentPassword: string, newPassword: string) {
	if (newPassword.length < 12 || newPassword.length > 200) throw new Error('La nueva contraseña debe tener al menos 12 caracteres');
	const row = getDatabase().prepare(`${userSelect} WHERE id = ?`).get(id) as UserRow | undefined;
	if (!row || row.auth_provider !== 'local') throw new Error('La contraseña de esta cuenta se administra con Google');
	const actual = await derivePassword(currentPassword, row.password_salt);
	const expected = Buffer.from(row.password_hash, 'base64url');
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('La contraseña actual no es correcta');
	const salt = randomBytes(24).toString('base64url');
	const hash = (await derivePassword(newPassword, salt)).toString('base64url');
	getDatabase().prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, id);
}
