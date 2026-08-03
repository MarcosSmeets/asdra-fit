// Silhuetas placeholder das três linhas evolutivas (Build 5).
// Geometria procedural determinística em célula lógica 64×64 — NÃO é arte
// final: garante silhueta distinta por linha, crescimento por estágio (§16-17)
// e leitura de pose até a arte 32-bit chegar (ver PIXEL_ART_ASSET_BACKLOG.md).
import { PixelCanvas, hex, shade, mulberry32, hashSeed } from './pixelCanvas.mjs';
import { palette } from './palette.mjs';

export const CELL = 64;
export const PORTRAIT = 48;
const BASELINE = 56;

// Colunas do atlas de ações (mesma semântica do atlas v2 / SEQUENCES do app).
export const POSES = [
  'idle', 'idleAlt', 'affection', 'eating', 'resting', 'battleReady', 'attacking', 'takingDamage',
];

// Direção de crescimento por linha (spec §16-17).
const LINE_STYLE = {
  terravok: {
    body: hex(palette.stellar.gold),
    belly: hex(palette.stellar.lightGold),
    accent: hex(palette.stellar.lightGold),
    energy: hex(palette.energy.cyan),
    wide: true,
  },
  lumora: {
    body: hex(palette.energy.teal),
    belly: hex('#7FD2CB'),
    accent: hex(palette.stellar.lightGold),
    energy: hex(palette.energy.cyan),
    wide: false,
  },
  solivar: {
    body: hex(palette.energy.violet),
    belly: hex('#B9A6F2'),
    accent: hex(palette.stellar.white),
    energy: hex(palette.stellar.gold),
    wide: false,
  },
};

// Fator de tamanho por estágio (BASE menor → PERFECT imponente).
const STAGE_SIZE = [0.68, 0.8, 0.92, 1.0];

function poseParams(pose) {
  switch (pose) {
    case 'idleAlt': return { dy: -1, lean: 0, eyes: 'open', mouthOpen: false, squash: 1 };
    case 'affection': return { dy: -2, lean: 0, eyes: 'happy', mouthOpen: false, squash: 1 };
    case 'eating': return { dy: 1, lean: 1, eyes: 'open', mouthOpen: true, squash: 1 };
    case 'resting': return { dy: 6, lean: 0, eyes: 'closed', mouthOpen: false, squash: 0.72 };
    case 'battleReady': return { dy: 0, lean: 3, eyes: 'open', mouthOpen: false, squash: 0.94 };
    case 'attacking': return { dy: -1, lean: 7, eyes: 'open', mouthOpen: true, squash: 0.94 };
    case 'takingDamage': return { dy: 1, lean: -5, eyes: 'hit', mouthOpen: true, squash: 0.9 };
    default: return { dy: 0, lean: 0, eyes: 'open', mouthOpen: false, squash: 1 };
  }
}

function drawEyes(c, x, y, eyes, dark) {
  if (eyes === 'closed') {
    c.rect(x - 1, y, 3, 1, dark);
    c.rect(x + 5, y, 3, 1, dark);
    return;
  }
  if (eyes === 'happy') {
    c.set(x - 1, y - 1, dark); c.set(x, y, dark); c.set(x + 1, y - 1, dark);
    c.set(x + 5, y - 1, dark); c.set(x + 6, y, dark); c.set(x + 7, y - 1, dark);
    return;
  }
  if (eyes === 'hit') {
    for (const ox of [0, 6]) {
      c.set(x - 1 + ox, y - 1, dark); c.set(x + 1 + ox, y + 1, dark);
      c.set(x + 1 + ox, y - 1, dark); c.set(x - 1 + ox, y + 1, dark);
    }
    return;
  }
  c.rect(x - 1, y - 1, 2, 3, dark);
  c.rect(x + 5, y - 1, 2, 3, dark);
}

function sprinkleStars(c, rng, count, color, area) {
  for (let i = 0; i < count; i += 1) {
    const x = area.x + Math.floor(rng() * area.w);
    const y = area.y + Math.floor(rng() * area.h);
    if (c.get(x, y)[3] > 0) c.set(x, y, color);
  }
}

/** Aura da forma PERFECT: anel pontilhado de energia em volta do corpo. */
function drawAura(c, cx, cy, rx, ry, color) {
  for (let angle = 0; angle < 32; angle += 1) {
    const t = (angle / 32) * Math.PI * 2;
    if (angle % 2 === 0) c.set(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, color);
  }
}

