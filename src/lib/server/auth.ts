import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabase } from './database';

const scrypt = promisify(scryptCallback);
let bootstrapPromise: Promise<void> | null = null;

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
	getDatabase().prepare('INSERT INTO users (id, username, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.run(randomUUID(), normalizedUsername, hash, salt, role, new Date().toISOString());
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
	const row = getDatabase().prepare('SELECT id, username, password_hash, password_salt, role FROM users WHERE username = ? COLLATE NOCASE').get(username.trim()) as {
		id: string; username: string; password_hash: string; password_salt: string; role: 'admin' | 'user';
	} | undefined;
	if (!row) {
		await derivePassword(password || 'invalid-password', randomBytes(24).toString('base64url'));
		return null;
	}
	const actual = await derivePassword(password, row.password_salt);
	const expected = Buffer.from(row.password_hash, 'base64url');
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
	return { id: row.id, username: row.username, role: row.role };
}
