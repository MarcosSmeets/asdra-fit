// Publica os 9 atlases autorais EV1/EV2/PERFECT no contrato do runtime.
// Sem dependencias externas: aceita somente PNG RGBA8 nao-interlaced, valida o
// grid 8x1 de 64px, deriva silhueta e gera @2x/@3x por nearest-neighbor.
//
// Uso:
//   node tools/pixel-art/build-final-adaris.mjs
//   node tools/pixel-art/build-final-adaris.mjs --check
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { PixelCanvas, hex } from './pixelCanvas.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_ROOT = join(ROOT, 'assets-source', 'adaris');
const OUTPUT_ROOT = join(ROOT, 'apps', 'mobile', 'assets', 'pixel-art', 'adaris');
const CELL = 64;
const COLUMNS = 8;
const WIDTH = CELL * COLUMNS;
const HEIGHT = CELL;
const SILHOUETTE_COLOR = hex('#101A3B');
const CHECK = process.argv.includes('--check');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const RELEASES = [
  ['terravok', 'evolution-1'], ['terravok', 'evolution-2'], ['terravok', 'perfect'],
  ['lumora', 'evolution-1'], ['lumora', 'evolution-2'], ['lumora', 'perfect'],
  ['solivar', 'evolution-1'], ['solivar', 'evolution-2'], ['solivar', 'perfect'],
];

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
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
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  if (width !== WIDTH || height !== HEIGHT) {
    throw new Error(`${file}: esperado ${WIDTH}x${HEIGHT}, recebido ${width}x${height}`);
  }
  if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filterMethod !== 0 || interlace !== 0) {
    throw new Error(`${file}: use PNG RGBA8 nao-interlaced (color type 6)`);
  }
  if (idat.length === 0) throw new Error(`${file}: PNG sem IDAT`);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== (stride + 1) * height) throw new Error(`${file}: dados PNG truncados`);
  const rgba = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    if (filter > 4) throw new Error(`${file}: filtro PNG ${filter} nao suportado`);
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= bytesPerPixel ? rgba[y * stride + x - bytesPerPixel] : 0;
      const up = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? rgba[(y - 1) * stride + x - bytesPerPixel]
        : 0;
      const predictor = filter === 1 ? left
        : filter === 2 ? up
          : filter === 3 ? Math.floor((left + up) / 2)
            : filter === 4 ? paeth(left, up, upperLeft)
              : 0;
      rgba[y * stride + x] = (value + predictor) & 0xff;
    }
    rawOffset += stride;
  }

  const canvas = new PixelCanvas(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      canvas.set(x, y, [rgba[index], rgba[index + 1], rgba[index + 2], rgba[index + 3]]);
    }
  }
  return canvas;
}

function validateAtlas(canvas, label) {
  for (let column = 0; column < COLUMNS; column += 1) {
    let opaque = 0;
    let transparent = 0;
    const startX = column * CELL;
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const [red, green, blue, alpha] = canvas.get(startX + x, y);
        if (alpha !== 0 && alpha !== 255) {
          throw new Error(`${label}: coluna ${column} contem alpha parcial em ${x},${y}`);
        }
        if (alpha === 255) opaque += 1;
        else transparent += 1;
        const chromaDistance = Math.hypot(255 - red, green, 255 - blue);
        const nearKey = chromaDistance < 92 && red > 185 && blue > 170 && green < 105;
        const redFringe = red > 220 && green < 60 && blue > 120 && red >= blue * 0.9;
        if (alpha === 255 && (nearKey || redFringe)) {
          throw new Error(`${label}: coluna ${column} contem halo de chroma em ${x},${y}`);
        }
        const onBorder = x === 0 || x === CELL - 1 || y === 0 || y === CELL - 1;
        if (onBorder && alpha > 0) {
          throw new Error(`${label}: coluna ${column} toca a borda em ${x},${y}`);
        }
      }
    }
    if (opaque === 0 || transparent === 0) {
      throw new Error(`${label}: coluna ${column} deve ter pixels opacos e transparentes`);
    }
  }
}

function idleSilhouette(atlas) {
  const out = new PixelCanvas(CELL, CELL);
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      if (atlas.get(x, y)[3] === 255) out.set(x, y, SILHOUETTE_COLOR);
    }
  }
  return out;
}

function idlePortrait(atlas) {
  const out = new PixelCanvas(CELL, CELL);
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) out.set(x, y, atlas.get(x, y));
  }
  return out;
}

function expectedVariants(canvas, basename) {
  return [
    [`${basename}.png`, canvas.png()],
    [`${basename}@2x.png`, canvas.scale(2).png()],
    [`${basename}@3x.png`, canvas.scale(3).png()],
  ];
}

function publish(file, expected) {
  if (CHECK) {
    if (!existsSync(file)) throw new Error(`${file}: derivado ausente`);
    if (!readFileSync(file).equals(expected)) throw new Error(`${file}: derivado desatualizado`);
    return false;
  }
  if (existsSync(file) && readFileSync(file).equals(expected)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, expected);
  return true;
}

if (process.argv.includes('--self-test')) {
  const fixture = join(
    OUTPUT_ROOT,
    'terravok',
    'evolution-1',
    'home-actions-v1.png',
  );
  const atlas = decodeRgba8Png(fixture);
  const contractFixture = new PixelCanvas(WIDTH, HEIGHT);
  for (let column = 0; column < COLUMNS; column += 1) {
    contractFixture.set(column * CELL + Math.floor(CELL / 2), Math.floor(CELL / 2), [255, 255, 255, 255]);
  }
  validateAtlas(contractFixture, 'self-test');
  const silhouette = idleSilhouette(contractFixture);
  if (atlas.scale(3).width !== WIDTH * 3 || silhouette.scale(3).height !== HEIGHT * 3) {
    throw new Error('self-test: escala nearest-neighbor invalida');
  }
  console.log('pixel-art:adaris:self-test: decoder, grid, alpha, silhueta e escala validos');
  process.exit(0);
}

let changed = 0;
for (const [line, stage] of RELEASES) {
  const source = join(SOURCE_ROOT, line, stage, 'home-actions-v2.png');
  if (!existsSync(source)) throw new Error(`${source}: fonte autoral ausente`);
  const atlas = decodeRgba8Png(source);
  validateAtlas(atlas, `${line}/${stage}`);
  const silhouette = idleSilhouette(atlas);
  const portrait = idlePortrait(atlas);
  const outputDir = join(OUTPUT_ROOT, line, stage);
  for (const [name, data] of [
    ...expectedVariants(atlas, 'home-actions-v2'),
    ...expectedVariants(portrait, 'portrait-v2'),
    ...expectedVariants(silhouette, 'silhouette-v2'),
  ]) {
    if (publish(join(outputDir, name), data)) changed += 1;
  }
}

console.log(CHECK
  ? 'pixel-art:adaris:check: 9 fontes e 81 derivados validos'
  : `pixel-art:adaris:build: 81 derivados verificados, ${changed} gravados`);