function drawTerravok(c, stage, p, rng) {
  const s = STAGE_SIZE[stage];
  const style = LINE_STYLE.terravok;
  const dark = shade(style.body, 0.45);
  const bw = Math.round(22 * s) + 6;
  const bh = Math.round(15 * s * p.squash) + 5;
  const cx = 32 + Math.round(p.lean * 0.6);
  const cy = BASELINE + p.dy - bh;

  // pernas robustas
  const legW = stage >= 2 ? 5 : 4;
  c.rect(cx - bw + 3, cy + bh - 3, legW, BASELINE + p.dy - (cy + bh - 3), shade(style.body, 0.75));
  c.rect(cx + bw - 3 - legW, cy + bh - 3, legW, BASELINE + p.dy - (cy + bh - 3), shade(style.body, 0.75));
  // corpo largo (muralha que caminha)
  c.disc(cx, cy, bw, bh, style.body);
  c.disc(cx, cy + Math.round(bh * 0.35), Math.round(bw * 0.62), Math.round(bh * 0.5), style.belly);
  // placas de cristal nas costas: quantidade cresce com o estágio
  const plates = stage + 1;
  for (let i = 0; i < plates; i += 1) {
    const px = cx - Math.round(bw * 0.5) + Math.round((i * bw) / Math.max(1, plates - 0.5));
    const ph = 4 + stage * 2 - (i % 2);
    c.rect(px, cy - bh - ph + 2, 3, ph, style.accent);
    c.set(px + 1, cy - bh - ph + 1, hex(palette.stellar.white));
  }
  // cabeça à frente
  const hr = Math.round(8 * s) + 3;
  const hx = cx + bw - 2 + Math.round(p.lean * 0.4);
  const hy = cy - Math.round(bh * 0.55);
  c.disc(hx, hy, hr, hr, style.body);
  // chifres: discretos → chifres-estrela (PERFECT)
  const hornH = 2 + stage * 2;
  c.rect(hx - 2, hy - hr - hornH, 2, hornH + 2, style.accent);
  c.rect(hx + 3, hy - hr - hornH, 2, hornH + 2, style.accent);
  if (stage === 3) {
    c.set(hx - 2, hy - hr - hornH - 1, hex(palette.stellar.white));
    c.set(hx + 4, hy - hr - hornH - 1, hex(palette.stellar.white));
  }
  drawEyes(c, hx - 3, hy - 1, p.eyes, dark);
  if (p.mouthOpen) c.rect(hx + 2, hy + 3, 3, 2, dark);
  // circuitos dourados a partir da EV2
  if (stage >= 2) {
    c.rect(cx - Math.round(bw * 0.4), cy, Math.round(bw * 0.8), 1, style.energy);
    sprinkleStars(c, rng, 6 + stage * 3, style.energy, { x: cx - bw, y: cy - bh, w: bw * 2, h: bh * 2 });
  }
  if (stage === 3) drawAura(c, cx, cy - 2, bw + 5, bh + 8, hex(palette.stellar.lightGold));
  c.outline(dark);
}

