// Genera los íconos de la app instalable a partir de public/favicon.svg.
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(root, 'public', 'favicon.svg'));
const outDir = join(root, 'public', 'icons');
const background = '#f7f6f2';
await mkdir(outDir, { recursive: true });

// `scale` es la proporción del lienzo que ocupa el pin; las versiones "maskable" necesitan más margen.
async function icon(name, size, scale) {
	const pinSize = Math.round(size * scale);
	const pin = await sharp(svg, { density: 384 }).resize(pinSize, pinSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
	await sharp({ create: { width: size, height: size, channels: 4, background } })
		.composite([{ input: pin, gravity: 'center' }])
		.png({ compressionLevel: 9 })
		.toFile(join(outDir, name));
}

await icon('icon-192.png', 192, 0.78);
await icon('icon-512.png', 512, 0.78);
await icon('icon-maskable-512.png', 512, 0.58);
await icon('apple-touch-icon.png', 180, 0.78);
console.log('Íconos generados en public/icons');
