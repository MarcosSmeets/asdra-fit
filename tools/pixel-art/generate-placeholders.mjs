// Gera os PNGs placeholder pixel art do Build 5 em apps/mobile/assets/pixel-art/.
// Determinístico: rodar duas vezes produz bytes idênticos. Variantes @1x/@2x/@3x
// pré-escaladas por nearest-neighbor (nitidez sem depender de filtro em runtime).
//
// Uso: node tools/pixel-art/generate-placeholders.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PixelCanvas } from './pixelCanvas.mjs';
import { CELL, POSES, drawAdariCell, drawAdariPortrait, drawAdariSilhouette } from './adariShapes.mjs';
import { TILE, drawGroundTile, drawPathTile, drawPortalTile } from './journeyTiles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'apps', 'mobile', 'assets', 'pixel-art');

const LINES = ['terravok', 'lumora', 'solivar'];
const STAGES = ['base', 'evolution-1', 'evolution-2', 'perfect'];
const REGIONS = ['r1', 'r2', 'r3'];

let written = 0;

/** Grava canvas em name.png/@2x/@3x (escala inteira nearest-neighbor). */
function writeVariants(canvas, relPath) {
  for (const [suffix, factor] of [['', 1], ['@2x', 2], ['@3x', 3]]) {
    const file = join(OUT, `${relPath}${suffix}.png`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, (factor === 1 ? canvas : canvas.scale(factor)).png());
    written += 1;
  }
}

// ---------- Adaris: atlas de ações (8 poses × 1 linha), retrato, silhueta ----------
for (const line of LINES) {
  STAGES.forEach((stageSlug, stageIndex) => {
    const atlas = new PixelCanvas(CELL * POSES.length, CELL);
    POSES.forEach((pose, column) => {
      atlas.blit(drawAdariCell(line, stageIndex, pose), column * CELL, 0);
    });
    const dir = `adaris/${line}/${stageSlug}`;
    writeVariants(atlas, `${dir}/home-actions-v1`);
    writeVariants(drawAdariPortrait(line, stageIndex), `${dir}/portrait-v1`);
    writeVariants(drawAdariSilhouette(line, stageIndex), `${dir}/silhouette-v1`);
  });
}

// ---------- Jornada: tiles por região ----------
for (const region of REGIONS) {
  writeVariants(drawGroundTile(region), `journey/${region}/tile-ground-v1`);
  writeVariants(drawPathTile(region), `journey/${region}/tile-path-v1`);
  writeVariants(drawPortalTile(region), `journey/${region}/portal-v1`);
}

console.log(`pixel-art: ${written} arquivos gerados em ${OUT}`);
console.log(`- adaris: ${LINES.length} linhas × ${STAGES.length} estágios (atlas ${CELL * POSES.length}×${CELL}, retrato, silhueta)`);
console.log(`- journey: ${REGIONS.length} regiões (ground/path/portal ${TILE}×${TILE})`);