function drawLumora(c, stage, p, rng) {
  const s = STAGE_SIZE[stage];
  const style = LINE_STYLE.lumora;
  const dark = shade(style.body, 0.42);
  const bw = Math.round(10 * s) + 4;
  const bh = Math.round(17 * s * p.squash) + 5;
  const cx = 34 + Math.round(p.lean * 0.7);
  const cy = BASELINE + p.dy - bh;

  // cauda fluida: cadeia de discos, mais longa a cada estágio
  const tailLen = 4 + stage * 3;
  for (let i = 0; i < tailLen; i += 1) {
    const t = i / tailLen;
    const tx = cx - bw - i * 2;
    const ty = cy + Math.round(Math.sin(t * 2.6) * 6 * (1 - t)) + Math.round(t * 6);
    const tr = Math.max(1, Math.round((1 - t) * 4 * s) + 1);
    c.disc(tx, ty, tr, tr, i % 3 === 2 ? style.accent : shade(style.body, 0.85));
  }
  // pernas ágeis
  c.rect(cx - 4, cy + bh - 2, 3, BASELINE + p.dy - (cy + bh - 2), shade(style.body, 0.75));
  c.rect(cx + 2, cy + bh - 2, 3, BASELINE + p.dy - (cy + bh - 2), shade(style.body, 0.75));
  // corpo esguio vertical
  c.disc(cx, cy, bw, bh, style.body);
  c.disc(cx, cy + Math.round(bh * 0.25), Math.round(bw * 0.55), Math.round(bh * 0.55), style.belly);
  // asas de energia a partir da EV2
  if (stage >= 2) {
    const wingW = 6 + (stage - 2) * 5;
    for (let i = 0; i < wingW; i += 1) {
      const wh = Math.max(1, Math.round((wingW - i) * 0.9));
      c.rect(cx - bw - 2 - i, cy - Math.round(bh * 0.4) - wh, 1, wh, style.energy);
      c.rect(cx + bw + 2 + i, cy - Math.round(bh * 0.4) - wh, 1, wh, style.energy);
    }
  }
  // linhas aerodinâmicas a partir da EV1
  if (stage >= 1) {
    c.rect(cx - bw + 2, cy - 2, Math.round(bw * 1.2), 1, style.energy);
    c.rect(cx - bw + 4, cy + 3, Math.round(bw * 0.9), 1, style.energy);
  }
  // cabeça no topo, brasas suaves
  const hr = Math.round(6 * s) + 3;
  const hx = cx + 2 + Math.round(p.lean * 0.3);
  const hy = cy - bh - Math.round(hr * 0.4);
  c.disc(hx, hy, hr, hr, style.body);
  drawEyes(c, hx - 3, hy - 1, p.eyes, dark);
  if (p.mouthOpen) c.rect(hx + 1, hy + 3, 3, 2, dark);
  sprinkleStars(c, rng, 5 + stage * 2, style.accent, { x: cx - bw, y: cy - bh, w: bw * 2, h: bh * 2 });
  if (stage === 3) {
    // cauda-cometa da Stridara
    for (let i = 0; i < 10; i += 1) c.set(cx - bw - tailLen * 2 - i, cy + 8 + Math.round(i * 0.4), style.energy);
    drawAura(c, cx, cy - 4, bw + 9, bh + 7, hex(palette.energy.cyan));
  }
  c.outline(dark);
}

function drawSolivar(c, stage, p, rng) {
  const s = STAGE_SIZE[stage];
  const style = LINE_STYLE.solivar;
  const dark = shade(style.body, 0.42);
  const bw = Math.round(14 * s) + 4;
  const bh = Math.round(14 * s * p.squash) + 5;
  const cx = 32 + Math.round(p.lean * 0.6);
  const cy = BASELINE + p.dy - bh - 4;

  // asas: presentes desde a BASE, amplas na EV2, asas-cometa na PERFECT
  const wingSpan = 7 + stage * 4;
  for (let i = 0; i < wingSpan; i += 1) {
    const wh = Math.max(1, Math.round((wingSpan - i) * (0.7 + stage * 0.12)));
    const wy = cy - Math.round(bh * 0.2);
    c.rect(cx - bw - 1 - i, wy - wh, 1, wh, i % 4 === 3 ? style.accent : shade(style.body, 0.8));
    c.rect(cx + bw + 1 + i, wy - wh, 1, wh, i % 4 === 3 ? style.accent : shade(style.body, 0.8));
  }
  // pernas leves
  c.rect(cx - 4, cy + bh - 2, 3, BASELINE + p.dy - (cy + bh - 2), shade(style.body, 0.72));
  c.rect(cx + 2, cy + bh - 2, 3, BASELINE + p.dy - (cy + bh - 2), shade(style.body, 0.72));
  // corpo equilibrado
  c.disc(cx, cy, bw, bh, style.body);
  c.disc(cx, cy + Math.round(bh * 0.3), Math.round(bw * 0.58), Math.round(bh * 0.5), style.belly);
  // cabeça simétrica
  const hr = Math.round(7 * s) + 3;
  const hx = cx + Math.round(p.lean * 0.3);
  const hy = cy - bh - Math.round(hr * 0.35);
  c.disc(hx, hy, hr, hr, style.body);
  drawEyes(c, hx - 3, hy - 1, p.eyes, hex(palette.cosmic.deepest));
  if (p.mouthOpen) c.rect(hx - 1, hy + 3, 3, 2, hex(palette.cosmic.deepest));
  // constelações: pontos brancos ligados, mais completos por estágio
  const stars = 3 + stage * 3;
  let prev = null;
  const starRng = mulberry32(hashSeed(`solivar-stars-${stage}`));
  for (let i = 0; i < stars; i += 1) {
    const sx = cx - Math.round(bw * 0.7) + Math.floor(starRng() * bw * 1.4);
    const sy = cy - Math.round(bh * 0.6) + Math.floor(starRng() * bh * 1.2);
    c.set(sx, sy, style.accent);
    if (prev && stage >= 1) {
      const steps = Math.max(Math.abs(sx - prev[0]), Math.abs(sy - prev[1]));
      for (let t = 1; t < steps; t += 2) {
        c.set(prev[0] + Math.round(((sx - prev[0]) * t) / steps), prev[1] + Math.round(((sy - prev[1]) * t) / steps), shade(style.body, 1.25));
      }
    }
    prev = [sx, sy];
  }
  sprinkleStars(c, rng, 4 + stage * 2, style.energy, { x: cx - bw, y: cy - bh, w: bw * 2, h: bh * 2 });
  if (stage === 3) {
    // estrelas orbitando o corpo (Solvyr)
    drawAura(c, cx, cy, bw + wingSpan - 2, bh + 9, hex(palette.stellar.gold));
    drawAura(c, cx, cy, bw + 6, bh + 4, hex(palette.stellar.white));
  }
  c.outline(dark);
}

