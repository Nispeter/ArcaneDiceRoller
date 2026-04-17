/* ════════════════════════════════════════════
   STARS
════════════════════════════════════════════ */
(function spawnStars() {
  const container = document.querySelector('.stars');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.2 + 0.6;
    s.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random()*100}%`, `top:${Math.random()*100}%`,
      `--dur:${(Math.random()*3+1.5).toFixed(1)}s`,
      `--delay:-${(Math.random()*4).toFixed(1)}s`,
      `opacity:${(Math.random()*0.5+0.1).toFixed(2)}`
    ].join(';');
    container.appendChild(s);
  }
})();

/* ════════════════════════════════════════════
   DICE PANEL
════════════════════════════════════════════ */
const diceLog = [];

function rollDice(count, sides) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function showDiceResult(sides, rolls, modifier) {
  const sum = rolls.reduce((a, b) => a + b, 0) + modifier;
  const resultEl = document.getElementById('diceResult');

  const label = `${rolls.length}d${sides}${modifier > 0 ? '+'+modifier : modifier < 0 ? modifier : ''}`;
  const detail = rolls.length > 1 ? `[${rolls.join(', ')}]${modifier !== 0 ? (modifier > 0 ? ' +'+modifier : ' '+modifier) : ''}` : '';

  resultEl.innerHTML = `
    <div class="result-label">${label}</div>
    <div class="result-total">${sum}</div>
    ${detail ? `<div class="result-detail">${detail}</div>` : ''}
  `;

  const logText = detail
    ? `<span class="log-die">${label}</span> → ${detail} = <span class="log-total">${sum}</span>`
    : `<span class="log-die">${label}</span> = <span class="log-total">${sum}</span>`;

  diceLog.unshift(logText);
  if (diceLog.length > 20) diceLog.pop();

  const logEl = document.getElementById('diceLog');
  logEl.innerHTML = diceLog.map(e => `<div class="log-entry">${e}</div>`).join('');
}

document.querySelectorAll('.die-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sides = parseInt(btn.dataset.sides);
    const count = Math.max(1, Math.min(20, parseInt(document.getElementById('diceCount').value) || 1));
    btn.classList.remove('rolling');
    void btn.offsetWidth; // reflow to restart animation
    btn.classList.add('rolling');
    btn.addEventListener('animationend', () => btn.classList.remove('rolling'), { once: true });
    showDiceResult(sides, rollDice(count, sides), 0);
  });
});

/* ════════════════════════════════════════════
   COMMAND TERMINAL
════════════════════════════════════════════ */
const termOutput = document.getElementById('termOutput');
const termInput  = document.getElementById('termInput');

function termPrint(text, cls = 'info') {
  const line = document.createElement('div');
  line.className = `term-line ${cls}`;
  line.innerHTML = text;
  termOutput.appendChild(line);
  termOutput.scrollTop = termOutput.scrollHeight;
}

const ROLL_RE = /^\/r(?:oll)?\s+(\d{1,2})d(\d{1,3})([+-]\d{1,4})?$/i;

function handleTermCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;

  termPrint(`&gt; ${escHtml(cmd)}`, 'cmd');

  if (/^\/clear$/i.test(cmd)) {
    termOutput.innerHTML = '';
    return;
  }

  if (/^\/help$/i.test(cmd)) {
    [
      '── Dice Commands ─────────────────',
      '/r &lt;NdX&gt;            Roll N dice (X sides)',
      '/r &lt;NdX+M&gt;          Roll with modifier',
      '/roll               Alias for /r',
      '── Wheel Commands ────────────────',
      '/add &lt;name&gt; [w]     Add item (w = weight, default 1)',
      '/spin               Spin the wheel',
      '/wlist              List wheel items',
      '/wclear             Clear all wheel items',
      '── Other ─────────────────────────',
      '/clear              Clear terminal',
      '/help               Show this message',
      '─ Examples ───────────────────────',
      '/r 2d6+3',
      '/add Fireball 3',
      '/add Shield 1',
      '/spin',
    ].forEach(l => termPrint(l, 'info'));
    return;
  }

  const m = cmd.match(ROLL_RE);
  if (m) {
    const count = Math.min(20, Math.max(1, parseInt(m[1])));
    const sides = Math.min(1000, Math.max(2, parseInt(m[2])));
    const mod   = m[3] ? parseInt(m[3]) : 0;

    const rolls = rollDice(count, sides);
    const sum   = rolls.reduce((a, b) => a + b, 0) + mod;
    const modStr = mod > 0 ? ` + ${mod}` : mod < 0 ? ` - ${Math.abs(mod)}` : '';

    termPrint(`🎲 Rolling ${count}d${sides}${mod !== 0 ? (mod > 0 ? '+'+mod : mod) : ''}…`, 'info');
    termPrint(`[ ${rolls.join(' | ')} ]${modStr}`, 'rolls');
    termPrint(`Total: <strong>${sum}</strong>`, 'result');
    return;
  }

  // /add <name> [weight]
  const addM = cmd.match(/^\/add\s+(.+?)(?:\s+(\d+(?:\.\d+)?))?$/i);
  if (addM) {
    const label  = addM[1].trim().slice(0, 24);
    const weight = addM[2] ? Math.max(0.1, Math.min(100, parseFloat(addM[2]))) : 1;
    if (wheelItems.length >= 20) {
      termPrint('✗ Wheel is full (20 items max).', 'error');
      return;
    }
    wheelItems.push({ label, weight: +weight.toFixed(1) });
    renderWheelItems();
    drawWheel();
    document.getElementById('wheelSpinBtn').disabled = wheelItems.length < 2;
    document.getElementById('wheelWinner').classList.add('hidden');
    termPrint(`✦ Added "${escHtml(label)}" (weight ${weight.toFixed(1)}) to the wheel.`, 'result');
    return;
  }

  // /spin
  if (/^\/spin$/i.test(cmd)) {
    if (wheelItems.length < 2) {
      termPrint('✗ Need at least 2 items on the wheel. Use /add &lt;name&gt; [weight].', 'error');
      return;
    }
    if (spinning) {
      termPrint('✗ The wheel is already spinning!', 'error');
      return;
    }
    termPrint('🎡 Spinning the wheel…', 'info');
    spinWheel(winner => termPrint(`✦ The wheel chose: <strong>${escHtml(winner)}</strong>`, 'winner'));
    return;
  }

  // /wlist
  if (/^\/wlist$/i.test(cmd)) {
    if (wheelItems.length === 0) {
      termPrint('Wheel is empty. Use /add &lt;name&gt; [weight].', 'info');
      return;
    }
    termPrint('── Wheel Items ───────────────────', 'info');
    wheelItems.forEach((item, i) =>
      termPrint(`  ${i+1}. ${escHtml(item.label)} (weight ${item.weight})`, 'info')
    );
    return;
  }

  // /wclear
  if (/^\/wclear$/i.test(cmd)) {
    wheelItems.length = 0;
    renderWheelItems();
    drawWheel();
    document.getElementById('wheelSpinBtn').disabled = true;
    document.getElementById('wheelWinner').classList.add('hidden');
    termPrint('✦ Wheel cleared.', 'result');
    return;
  }

  termPrint(`✗ Unknown incantation: "${escHtml(cmd)}" — try /help`, 'error');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function submitTerm() {
  handleTermCommand(termInput.value);
  termInput.value = '';
  termInput.focus();
}

termInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitTerm(); });
document.getElementById('termSubmit').addEventListener('click', submitTerm);

document.querySelectorAll('.term-hints span').forEach(hint => {
  hint.addEventListener('click', () => {
    termInput.value = hint.dataset.cmd;
    termInput.focus();
  });
});

/* ════════════════════════════════════════════
   RANDOMIZER WHEEL
════════════════════════════════════════════ */
const canvas  = document.getElementById('wheelCanvas');
const ctx     = canvas.getContext('2d');
const CX      = canvas.width  / 2;
const CY      = canvas.height / 2;
const RADIUS  = CX - 12;

const COLORS = [
  ['#5b21b6','#a5b4fc'],
  ['#0e7490','#67e8f9'],
  ['#7c3aed','#ddd6fe'],
  ['#0891b2','#a5f3fc'],
  ['#6d28d9','#c4b5fd'],
  ['#0369a1','#bae6fd'],
];

let wheelItems  = [];
let wheelAngle  = -Math.PI / 2;
let spinning    = false;

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
    const [fill, textCol] = COLORS[idx % COLORS.length];

    // Slice
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RADIUS, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#08001a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    if (arc > 0.12) {
      const mid = start + arc / 2;
      const tr  = RADIUS * 0.62;
      const tx  = CX + Math.cos(mid) * tr;
      const ty  = CY + Math.sin(mid) * tr;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = textCol;
      ctx.font = `bold ${Math.max(10, Math.min(14, RADIUS * 0.09))}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = item.label.length > 11 ? item.label.slice(0, 10) + '…' : item.label;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Weight badge (small arc near rim)
    if (arc > 0.3 && wheelItems.length <= 12) {
      const mid = start + arc / 2;
      const br  = RADIUS * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `9px "Share Tech Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${item.weight}`, CX + Math.cos(mid)*br, CY + Math.sin(mid)*br);
    }

    start += arc;
  });

  // Center hub
  ctx.beginPath();
  ctx.arc(CX, CY, 18, 0, Math.PI * 2);
  const hub = ctx.createRadialGradient(CX, CY, 2, CX, CY, 18);
  hub.addColorStop(0, '#22d3ee');
  hub.addColorStop(1, '#08001a');
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outer ring glow
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

  // Pick winner by weight
  const total = wheelItems.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * total;
  let winnerIdx = wheelItems.length - 1;
  for (let i = 0; i < wheelItems.length; i++) {
    rand -= wheelItems[i].weight;
    if (rand <= 0) { winnerIdx = i; break; }
  }

  // Cumulative angle to the start of the winner segment
  let cumulAngle = 0;
  for (let i = 0; i < winnerIdx; i++) {
    cumulAngle += (wheelItems[i].weight / total) * Math.PI * 2;
  }
  const sliceAngle = (wheelItems[winnerIdx].weight / total) * Math.PI * 2;
  // Random landing point inside the slice (avoid 10% edges)
  const offset = sliceAngle * 0.1 + Math.random() * sliceAngle * 0.8;

  // The pointer sits at -π/2. We need:
  //   wheelAngle_final + cumulAngle + offset = -π/2  (mod 2π)
  const targetBase = -Math.PI / 2 - cumulAngle - offset;
  let delta = ((targetBase - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  if (delta < 0.01) delta = Math.PI * 2;
  delta += 6 * Math.PI * 2; // 6 full extra spins

  const finalAngle   = wheelAngle + delta;
  const startAngle   = wheelAngle;
  const duration     = 4200;
  const startTime    = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const t      = Math.min((now - startTime) / duration, 1);
    wheelAngle   = startAngle + delta * easeOutCubic(t);
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      wheelAngle = finalAngle;
      spinning   = false;
      document.getElementById('wheelSpinBtn').disabled = false;
      const winnerLabel = wheelItems[winnerIdx].label;
      showWheelWinner(winnerLabel);
      if (onDone) onDone(winnerLabel);
    }
  }

  requestAnimationFrame(frame);
}

function showWheelWinner(label) {
  const el = document.getElementById('wheelWinner');
  el.textContent = `✦ ${label} ✦`;
  el.classList.remove('hidden');
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
  const nameInput   = document.getElementById('wheelItemName');
  const weightInput = document.getElementById('wheelItemWeight');
  const label       = nameInput.value.trim();
  const weight      = Math.max(0.1, Math.min(100, parseFloat(weightInput.value) || 1));

  if (!label) { nameInput.focus(); return; }
  if (wheelItems.length >= 20) {
    alert('Maximum 20 items on the wheel.');
    return;
  }

  wheelItems.push({ label, weight: +weight.toFixed(1) });
  nameInput.value   = '';
  weightInput.value = '1';
  nameInput.focus();

  renderWheelItems();
  drawWheel();
  document.getElementById('wheelSpinBtn').disabled = wheelItems.length < 2;
  document.getElementById('wheelWinner').classList.add('hidden');
});

document.getElementById('wheelItemName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('wheelAddBtn').click();
});

document.getElementById('wheelSpinBtn').addEventListener('click', spinWheel);

// Initial draw
drawWheel();
