import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

type RGB = { r: number; g: number; b: number };

function getAverageBackgroundColorFromRaw(
	data: Buffer,
	width: number,
	height: number,
): RGB {
	const samplePoints: Array<[number, number]> = [
		[0, 0],
		[width - 1, 0],
		[0, height - 1],
		[width - 1, height - 1],
		[Math.floor(width / 2), 0],
		[0, Math.floor(height / 2)],
		[Math.floor(width / 2), height - 1],
		[width - 1, Math.floor(height / 2)],
	];

	let rTotal = 0;
	let gTotal = 0;
	let bTotal = 0;

	for (const [x, y] of samplePoints) {
		const idx = (y * width + x) * 4;
		rTotal += data[idx + 0];
		gTotal += data[idx + 1];
		bTotal += data[idx + 2];
	}

	const n = samplePoints.length;
	return { r: Math.round(rTotal / n), g: Math.round(gTotal / n), b: Math.round(bTotal / n) };
}

function colorDistance(a: RGB, b: RGB): number {
	const dr = a.r - b.r;
	const dg = a.g - b.g;
	const db = a.b - b.b;
	return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function ensureDir(dirPath: string): Promise<void> {
	await fs.promises.mkdir(dirPath, { recursive: true });
}

async function main(): Promise<void> {
	const root = process.cwd();
	const inputPath = path.join(root, 'public', 'images', 'logo2.png');
	const outDir = path.join(root, 'public', 'images');
	const transparentOut = path.join(outDir, 'logo2_transparent.png');
	const whiteBgOut = path.join(outDir, 'logo2_white.png');

	if (!fs.existsSync(inputPath)) {
		throw new Error(`Input file not found: ${inputPath}`);
	}

	await ensureDir(outDir);

	// Load with sharp and get raw RGBA buffer
	const input = sharp(inputPath).ensureAlpha();
	const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
	const { width, height, channels } = info; // channels expected 4
	if (channels !== 4) {
		throw new Error(`Unexpected channel count: ${channels}. Expected 4 (RGBA).`);
	}

	const background = getAverageBackgroundColorFromRaw(data, width, height);

	// Threshold in RGB space; tweak if needed. 60-80 works for gentle pastels.
	const threshold = 70;

	const output = Buffer.from(data); // copy
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const idx = (y * width + x) * 4;
			const r = output[idx + 0];
			const g = output[idx + 1];
			const b = output[idx + 2];
			const a = output[idx + 3];
			const dist = colorDistance({ r, g, b }, background);
			if (dist <= threshold) {
				const softness = 1 - Math.min(1, dist / threshold);
				const newA = Math.max(0, Math.round(a * (1 - softness)));
				output[idx + 3] = newA;
			}
		}
	}

	// Save transparent image
	await sharp(output, { raw: { width, height, channels: 4 } })
		.png()
		.toFile(transparentOut);

	// Create white background version by flattening
	await sharp(output, { raw: { width, height, channels: 4 } })
		.png()
		.flatten({ background: '#ffffff' })
		.toFile(whiteBgOut);

	// eslint-disable-next-line no-console
	console.log('Generated files:', {
		transparent: path.relative(root, transparentOut),
		white: path.relative(root, whiteBgOut),
	});
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});


