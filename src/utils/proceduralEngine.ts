// 100% offline procedural canvas image synthesis seeded from prompt & seed

function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function derivePalette(prompt: string, rng: () => number): [string, string, string, string] {
  const lower = prompt.toLowerCase();
  if (lower.includes('wald') || lower.includes('natur') || lower.includes('botan') || lower.includes('grün') || lower.includes('ginkgo')) {
    return ['#0e1f18', '#1d4d3a', '#6fa37b', '#e5ddc8'];
  }
  if (lower.includes('meer') || lower.includes('see') || lower.includes('ozean') || lower.includes('wasser') || lower.includes('blau')) {
    return ['#091524', '#163c60', '#4d8bb8', '#e2eef7'];
  }
  if (lower.includes('sonne') || lower.includes('wüste') || lower.includes('abend') || lower.includes('gold') || lower.includes('herbst')) {
    return ['#1c110d', '#6e2c18', '#d97036', '#f4d3a1'];
  }
  if (lower.includes('architektur') || lower.includes('beton') || lower.includes('minimal') || lower.includes('schwarz') || lower.includes('uhr')) {
    return ['#111317', '#2b303a', '#8c94a0', '#eceae4'];
  }
  const baseHue = Math.floor(rng() * 360);
  const compHue = (baseHue + 38) % 360;
  return [
    `hsl(${baseHue}, 28%, 10%)`,
    `hsl(${baseHue}, 42%, 28%)`,
    `hsl(${compHue}, 58%, 54%)`,
    `hsl(${compHue}, 35%, 88%)`,
  ];
}

function parseRgb(hexOrHsl: string): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return [30, 30, 40];
  ctx.fillStyle = hexOrHsl;
  const computed = ctx.fillStyle;
  if (computed.startsWith('#')) {
    const n = parseInt(computed.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = computed.match(/\d+/g);
  if (m && m.length >= 3) {
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  return [40, 40, 50];
}

export function generateProceduralArtwork(params: {
  prompt: string;
  width: number;
  height: number;
  seed?: string;
}): { dataUrl: string; seed: string } {
  const usedSeed = params.seed && params.seed.trim()
    ? params.seed.trim()
    : String(Math.floor(Math.random() * 9_000_000) + 1_000_000);

  const numericSeed = hashString(`${params.prompt}::${usedSeed}`);
  const rng = createRng(numericSeed);

  const w = params.width;
  const h = params.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palette = derivePalette(params.prompt, rng);
  const rgbPalette = palette.map(parseRgb);

  // Build coarse noise grid for smooth multi-octave domain-warped FBM
  const gridSize = 48;
  const grid = new Float32Array(gridSize * gridSize);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rng();
  }

  const sampleGrid = (nx: number, ny: number): number => {
    const x = ((nx % gridSize) + gridSize) % gridSize;
    const y = ((ny % gridSize) + gridSize) % gridSize;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = (x0 + 1) % gridSize;
    const y1 = (y0 + 1) % gridSize;
    const tx = smoothstep(x - x0);
    const ty = smoothstep(y - y0);
    const v00 = grid[y0 * gridSize + x0];
    const v10 = grid[y0 * gridSize + x1];
    const v01 = grid[y1 * gridSize + x0];
    const v11 = grid[y1 * gridSize + x1];
    return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
  };

  const fbm = (x: number, y: number): number => {
    let val = 0;
    let amp = 0.5;
    let freq = 2.4;
    for (let o = 0; o < 4; o++) {
      val += amp * sampleGrid(x * freq, y * freq);
      freq *= 2.05;
      amp *= 0.5;
    }
    return val;
  };

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const warpScale = 1.6 + rng() * 1.4;
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const wx = fbm(nx * 2.2, ny * 2.2);
      const wy = fbm(nx * 2.2 + 5.2, ny * 2.2 + 1.3);
      const field = fbm(nx * 2.5 + warpScale * wx, ny * 2.5 + warpScale * wy);

      const t = Math.max(0, Math.min(0.999, field * 1.25 - 0.1));
      const scaled = t * (rgbPalette.length - 1);
      const idx = Math.floor(scaled);
      const frac = smoothstep(scaled - idx);
      const cA = rgbPalette[idx];
      const cB = rgbPalette[Math.min(rgbPalette.length - 1, idx + 1)];

      const grain = (rng() - 0.5) * 11;
      const p = (y * w + x) * 4;
      data[p] = Math.max(0, Math.min(255, lerp(cA[0], cB[0], frac) + grain));
      data[p + 1] = Math.max(0, Math.min(255, lerp(cA[1], cB[1], frac) + grain));
      data[p + 2] = Math.max(0, Math.min(255, lerp(cA[2], cB[2], frac) + grain));
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Layer architectural / organic vector geometry inspired by prompt keywords
  const lower = params.prompt.toLowerCase();
  const isGeometric = lower.includes('architektur') || lower.includes('bauhaus') || lower.includes('uhr') || lower.includes('minimal') || lower.includes('geometr');

  ctx.save();
  if (isGeometric) {
    const count = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
      const cx = w * (0.2 + rng() * 0.6);
      const cy = h * (0.2 + rng() * 0.6);
      const r = Math.min(w, h) * (0.08 + rng() * 0.24);
      ctx.beginPath();
      if (i % 2 === 0) {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        ctx.rect(cx - r, cy - r * 0.65, r * 2, r * 1.3);
      }
      ctx.strokeStyle = palette[3];
      ctx.globalAlpha = 0.22 + rng() * 0.35;
      ctx.lineWidth = 1.5 + rng() * 2;
      ctx.stroke();
    }
  } else {
    // Organic contour waves
    ctx.strokeStyle = palette[3];
    for (let line = 0; line < 14; line++) {
      ctx.beginPath();
      ctx.globalAlpha = 0.08 + rng() * 0.16;
      ctx.lineWidth = 1 + rng() * 1.5;
      const baseY = h * (0.15 + (line / 14) * 0.72);
      const amp = 18 + rng() * 42;
      const phase = rng() * Math.PI * 2;
      for (let x = 0; x <= w; x += 8) {
        const y = baseY + Math.sin((x / w) * Math.PI * 2.5 + phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  // Subtle vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    seed: usedSeed,
  };
}
