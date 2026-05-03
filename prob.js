/* ════════════════════════════════════════════
   prob.js — Dice Probability Viewer
════════════════════════════════════════════ */

// Exact distribution via convolution — supports compound expressions like 2d6+1d4+3
function computeDistForExpr(parsed) {
  let dp = { [parsed.modifier]: 1 };
  for (const { count, sides, sign } of parsed.terms) {
    if (sides === 'c') continue;
    const c = Math.max(1, Math.min(50, count));
    const s = Math.max(2, Math.min(1000, sides));
    let groupDp = { 0: 1 };
    for (let i = 0; i < c; i++) {
      const next = {};
      for (const [v, p] of Object.entries(groupDp)) {
        for (let f = 1; f <= s; f++) {
          const k = +v + f;
          next[k] = (next[k] || 0) + p / s;
        }
      }
      groupDp = next;
    }
    const next = {};
    for (const [dv, dp2] of Object.entries(dp)) {
      for (const [tv, tp] of Object.entries(groupDp)) {
        const k = +dv + sign * +tv;
        next[k] = (next[k] || 0) + dp2 * tp;
      }
    }
    dp = next;
  }
  return Object.entries(dp)
    .map(([v, p]) => ({ value: +v, prob: p }))
    .sort((a, b) => a.value - b.value);
}

