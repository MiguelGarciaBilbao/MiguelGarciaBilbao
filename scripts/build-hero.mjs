// Generates assets/hero.svg and assets/hero-mobile.svg.
// Run: cd scripts && npm install && node build-hero.mjs
// Text is outlined to paths (Geist, SIL OFL) so the figure renders the same everywhere.
import opentype from 'opentype.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => opentype.loadSync(join(here, 'fonts', f));
const F = {
  s4: load('geist-sans-400.ttf'),
  s5: load('geist-sans-500.ttf'),
  s6: load('geist-sans-600.ttf'),
  m4: load('geist-mono-400.ttf'),
  m5: load('geist-mono-500.ttf'),
};

const C = {
  ground: '#2438C9',
  band90: '#3B54E4',
  band50: '#566EF3',
  ink: '#FFFFFF',
  soft: '#C9D2FF',
  axis: '#7F8FF2',
  now: '#FFD447',
  era: '#3E55E2',
};

// Dates as decimal years.
const T = {
  start: 2021.79, // Oct 2021, Softeca graduate programme
  nettrim: 2026.12, // Feb 2026
  mscFrom: 2026.17, // Mar 2026
  now: 2026.87, // Nov 2026
};

// Observed trace: illustrative "scope" over time, anchored on real dates.
const ANCHORS = [
  [T.start, 0.1],
  [2022.45, 0.24],
  [2023.2, 0.33],
  [2024.2, 0.43],
  [2025.3, 0.5],
  [2026.0, 0.54],
  [T.nettrim, 0.6],
  [2026.5, 0.7],
  [T.now, 0.78],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function observed() {
  const rand = rng(1499);
  const pts = [];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [t0, v0] = ANCHORS[i];
    const [t1, v1] = ANCHORS[i + 1];
    const n = Math.max(2, Math.round((t1 - t0) / 0.05));
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const jitter = k === 0 ? 0 : (rand() - 0.5) * 0.022;
      pts.push([t0 + (t1 - t0) * u, v0 + (v1 - v0) * u + jitter]);
    }
  }
  pts.push(ANCHORS[ANCHORS.length - 1]);
  return pts;
}

