// Tiles placeholder da Jornada (32×32) por região — r1/r2/r3 com paleta própria.
import { PixelCanvas, hex, shade, mulberry32, hashSeed } from './pixelCanvas.mjs';
import { palette } from './palette.mjs';

export const TILE = 32;

// Paleta por região (r1 terra/dourado, r2 maré/teal, r3 constelação/violeta).
const REGION_STYLE = {
  r1: { ground: hex(palette.cosmic.midnight), accent: hex(palette.stellar.gold), glow: hex(palette.stellar.lightGold) },
  r2: { ground: hex(palette.cosmic.deep), accent: hex(palette.energy.teal), glow: hex(palette.energy.cyan) },
  r3: { ground: hex(palette.cosmic.indigo), accent: hex(palette.energy.violet), glow: hex(palette.energy.purple) },
};

export function drawGroundTile(regionKey) {
  const style = REGION_STYLE[regionKey];
  const c = new PixelCanvas(TILE, TILE);
  c.fill(style.ground);
  const rng = mulberry32(hashSeed(`${regionKey}/ground`));
  for (let i = 0; i < 26; i += 1) {
    const x = Math.floor(rng() * TILE);
    const y = Math.floor(rng() * TILE);
    c.set(x, y, rng() > 0.8 ? shade(style.ground, 1.5) : shade(style.ground, 0.7));
  }
  // 2 estrelas discretas por tile
  c.set(Math.floor(rng() * TILE), Math.floor(rng() * TILE), hex(palette.stellar.white, 120));
  c.set(Math.floor(rng() * TILE), Math.floor(rng() * TILE), hex(palette.stellar.white, 90));
  return c;
}

export function drawPathTile(regionKey) {
  const style = REGION_STYLE[regionKey];
  const c = drawGroundTile(regionKey);
  const band = shade(style.ground, 1.6);
  c.rect(0, 12, TILE, 8, band);
  c.rect(0, 12, TILE, 1, shade(style.ground, 2));
  // pontos de circuito digitais no centro do caminho
  for (let x = 2; x < TILE; x += 6) c.set(x, 16, style.accent);
  return c;
}

export function drawPortalTile(regionKey) {
  const style = REGION_STYLE[regionKey];
  const c = new PixelCanvas(TILE, TILE);
  // arco do portal em degraus (cantos recortados)
  for (let y = 4; y < 30; y += 1) {
    const inset = y < 8 ? 8 - y : 4;
    c.set(6 + Math.max(0, inset - 4), y, style.accent);
    c.set(25 - Math.max(0, inset - 4), y, style.accent);
  }
  c.rect(10, 3, 12, 2, style.accent);
  // interior: bandas verticais de energia (sólidas, sem gradiente)
  for (let y = 6; y < 30; y += 1) {
    for (let x = 9; x <= 22; x += 1) {
      if ((x + y) % 4 === 0) c.set(x, y, style.glow);
      else if ((x + y) % 4 === 2) c.set(x, y, shade(style.glow, 0.55));
    }
  }
  c.set(12, 9, hex(palette.stellar.white));
  c.set(19, 21, hex(palette.stellar.white));
  c.rect(4, 30, 24, 2, shade(style.accent, 0.6));
  return c;
}