function renderProb() {
  const raw       = document.getElementById('probInput').value.trim();
  const targetRaw = document.getElementById('probTarget').value.trim();
  const statsEl   = document.getElementById('probStats');
  const canvas    = document.getElementById('probCanvas');

  const parsed = parseDiceExpr(raw);
  if (!parsed || parsed.terms.every(t => t.sides === 'c')) {
    if (raw) statsEl.innerHTML = '<span style="color:var(--text-dim);font-size:.75rem">Format: 1d20 · 2d6+3 · 1d20+1d6+2</span>';
    return;
  }
  const target = targetRaw !== '' ? parseInt(targetRaw) : null;

  const dist = computeDistForExpr(parsed);
  if (!dist.length) return;

  const minV   = dist[0].value;
  const maxV   = dist[dist.length - 1].value;
  const mean   = dist.reduce((s, d) => s + d.value * d.prob, 0);
  const hitPct = target !== null
    ? dist.filter(d => d.value >= target).reduce((s, d) => s + d.prob, 0) * 100
    : null;

  // ─ Canvas render ─────────────────────────
  const W = canvas.clientWidth || 0;
  const H = canvas.clientHeight || 0;
  if (W < 10) { renderProbStats(statsEl, minV, maxV, mean, hitPct, target); return; }

  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD    = { top: 6, right: 6, bottom: 22, left: 36 };
  const cW     = W - PAD.left - PAD.right;
  const cH     = H - PAD.top  - PAD.bottom;
  const maxP   = Math.max(...dist.map(d => d.prob));
  const barW   = cW / dist.length;
  const gap    = dist.length > 40 ? 0 : 1;

  const cs         = getComputedStyle(document.body);
  const clrPurple  = cs.getPropertyValue('--purple-light').trim() || '#a855f7';
  const clrCyan    = cs.getPropertyValue('--cyan-light').trim()   || '#22d3ee';
  const clrAccent  = cs.getPropertyValue('--accent').trim()       || '#f59e0b';
  const clrDim     = cs.getPropertyValue('--text-dim').trim()     || '#8b6fae';
  const clrBorder  = cs.getPropertyValue('--border').trim()       || '#3b1d6e';

  ctx.clearRect(0, 0, W, H);

  // ── Baseline ──
  ctx.strokeStyle = clrBorder;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top + cH);
  ctx.lineTo(PAD.left + cW, PAD.top + cH);
  ctx.stroke();

  // ── Grid lines + y-axis labels ──
  ctx.font      = '8.5px Share Tech Mono, monospace';
  ctx.textAlign = 'right';
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const y = PAD.top + cH * (1 - f);
    ctx.strokeStyle = clrBorder;
    ctx.globalAlpha = f === 1 ? 0.6 : 0.25;
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = clrDim;
    ctx.fillText(`${(maxP * f * 100).toFixed(1)}%`, PAD.left - 3, y + 3);
  });

  // ── Bar gradients ──
  const missGrad = ctx.createLinearGradient(0, PAD.top + cH, 0, PAD.top);
  missGrad.addColorStop(0, clrPurple + '22');
  missGrad.addColorStop(1, clrPurple + 'BB');
  const hitGrad = ctx.createLinearGradient(0, PAD.top + cH, 0, PAD.top);
  hitGrad.addColorStop(0, clrCyan + '22');
  hitGrad.addColorStop(1, clrCyan + 'CC');

  // ── Bars with rounded tops ──
  const cr = Math.min(3, barW * 0.35);
  dist.forEach((d, i) => {
    const barH = Math.max(1, (d.prob / maxP) * cH);
    const x    = PAD.left + i * barW + gap * 0.5;
    const bw   = Math.max(0.5, barW - gap);
    const y    = PAD.top + cH - barH;
    const hit  = target !== null && d.value >= target;
    ctx.fillStyle = hit ? hitGrad : missGrad;
    const rr = Math.min(cr, barH / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + bw - rr, y);
    ctx.quadraticCurveTo(x + bw, y, x + bw, y + rr);
    ctx.lineTo(x + bw, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
    ctx.fill();
    // Subtle highlight on top edge
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, y, bw, Math.min(2, rr));
  });

  // ── Mean line ──
  const meanIdxF = mean - dist[0].value;
  const meanX    = PAD.left + (meanIdxF + 0.5) * barW;
  ctx.strokeStyle = clrAccent + 'AA';
  ctx.lineWidth   = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(meanX, PAD.top + 10);
  ctx.lineTo(meanX, PAD.top + cH);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle   = clrAccent;
  ctx.font        = '8px Share Tech Mono, monospace';
  ctx.textAlign   = 'center';
  ctx.fillText(`μ ${mean.toFixed(1)}`, meanX, PAD.top + 8);

  // ── Survival curve (smooth bezier) ──
  const survival = [];
  let sv = 1.0;
  for (const d of dist) { survival.push(sv); sv -= d.prob; }

  const survPts = dist.map((_, i) => ({
    x: PAD.left + (i + 0.5) * barW,
    y: PAD.top + cH * (1 - survival[i]),
  }));

  ctx.strokeStyle = clrAccent;
  ctx.lineWidth   = 2;
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = clrAccent;
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  survPts.forEach((pt, i) => {
    if (i === 0) { ctx.moveTo(pt.x, pt.y); return; }
    const prev = survPts[i - 1];
    const mx   = (prev.x + pt.x) / 2;
    ctx.bezierCurveTo(mx, prev.y, mx, pt.y, pt.x, pt.y);
  });
  ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;

  // ── X-axis value labels ──
  ctx.fillStyle = clrDim;
  ctx.font      = `${Math.max(8, Math.min(11, Math.floor(160 / dist.length)))}px Share Tech Mono, monospace`;
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.ceil(dist.length / 8));
  for (let i = 0; i < dist.length; i += step) {
    ctx.fillText(dist[i].value, PAD.left + (i + 0.5) * barW, H - 4);
  }
  if ((dist.length - 1) % step !== 0) {
    ctx.fillText(maxV, PAD.left + (dist.length - 0.5) * barW, H - 4);
  }

  renderProbStats(statsEl, minV, maxV, mean, hitPct, target);
}

function renderProbStats(el, minV, maxV, mean, hitPct, target) {
  const chip = (label, val, cls = '') =>
    `<div class="prob-stat${cls}"><span class="prob-stat-label">${label}</span><span class="prob-stat-val">${val}</span></div>`;
  let html = chip('min', minV) + chip('max', maxV) + chip('mean', mean.toFixed(1));
  if (hitPct !== null) html += chip(`≥ ${target}`, hitPct.toFixed(1) + '%', ' prob-hit');
  el.innerHTML = html;
}

document.getElementById('probBtn').addEventListener('click', renderProb);
['probInput', 'probTarget'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') renderProb(); });
});

// Default render after first paint
window.addEventListener('load', () => {
  document.getElementById('probInput').value = '1d20';
  requestAnimationFrame(() => requestAnimationFrame(renderProb));
});

// Re-render whenever the canvas changes size (window resize, panel toggles, etc.)
let probRsz;
new ResizeObserver(() => {
  clearTimeout(probRsz);
  probRsz = setTimeout(renderProb, 80);
}).observe(document.getElementById('probCanvas'));

document.getElementById('themeSlider')?.addEventListener('input', () => {
  clearTimeout(probRsz);
  probRsz = setTimeout(renderProb, 60);
});