const PAINTERS = { terravok: drawTerravok, lumora: drawLumora, solivar: drawSolivar };

/** Desenha a pose de um estágio na célula 64×64. */
export function drawAdariCell(lineKey, stageIndex, pose) {
  const canvas = new PixelCanvas(CELL, CELL);
  const rng = mulberry32(hashSeed(`${lineKey}/${stageIndex}/${pose}`));
  PAINTERS[lineKey](canvas, stageIndex, poseParams(pose), rng);
  // sombra de contato dura (spec: sem gradiente)
  const shadowColor = hex(palette.cosmic.deepest, 140);
  const sw = LINE_STYLE[lineKey].wide ? 22 : 15;
  if (pose !== 'resting') {
    for (let x = 32 - sw; x <= 32 + sw; x += 1) {
      const edge = Math.abs(32 - x) > sw - 4;
      if (canvas.get(x, 59)[3] === 0) canvas.set(x, 59, edge ? hex(palette.cosmic.deepest, 80) : shadowColor);
    }
  }
  return canvas;
}

/** Retrato 48×48 (cabeça + traço da linha), estilo uniforme entre estágios. */
export function drawAdariPortrait(lineKey, stageIndex) {
  const c = new PixelCanvas(PORTRAIT, PORTRAIT);
  const style = LINE_STYLE[lineKey];
  const dark = shade(style.body, 0.42);
  const rng = mulberry32(hashSeed(`${lineKey}/portrait/${stageIndex}`));
  const r = 13 + stageIndex * 2;
  const cx = 24;
  const cy = 26;
  c.disc(cx, cy, r + 2, r, style.body);
  c.disc(cx, cy + Math.round(r * 0.4), Math.round(r * 0.7), Math.round(r * 0.5), style.belly);
  if (lineKey === 'terravok') {
    const hornH = 3 + stageIndex * 2;
    c.rect(cx - 6, cy - r - hornH, 3, hornH + 2, style.accent);
    c.rect(cx + 4, cy - r - hornH, 3, hornH + 2, style.accent);
  } else if (lineKey === 'lumora') {
    for (let i = 0; i < 3 + stageIndex; i += 1) c.set(cx - r + 2 + i * 3, cy - r + 1 + (i % 2), style.accent);
  } else {
    const span = 4 + stageIndex * 2;
    for (let i = 0; i < span; i += 1) {
      const wh = Math.max(1, span - i);
      c.rect(cx - r - 3 - i, cy - wh + 2, 1, wh, shade(style.body, 0.8));
      c.rect(cx + r + 3 + i, cy - wh + 2, 1, wh, shade(style.body, 0.8));
    }
    sprinkleStars(c, rng, 4 + stageIndex * 2, style.accent, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
  }
  drawEyes(c, cx - 5, cy - 2, 'open', lineKey === 'solivar' ? hex(palette.cosmic.deepest) : dark);
  if (stageIndex === 3) drawAura(c, cx, cy, r + 6, r + 5, style.accent);
  c.outline(dark);
  return c;
}

/** Silhueta de bloqueado: pose idle recolorida em tom escuro. */
export function drawAdariSilhouette(lineKey, stageIndex) {
  const base = drawAdariCell(lineKey, stageIndex, 'idle');
  const sil = base.silhouette(hex(palette.cosmic.midnight));
  sil.outline(hex(palette.neutral.border));
  return sil;
}
