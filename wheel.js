/* ════════════════════════════════════════════
   wheel.js — Randomizer Wheel
════════════════════════════════════════════ */

const canvas = document.getElementById('wheelCanvas');
const ctx    = canvas.getContext('2d');
const CX     = canvas.width  / 2;
const CY     = canvas.height / 2;
const RADIUS = CX - 12;

const WHEEL_COLORS = [
  ['#5b21b6', '#a5b4fc'],
  ['#0e7490', '#67e8f9'],
  ['#7c3aed', '#ddd6fe'],
  ['#0891b2', '#a5f3fc'],
  ['#6d28d9', '#c4b5fd'],
  ['#0369a1', '#bae6fd'],
];

let wheelItems = [];
let wheelAngle = -Math.PI / 2;
let spinning   = false;

function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (wheelItems.length === 0) {
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59,29,110,0.35)';
    ctx.fill();
    ctx.strokeStyle = '#3b1d6e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#8b6fae';
    ctx.font = '14px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add items to spin!', CX, CY);
    return;
  }

  const total = wheelItems.reduce((s, i) => s + i.weight, 0);
  let start = wheelAngle;

  wheelItems.forEach((item, idx) => {
    const arc = (item.weight / total) * Math.PI * 2;
    const [fill, textCol] = WHEEL_COLORS[idx % WHEEL_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RADIUS, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#08001a';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (arc > 0.12) {
      const mid = start + arc / 2;
      const tr  = RADIUS * 0.62;
      ctx.save();
      ctx.translate(CX + Math.cos(mid) * tr, CY + Math.sin(mid) * tr);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = textCol;
      ctx.font = `bold ${Math.max(10, Math.min(14, RADIUS * 0.09))}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = item.label.length > WHEEL_LABEL_MAX ? item.label.slice(0, WHEEL_LABEL_MAX - 1) + '…' : item.label;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    if (arc > 0.3 && wheelItems.length <= WHEEL_BADGE_MAX) {
      const mid = start + arc / 2;
      const br  = RADIUS * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${item.weight}`, CX + Math.cos(mid) * br, CY + Math.sin(mid) * br);
    }

    start += arc;
  });

  ctx.beginPath();
  ctx.arc(CX, CY, WHEEL_HUB_RADIUS, 0, Math.PI * 2);
  const hub = ctx.createRadialGradient(CX, CY, 2, CX, CY, WHEEL_HUB_RADIUS);
  hub.addColorStop(0, '#22d3ee');
  hub.addColorStop(1, '#08001a');
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(34,211,238,0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function spinWheel(onDone) {
  if (spinning || wheelItems.length < 2) return;
  spinning = true;
  document.getElementById('wheelSpinBtn').disabled = true;
  document.getElementById('wheelWinner').classList.add('hidden');

  const total = wheelItems.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * total;
  let winnerIdx = wheelItems.length - 1;
  for (let i = 0; i < wheelItems.length; i++) {
    rand -= wheelItems[i].weight;
    if (rand <= 0) { winnerIdx = i; break; }
  }

  let cumulAngle = 0;
  for (let i = 0; i < winnerIdx; i++) {
    cumulAngle += (wheelItems[i].weight / total) * Math.PI * 2;
  }
  const sliceAngle = (wheelItems[winnerIdx].weight / total) * Math.PI * 2;
  const offset     = sliceAngle * WHEEL_EDGE_GUARD + Math.random() * sliceAngle * (1 - WHEEL_EDGE_GUARD * 2);
  const targetBase = -Math.PI / 2 - cumulAngle - offset;
  let delta = ((targetBase - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  if (delta < 0.01) delta = Math.PI * 2;
  delta += WHEEL_EXTRA_SPINS * Math.PI * 2;

  const finalAngle = wheelAngle + delta;
  const startAngle = wheelAngle;
  const startTime  = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const t    = Math.min((now - startTime) / WHEEL_SPIN_MS, 1);
    wheelAngle = startAngle + delta * easeOutCubic(t);
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      wheelAngle = finalAngle;
      spinning   = false;
      document.getElementById('wheelSpinBtn').disabled = false;
      const winnerLabel = wheelItems[winnerIdx].label;
      const el = document.getElementById('wheelWinner');
      el.textContent = `✦ ${winnerLabel} ✦`;
      el.classList.remove('hidden');
      if (onDone) onDone(winnerLabel);
    }
  }

  requestAnimationFrame(frame);
}

function renderWheelItems() {
  const container = document.getElementById('wheelItems');
  container.innerHTML = '';
  wheelItems.forEach((item, idx) => {
    const tag = document.createElement('div');
    tag.className = 'wheel-item-tag';
    tag.innerHTML = `
      <span>${escHtml(item.label)} <em style="opacity:.6">(${item.weight})</em></span>
      <button class="remove" data-idx="${idx}" title="Remove">✕</button>
    `;
    container.appendChild(tag);
  });
  container.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      wheelItems.splice(parseInt(btn.dataset.idx), 1);
      document.getElementById('wheelWinner').classList.add('hidden');
      renderWheelItems();
      drawWheel();
      document.getElementById('wheelSpinBtn').disabled = wheelItems.length < 2;
    });
  });
}

document.getElementById('wheelAddBtn').addEventListener('click', () => {
  const nameEl   = document.getElementById('wheelItemName');
  const weightEl = document.getElementById('wheelItemWeight');
  const label    = nameEl.value.trim();
  const weight   = Math.max(0.1, Math.min(100, parseFloat(weightEl.value) || 1));
  if (!label) { nameEl.focus(); return; }
  if (wheelItems.length >= WHEEL_MAX_ITEMS) {
    termPrint(`✗ Wheel full (${WHEEL_MAX_ITEMS} items max).`, 'error');
    return;
  }
  wheelItems.push({ label, weight: +weight.toFixed(1) });
  nameEl.value   = '';
  weightEl.value = '1';
  nameEl.focus();
  renderWheelItems();
  drawWheel();
  document.getElementById('wheelSpinBtn').disabled = wheelItems.length < 2;
  document.getElementById('wheelWinner').classList.add('hidden');
});

document.getElementById('wheelItemName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('wheelAddBtn').click();
});

document.getElementById('wheelSpinBtn').addEventListener('click', spinWheel);

drawWheel();