const valueAt = (t) => {
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [t0, v0] = ANCHORS[i];
    const [t1, v1] = ANCHORS[i + 1];
    if (t >= t0 && t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return ANCHORS[ANCHORS.length - 1][1];
};

const median = (dt) => 0.78 + 0.16 * (1 - Math.exp(-1.6 * dt));
const half = (dt, w) => w * Math.sqrt(dt / 1.6);

const r1 = (n) => Math.round(n * 10) / 10;

function build(o) {
  const X = (t) => o.x0 + (t - 2021.55) * o.pxYear;
  const Y = (v) => o.base - v * o.scale;
  const out = [];
  const text = (str, x, y, font, size, fill, anchor = 'start') => {
    const w = font.getAdvanceWidth(str, size);
    const ax = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    out.push(`<path fill="${fill}" d="${font.getPath(str, ax, y, size).toPathData(1)}"/>`);
    return w;
  };

  const tEnd = 2021.55 + (o.W - o.x0) / o.pxYear;
  const xNow = X(T.now);
  const yNow = Y(0.78);

  // Forecast bands: flat layers, depth by overlap only.
  const band = (w, fill) => {
    const up = [];
    const down = [];
    for (let dt = 0; dt <= tEnd - T.now + 0.001; dt += 0.05) {
      up.push(`${r1(X(T.now + dt))},${r1(Y(median(dt) + half(dt, w)))}`);
      down.unshift(`${r1(X(T.now + dt))},${r1(Y(median(dt) - half(dt, w)))}`);
    }
    out.push(`<polygon fill="${fill}" points="${up.join(' ')} ${down.join(' ')}"/>`);
  };
  band(0.3, C.band90);
  band(0.13, C.band50);

  // Axis and year ticks.
  out.push(`<path d="M${o.x0} ${o.axis}H${o.W}" stroke="${C.axis}" stroke-width="1"/>`);
  for (let yr = 2022; yr <= Math.floor(tEnd); yr++) {
    const x = r1(X(yr));
    out.push(`<path d="M${x} ${o.axis}v5" stroke="${C.axis}" stroke-width="1"/>`);
    if (!o.everyOtherYear || yr % 2 === 0) {
      text(String(yr), x, o.axis + 20, F.m4, o.tick, C.soft, 'middle');
    }
  }

  // Era bars under the axis: employers and the MSc, at their real dates.
  const bar = (from, to, y, fill, label, labelFill, outside) => {
    const x = r1(X(from));
    const w = r1(X(to) - X(from));
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${o.barH}" rx="3" fill="${fill}"/>`);
    if (outside) text(label, x + w + 8, y + o.barH / 2 + o.barText * 0.36, F.m5, o.barText, fill);
    else text(label, x + 8, y + o.barH / 2 + o.barText * 0.36, F.m5, o.barText, labelFill);
  };
  bar(T.start, T.nettrim - 0.02, o.row1, C.era, o.softecaLabel, C.ink, false);
  bar(T.nettrim, T.now, o.row1, C.ink, 'nettrim', C.ground, o.barsOutside);
  bar(T.mscFrom, T.now, o.row2, C.now, o.mscLabel, C.ground, o.barsOutside);

  // Now line.
  out.push(`<path d="M${r1(xNow)} ${o.nowTop}V${o.axis}" stroke="${C.now}" stroke-width="1"/>`);
  text(o.nowLabel, xNow, o.nowTop - 8, F.m5, o.tick, C.now, 'middle');

  // Forecast median.
  const med = [];
  for (let dt = 0; dt <= tEnd - T.now + 0.001; dt += 0.05) med.push(`${r1(X(T.now + dt))},${r1(Y(median(dt)))}`);
  out.push(`<polyline fill="none" stroke="${C.now}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" points="${med.join(' ')}"/>`);

  // Observed trace.
  const obs = observed().map(([t, v]) => `${r1(X(t))},${r1(Y(v))}`);
  out.push(`<polyline fill="none" stroke="${C.ink}" stroke-width="${o.trace}" stroke-linejoin="round" stroke-linecap="round" points="${obs.join(' ')}"/>`);

  // Milestone points and stems.
  const dot = (t) => {
    const x = r1(X(t));
    const y = r1(Y(valueAt(t)));
    out.push(`<circle cx="${x}" cy="${y}" r="5" fill="${C.ground}" stroke="${C.ink}" stroke-width="2"/>`);
    return [x, y];
  };
  const [xs, ys] = dot(T.start);
  text('Oct 2021', xs + 12, ys + 20, F.m4, o.tick, C.soft);
  out.push(`<g transform="rotate(-90 ${o.x0 - 12} ${o.base - o.scale / 2})">`);
  text('scope, illustrative', o.x0 - 12, o.base - o.scale / 2 + 4, F.m4, 11, C.soft, 'middle');
  out.push('</g>');
  const [xn, yn] = [r1(X(T.nettrim)), r1(Y(valueAt(T.nettrim)))];
  out.push(`<path d="M${xn} ${yn - 8}V${o.ragStemTop}" stroke="${C.soft}" stroke-width="1"/>`);
  dot(T.nettrim);

  // Live reading at "now".
  out.push(`<circle class="pulse" cx="${r1(xNow)}" cy="${r1(yNow)}" r="6" fill="none" stroke="${C.now}" stroke-width="2"/>`);
  out.push(`<circle cx="${r1(xNow)}" cy="${r1(yNow)}" r="5.5" fill="${C.now}" stroke="${C.ground}" stroke-width="2"/>`);

  // Annotations.
  for (const a of o.notes({ X, Y, xn, xNow })) text(a[0], a[1], a[2], F[a[3]], a[4], a[5], a[6]);

  // Legend.
  o.legend({ out, text });

  // Title.
  for (const a of o.title) text(a[0], a[1], a[2], F[a[3]], a[4], a[5]);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.W} ${o.H}" width="${o.W}" height="${o.H}" role="img" aria-labelledby="t d">
<title id="t">Miguel García Bilbao, Senior Software Engineer, full stack and applied AI</title>
<desc id="d">A career drawn as a forecast plot. Observed trace from 2021 to November 2026: Softeca from October 2021 (full stack, then Technical Lead of a team of 5), nettrim from February 2026 with a RAG pipeline in production, and an MSc in Artificial Intelligence at UAX from March to November 2026. From now on, a forecast fan pointing at applied AI and senior frontend roles.</desc>
<style>
.pulse{transform-box:fill-box;transform-origin:center;animation:p 2.6s cubic-bezier(.16,1,.3,1) infinite}
@keyframes p{0%{transform:scale(1);opacity:.9}70%,100%{transform:scale(3.2);opacity:0}}
@media (prefers-reduced-motion:reduce){.pulse{animation:none;opacity:0}}
</style>
<clipPath id="c"><rect width="${o.W}" height="${o.H}" rx="${o.radius}"/></clipPath>
<g clip-path="url(#c)">
<rect width="${o.W}" height="${o.H}" fill="${C.ground}"/>
${out.join('\n')}
</g>
</svg>
`;
}

const legendRow = (ctx, x, y, size, kind, label, anchorRight) => {
  const { out, text } = ctx;
  const w = F.m4.getAdvanceWidth(label, size);
  const sx = anchorRight ? x - w - 34 : x;
  const cy = y - size * 0.34;
  if (kind === 'obs') out.push(`<path d="M${sx} ${cy}h24" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`);
  if (kind === 'med') out.push(`<path d="M${sx + 1} ${cy}h24" stroke="${C.now}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>`);
  if (kind === 'band') {
    out.push(`<rect x="${sx}" y="${cy - 6}" width="24" height="12" rx="2" fill="${C.band90}" stroke="${C.axis}" stroke-width="1"/>`);
    out.push(`<rect x="${sx}" y="${cy - 2.5}" width="24" height="5" fill="${C.band50}"/>`);
  }
  text(label, sx + 34, y, F.m4, size, C.soft);
  return w + 34;
};

