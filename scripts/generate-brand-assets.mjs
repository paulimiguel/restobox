// Genera los logos de FoodieBox (transparente, uno por tema y el pin) y el favicon a partir de branding/foodiebox-logo.png.
// Para el modo oscuro usa branding/foodiebox-logo-dark.png (texto claro, con fondo transparente).
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'branding', 'foodiebox-logo.png');
const publicDir = join(root, 'public');
await mkdir(join(root, 'branding'), { recursive: true });

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

// Quita el fondo blanco conservando los bordes suaves y los colores originales.
function removeWhiteBackground(buffer) {
	const output = Buffer.from(buffer);
	for (let index = 0; index < output.length; index += 4) {
		const red = buffer[index];
		const green = buffer[index + 1];
		const blue = buffer[index + 2];
		const difference = Math.max(255 - red, 255 - green, 255 - blue);
		if (difference < 6) {
			output[index + 3] = 0;
			continue;
		}
		const alpha = Math.min(1, difference / 200);
		output[index] = clamp(255 - (255 - red) / alpha);
		output[index + 1] = clamp(255 - (255 - green) / alpha);
		output[index + 2] = clamp(255 - (255 - blue) / alpha);
		output[index + 3] = Math.round(alpha * 255);
	}
	return output;
}

function rgbToHsl(red, green, blue) {
	const r = red / 255; const g = green / 255; const b = blue / 255;
	const max = Math.max(r, g, b); const min = Math.min(r, g, b);
	const lightness = (max + min) / 2;
	if (max === min) return [0, 0, lightness];
	const delta = max - min;
	const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue;
	if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
	else if (max === g) hue = (b - r) / delta + 2;
	else hue = (r - g) / delta + 4;
	return [hue * 60, saturation, lightness];
}

function hslToRgb(hue, saturation, lightness) {
	const h = ((hue % 360) + 360) % 360 / 360;
	if (saturation === 0) return [clamp(lightness * 255), clamp(lightness * 255), clamp(lightness * 255)];
	const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
	const p = 2 * lightness - q;
	const channel = (t) => {
		let value = t;
		if (value < 0) value += 1;
		if (value > 1) value -= 1;
		if (value < 1 / 6) return p + (q - p) * 6 * value;
		if (value < 1 / 2) return q;
		if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
		return p;
	};
	return [clamp(channel(h + 1 / 3) * 255), clamp(channel(h) * 255), clamp(channel(h - 1 / 3) * 255)];
}

// Cambia únicamente el rojo del logo (pin y "BOX") por el color del tema; el texto oscuro queda igual.
function recolor(buffer, [targetHue, targetSaturation, targetLightness]) {
	const output = Buffer.from(buffer);
	const baseLightness = 0.54;
	for (let index = 0; index < output.length; index += 4) {
		if (buffer[index + 3] === 0) continue;
		const [hue, saturation, lightness] = rgbToHsl(buffer[index], buffer[index + 1], buffer[index + 2]);
		const isRed = saturation > 0.45 && (hue >= 325 || hue <= 12);
		if (!isRed) continue;
		const [red, green, blue] = hslToRgb(targetHue, targetSaturation, Math.max(0.12, Math.min(0.92, targetLightness + (lightness - baseLightness))));
		output[index] = red;
		output[index + 1] = green;
		output[index + 2] = blue;
	}
	return output;
}

async function save(buffer, file, { trim = true, padding = 0.03, width } = {}) {
	let image = sharp(buffer, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
	if (trim) {
		const trimmed = await image.toBuffer();
		const { data: trimmedData, info: trimmedInfo } = await sharp(trimmed).trim({ threshold: 5 }).toBuffer({ resolveWithObject: true });
		const pad = Math.round(Math.max(trimmedInfo.width, trimmedInfo.height) * padding);
		image = sharp(trimmedData).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();
	}
	if (width) image = image.resize({ width });
	await image.toFile(file);
}

const transparent = removeWhiteBackground(data);
const darkSource = await sharp(join(root, 'branding', 'foodiebox-logo-dark.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (darkSource.info.width !== info.width || darkSource.info.height !== info.height) throw new Error('El logo oscuro debe tener el mismo tamaño que el original.');
const darkTransparent = darkSource.data;
await save(transparent, join(publicDir, 'foodiebox-logo-transparent.png'), { width: 1200 });

const themes = {
	aguamarina: [187, 0.72, 0.52],
	carrot: [26, 0.97, 0.53],
	grises: [217, 0.06, 0.55],
	pasteles: [350, 0.78, 0.78],
	salmon: [0, 0.68, 0.64],
	tierra: [33, 0.45, 0.58],
	violetas: [266, 0.42, 0.6],
};
await save(transparent, join(publicDir, 'foodiebox-theme-frutilla-transparent.png'), { width: 1200 });
await save(darkTransparent, join(publicDir, 'foodiebox-theme-frutilla-dark-transparent.png'), { width: 1200 });
await save(darkTransparent, join(publicDir, 'foodiebox-logo-dark-transparent.png'), { width: 1200 });
for (const [theme, color] of Object.entries(themes)) {
	await save(recolor(transparent, color), join(publicDir, `foodiebox-theme-${theme}-transparent.png`), { width: 1200 });
	await save(recolor(darkTransparent, color), join(publicDir, `foodiebox-theme-${theme}-dark-transparent.png`), { width: 1200 });
}

// Solo el pin (sin el texto) para el favicon, los íconos de la app y la extensión.
const pinHeight = Math.round(info.height * 0.7);
const pinRows = Buffer.from(transparent.subarray(0, info.width * pinHeight * 4));
const pinTrimmed = await sharp(pinRows, { raw: { width: info.width, height: pinHeight, channels: 4 } }).png().trim({ threshold: 5 }).toBuffer();
await writeFile(join(root, 'branding', 'foodiebox-pin.png'), pinTrimmed);

async function squarePin(size, margin = 0.06) {
	const inner = Math.round(size * (1 - margin * 2));
	const resized = await sharp(pinTrimmed).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
	return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: resized, gravity: 'center' }]).png().toBuffer();
}

const faviconPng = await squarePin(64, 0.04);
await writeFile(join(publicDir, 'favicon.png'), faviconPng);
// favicon.ico con una imagen PNG de 48 px (formato admitido por todos los navegadores actuales).
const icoImage = await squarePin(48, 0.04);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(48, 6); header.writeUInt8(48, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(icoImage.length, 14); header.writeUInt32LE(22, 18);
await writeFile(join(publicDir, 'favicon.ico'), Buffer.concat([header, icoImage]));

// Íconos de la extensión de Chrome.
for (const size of [16, 32, 48, 128]) {
	await writeFile(join(root, 'extension', 'icons', `icon${size}.png`), await squarePin(size, 0.04));
}
console.log('Logos e íconos de FoodieBox generados.');
