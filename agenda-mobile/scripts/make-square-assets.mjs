/**
 * Recorta o centro em quadrado + redimensiona para 1024×1024.
 * Expo exige ícones quadrados para `icon` / `adaptiveIcon` (schema app.json).
 *
 * Rode: npm run generate-assets
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, "..", "assets");

const FILES = [
  "icon-light.png",
  "icon-dark.png",
  "adaptive-icon.png",
  "icon.png",
  "favicon.png",
  "splash-icon.png",
];

async function toSquare1024(rel) {
  const inputPath = path.join(assets, rel);
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const size = Math.min(w, h);
  const left = Math.floor((w - size) / 2);
  const top = Math.floor((h - size) / 2);
  const tmpPath = `${inputPath}.tmp`;

  await sharp(inputPath)
    .extract({ left, top, width: size, height: size })
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(tmpPath);

  await fs.rename(tmpPath, inputPath);
  console.log("OK:", rel);
}

for (const f of FILES) {
  await toSquare1024(f);
}