const desktop = build({
  W: 880, H: 460, radius: 14,
  x0: 36, pxYear: 104, base: 348, scale: 190, axis: 358,
  tick: 12, trace: 2.5,
  row1: 392, row2: 418, barH: 20, barText: 11,
  softecaLabel: 'Softeca', mscLabel: 'MSc AI', barsOutside: false,
  nowTop: 150, nowLabel: 'now · Nov 2026',
  ragStemTop: 170,
  title: [
    ['Miguel García Bilbao', 36, 80, 's6', 42, C.ink],
    ['Senior Software Engineer · full stack & applied AI', 37, 111, 's4', 17.5, C.soft],
  ],
  notes: ({ X, xn, xNow }) => [
    ['Full stack, then Technical Lead', X(2022.6), 222, 's5', 14.5, C.ink],
    ['Team of 5 · 8-module legacy migration', X(2022.6), 241, 's4', 13, C.soft],
    ['RAG in production', xn - 9, 172, 's5', 14.5, C.ink, 'end'],
    ['Python · embeddings · Amazon Bedrock', xn - 9, 191, 's4', 13, C.soft, 'end'],
    ['Open to applied AI', xNow + 22, 268, 's6', 16, C.ink],
    ['and senior frontend roles', xNow + 22, 289, 's6', 16, C.ink],
  ],
  legend: (ctx) => {
    let x = 37;
    x += legendRow(ctx, x, 142, 12, 'obs', 'observed') + 22;
    x += legendRow(ctx, x, 142, 12, 'med', 'forecast, median') + 22;
    legendRow(ctx, x, 142, 12, 'band', '50% and 90% intervals');
  },
});

const mobile = build({
  W: 440, H: 560, radius: 14,
  x0: 22, pxYear: 52, base: 436, scale: 215, axis: 446,
  tick: 12, trace: 2.5, everyOtherYear: true,
  row1: 482, row2: 510, barH: 22, barText: 12,
  softecaLabel: 'Softeca', mscLabel: 'MSc AI', barsOutside: true,
  nowTop: 186, nowLabel: 'now',
  ragStemTop: 236,
  title: [
    ['Miguel García Bilbao', 22, 62, 's6', 34, C.ink],
    ['Senior Software Engineer', 23, 92, 's4', 17, C.soft],
    ['full stack & applied AI', 23, 114, 's4', 17, C.soft],
  ],
  notes: ({ X, xn, xNow }) => [
    ['Full stack, then', X(2022.3), 286, 's5', 14.5, C.ink],
    ['Technical Lead', X(2022.3), 305, 's5', 14.5, C.ink],
    ['RAG in', xn - 9, 222, 's5', 14.5, C.ink, 'end'],
    ['production', xn - 9, 241, 's5', 14.5, C.ink, 'end'],
    ['Open to', xNow + 14, 356, 's6', 15, C.ink],
    ['applied AI', xNow + 14, 376, 's6', 15, C.ink],
    ['and senior', xNow + 14, 396, 's6', 15, C.ink],
    ['frontend roles', xNow + 14, 416, 's6', 15, C.ink],
  ],
  legend: (ctx) => {
    let x = 22;
    x += legendRow(ctx, x, 150, 12, 'obs', 'observed') + 18;
    x += legendRow(ctx, x, 150, 12, 'med', 'forecast') + 18;
    legendRow(ctx, x, 150, 12, 'band', '50% and 90%');
  },
});

mkdirSync(join(here, '..', 'assets'), { recursive: true });
writeFileSync(join(here, '..', 'assets', 'hero.svg'), desktop);
writeFileSync(join(here, '..', 'assets', 'hero-mobile.svg'), mobile);
console.log('hero.svg', desktop.length, 'bytes · hero-mobile.svg', mobile.length, 'bytes');
