// Converte as folhas 4x2 geradas para o contrato autoral 8x1 de 64px.
// Sem dependencias externas: decodifica PNG RGBA8, remove o chroma magenta,
// conserva o maior componente por pose e normaliza escala/baseline.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { PixelCanvas } from './pixelCanvas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INPUT_ROOT = join(ROOT, 'assets-source', 'adaris-pose-sheets');
const OUTPUT_ROOT = join(ROOT, 'assets-source', 'adaris');
const CELL = 64;
const COLUMNS = 4;
const ROWS = 2;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const RELEASES = [
  ['terravok', 'brontar', 'evolution-1', 48],
  ['terravok', 'bronterra', 'evolution-2', 54],
  ['terravok', 'asterhorn', 'perfect', 58],
  ['lumora', 'velair', 'evolution-1', 48],
  ['lumora', 'velustra', 'evolution-2', 54],
  ['lumora', 'stridara', 'perfect', 58],
  ['solivar', 'myrix', 'evolution-1', 48],
  ['solivar', 'myrandel', 'evolution-2', 54],
  ['solivar', 'solvyr', 'perfect', 58],
];

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dul = Math.abs(estimate - upperLeft);
  if (dl <= du && dl <= dul) return left;
  return du <= dul ? up : upperLeft;
}

function decodeRgba8Png(file) {
  const png = readFileSync(file);
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${file}: assinatura PNG invalida`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let compression = 0;
  let filterMethod = 0;
  let interlace = 0;
  const idat = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      compression = data[10];
      filterMethod = data[11];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType) || compression !== 0 || filterMethod !== 0 || interlace !== 0) {
    throw new Error(`${file}: use PNG RGB/RGBA8 nao-interlaced (color type 2 ou 6)`);
  }
  if (Math.abs(width / height - COLUMNS / ROWS) > 0.01) {
    throw new Error(`${file}: dimensoes ${width}x${height} nao formam grade 4x2`);
  }
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== (stride + 1) * height) throw new Error(`${file}: dados PNG truncados`);
  const decoded = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    if (filter > 4) throw new Error(`${file}: filtro PNG ${filter} nao suportado`);
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= bytesPerPixel ? decoded[y * stride + x - bytesPerPixel] : 0;
      const up = y > 0 ? decoded[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? decoded[(y - 1) * stride + x - bytesPerPixel] : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? up
          : filter === 3 ? Math.floor((left + up) / 2)
            : filter === 4 ? paeth(left, up, upperLeft)
              : 0;
      decoded[y * stride + x] = (value + predictor) & 0xff;
    }
    rawOffset += stride;
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * bytesPerPixel;
    const target = pixel * 4;
    rgba[target] = decoded[source];
    rgba[target + 1] = decoded[source + 1];
    rgba[target + 2] = decoded[source + 2];
    rgba[target + 3] = colorType === 6 ? decoded[source + 3] : 255;
  }
  return { width, height, rgba };
}

function pixelAt(image, x, y) {
  const index = (y * image.width + x) * 4;
  return [image.rgba[index], image.rgba[index + 1], image.rgba[index + 2], image.rgba[index + 3]];
}

function isChroma([r, g, b, a]) {
  if (a < 128) return true;
  // O fundo gerado varia ligeiramente de #FF00FF. A restricao de vermelho e
  // azul altos evita apagar os violetas mais frios usados nas criaturas.
  const distance = Math.hypot(255 - r, g, 255 - b);
  const nearKey = distance < 92 && r > 185 && b > 170 && g < 105;
  // A compressao da borda pode deslocar o magenta para um rosa mais vermelho.
  // Violetas autorais continuam protegidos porque neles o azul domina o vermelho.
  const redFringe = r > 220 && g < 60 && b > 120 && r >= b * 0.9;
  return nearKey || redFringe;
}

function largestComponent(image, cellX, cellY, cellWidth, cellHeight) {
  const solid = new Uint8Array(cellWidth * cellHeight);
  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      solid[y * cellWidth + x] = isChroma(pixelAt(image, cellX + x, cellY + y)) ? 0 : 1;
    }
  }
  const seen = new Uint8Array(solid.length);
  let best = [];
  const neighbors = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  for (let start = 0; start < solid.length; start += 1) {
    if (!solid[start] || seen[start]) continue;
    const queue = [start];
    const component = [];
    seen[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      component.push(current);
      const x = current % cellWidth;
      const y = Math.floor(current / cellWidth);
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cellWidth || ny >= cellHeight) continue;
        const next = ny * cellWidth + nx;
        if (solid[next] && !seen[next]) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    if (component.length > best.length) best = component;
  }
  if (best.length < 100) throw new Error(`pose sem criatura (${best.length} pixels)`);
  const keep = new Uint8Array(solid.length);
  let minX = cellWidth;
  let minY = cellHeight;
  let maxX = -1;
  let maxY = -1;
  for (const index of best) {
    keep[index] = 1;
    const x = index % cellWidth;
    const y = Math.floor(index / cellWidth);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { keep, minX, minY, maxX, maxY, pixels: best.length };
}

function normalizePose(image, column, row, targetSize) {
  const cellX = Math.round(column * image.width / COLUMNS);
  const cellY = Math.round(row * image.height / ROWS);
  const cellWidth = Math.round((column + 1) * image.width / COLUMNS) - cellX;
  const cellHeight = Math.round((row + 1) * image.height / ROWS) - cellY;
  const component = largestComponent(image, cellX, cellY, cellWidth, cellHeight);
  const sourceWidth = component.maxX - component.minX + 1;
  const sourceHeight = component.maxY - component.minY + 1;
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const width = Math.max(1, Math.floor(sourceWidth * scale));
  const height = Math.max(1, Math.floor(sourceHeight * scale));
  const destX = Math.floor((CELL - width) / 2);
  const destY = 61 - height;
  const out = new PixelCanvas(CELL, CELL);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = component.minX + Math.min(sourceWidth - 1, Math.floor((x + 0.5) * sourceWidth / width));
      const sy = component.minY + Math.min(sourceHeight - 1, Math.floor((y + 0.5) * sourceHeight / height));
      if (!component.keep[sy * cellWidth + sx]) continue;
      const [r, g, b] = pixelAt(image, cellX + sx, cellY + sy);
      out.set(destX + x, destY + y, [r, g, b, 255]);
    }
  }
  return { canvas: out, sourceWidth, sourceHeight, width, height, pixels: component.pixels };
}

for (const [line, form, stage, targetSize] of RELEASES) {
  const input = join(INPUT_ROOT, line, form, 'pose-sheet-v1.png');
  const image = decodeRgba8Png(input);
  const atlas = new PixelCanvas(CELL * 8, CELL);
  const report = [];
  for (let pose = 0; pose < 8; pose += 1) {
    const normalized = normalizePose(image, pose % COLUMNS, Math.floor(pose / COLUMNS), targetSize);
    atlas.blit(normalized.canvas, pose * CELL, 0);
    report.push(`${normalized.sourceWidth}x${normalized.sourceHeight}->${normalized.width}x${normalized.height}`);
  }
  const output = join(OUTPUT_ROOT, line, stage, 'home-actions-v2.png');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, atlas.png());
  console.log(`${line}/${form}: ${image.width}x${image.height}; ${report.join(', ')}`);
}

console.log('pixel-art:adaris:import: 9 folhas, 72 poses e 9 fontes normalizadas');
