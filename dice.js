/* ════════════════════════════════════════════
   dice.js — Dice panel, D4 Fate, Coin Toss
════════════════════════════════════════════ */

/* ── Dice Panel ── */
const diceLog = [];
let rollMode = 'normal';

const advSlider = document.getElementById('advSlider');
const advWrap   = advSlider.closest('.adv-slider-wrap');
advSlider.addEventListener('input', () => {
  const v = +advSlider.value;
  rollMode = v === 0 ? 'dis' : v === 2 ? 'adv' : 'normal';
  advWrap.dataset.mode = rollMode;
});

function rollDice(count, sides) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function pushDiceLog(logText) {
  diceLog.unshift(logText);
  if (diceLog.length > DICE_LOG_MAX) diceLog.pop();
  document.getElementById('diceLog').innerHTML = diceLog.map(e => `<div class="log-entry">${e}</div>`).join('');
}

function showDiceResult(sides, rolls, modifier, mode, otherRolls) {
  mode = mode || 'normal';
  const sum       = rolls.reduce((a, b) => a + b, 0) + modifier;
  const resultEl  = document.getElementById('diceResult');
  const modeGlyph = mode === 'adv' ? ' ↑' : mode === 'dis' ? ' ↓' : '';
  const label     = `${rolls.length}d${sides}${modifier > 0 ? '+' + modifier : modifier < 0 ? modifier : ''}${modeGlyph}`;

  let detail = '';
  if (mode !== 'normal' && otherRolls) {
    const otherSum = otherRolls.reduce((a, b) => a + b, 0) + modifier;
    detail = rolls.length <= DICE_DETAIL_MAX
      ? `[${rolls.join(', ')}] ✓  vs  [${otherRolls.join(', ')}]`
      : `${sum} ✓  vs  ${otherSum}`;
  } else {
    detail = (rolls.length > 1 && rolls.length <= DICE_DETAIL_MAX)
      ? `[${rolls.join(', ')}]${modifier !== 0 ? (modifier > 0 ? ' +' + modifier : ' ' + modifier) : ''}`
      : '';
  }

  resultEl.innerHTML = `
    <div class="result-label">${label}</div>
    <div class="result-total">${sum}</div>
    ${detail ? `<div class="result-detail">${detail}</div>` : ''}
  `;

  let logText;
  if (mode !== 'normal' && otherRolls) {
    const otherSum = otherRolls.reduce((a, b) => a + b, 0) + modifier;
    logText = `<span class="log-die">${label}</span> → <span class="log-total">${sum}</span> ✓ vs ${otherSum}`;
  } else {
    logText = (rolls.length > DICE_DETAIL_MAX || !detail)
      ? `<span class="log-die">${label}</span> = <span class="log-total">${sum}</span>`
      : `<span class="log-die">${label}</span> → ${detail} = <span class="log-total">${sum}</span>`;
  }
  pushDiceLog(logText);
}

function rollAndShow(count, sides, modifier, mode) {
  if (mode === 'normal' || !mode) {
    showDiceResult(sides, rollDice(count, sides), modifier);
    return;
  }
  const a = rollDice(count, sides), b = rollDice(count, sides);
  const sa = a.reduce((x, y) => x + y, 0), sb = b.reduce((x, y) => x + y, 0);
  const [chosen, other] = mode === 'adv'
    ? (sa >= sb ? [a, b] : [b, a])
    : (sa <= sb ? [a, b] : [b, a]);
  showDiceResult(sides, chosen, modifier, mode, other);
}

document.querySelectorAll('.die-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const count = Math.max(1, Math.min(DICE_MAX, parseInt(document.getElementById('diceCount').value) || 1));
    btn.classList.remove('rolling');
    void btn.offsetWidth;
    btn.classList.add('rolling');
    btn.addEventListener('animationend', () => btn.classList.remove('rolling'), { once: true });
    if (btn.dataset.sides === '4')    { rollD4Fate(count, rollMode); return; }
    if (btn.dataset.sides === 'coin') { flipCoins(count); return; }
    rollAndShow(count, parseInt(btn.dataset.sides), 0, rollMode);
  });
});

/* ── D4 Fate ── */
function createD4Card(face) {
  const wrap = document.createElement('div');
  wrap.className = 'd4-wrap';
  const card = document.createElement('div');
  card.className = 'd4-card';
  card.innerHTML = `
    <div class="d4-face d4-back"><span class="d4-back-label">d4</span></div>
    <div class="d4-face d4-front" style="background:${face.bg};border-color:${face.border};box-shadow:inset 0 0 14px ${face.glow}">
      <span class="d4-value-badge" style="color:${face.color}">${face.value}</span>
      <div class="d4-icon" style="color:${face.color};filter:drop-shadow(0 0 7px ${face.glow})">${face.icon}</div>
      <span class="d4-name" style="color:${face.color}">${face.name}</span>
    </div>`;
  wrap.appendChild(card);
  const spins = (COIN_SPINS_MIN + Math.floor(Math.random() * COIN_SPINS_RANGE)) * 360;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    card.style.transform = `rotateY(${spins + 180}deg)`;
  }));
  return wrap;
}

function rollD4Fate(count, mode) {
  const m = mode || 'normal';
  let advPair = null;

  const results = Array.from({ length: count }, () => {
    const a = D4_FACES[Math.floor(Math.random() * D4_FACES.length)];
    if (m === 'normal') return a;
    const b      = D4_FACES[Math.floor(Math.random() * D4_FACES.length)];
    const winner = m === 'adv' ? (a.value >= b.value ? a : b) : (a.value <= b.value ? a : b);
    const loser  = winner === a ? b : a;
    if (count === 1) advPair = { a, b, winner, loser };
    return winner;
  });

  const sum       = results.reduce((a, f) => a + f.value, 0);
  const modeGlyph = m === 'adv' ? ' ↑' : m === 'dis' ? ' ↓' : '';
  const resultEl  = document.getElementById('diceResult');
  resultEl.innerHTML = '';

  const box = document.createElement('div');
  box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0.5rem;width:100%';

  const lbl = document.createElement('div');
  lbl.className = 'result-label';
  lbl.textContent = count === 1 ? `d4${modeGlyph}` : `${count}d4${modeGlyph} = ${sum}`;
  box.appendChild(lbl);

  const faceCounts = {};
  D4_FACES.forEach(f => { faceCounts[f.name] = 0; });
  results.forEach(f => faceCounts[f.name]++);

  const logText = count === 1
    ? `<span class="log-die">d4${modeGlyph}</span> → <span style="color:${results[0].color}">${results[0].logChar} ${results[0].name} (${results[0].value})</span>`
    : `<span class="log-die">${count}d4${modeGlyph}</span> = <span class="log-total">${sum}</span> &nbsp;`
      + D4_FACES.filter(f => faceCounts[f.name] > 0)
          .map(f => `<span style="color:${f.color}">${f.logChar}×${faceCounts[f.name]}</span>`)
          .join(' ');

  function settle(names) {
    if (names) { names.style.transition = 'opacity 0.35s ease'; names.style.opacity = '1'; }
    termPrint(count === 1
      ? `${results[0].logChar} ${results[0].phrase}`
      : `d4 ×${count}${modeGlyph}  sum: ${sum}`, 'rolls');
    pushDiceLog(logText);
  }

  if (count <= COIN_ANIM_MAX && m === 'normal') {
    const row   = document.createElement('div');
    row.className = 'coins-row';
    const names = document.createElement('div');
    names.className = 'coin-names';
    names.style.opacity = '0';
    results.forEach(f => {
      const span = document.createElement('span');
      span.style.cssText = `color:${f.color};text-shadow:0 0 8px ${f.glow}`;
      span.textContent = count === 1 ? f.phrase : `${f.name} (${f.value})`;
      names.appendChild(span);
    });
    let pending = count;
    results.forEach(f => {
      const wrap = createD4Card(f);
      wrap.querySelector('.d4-card').addEventListener('transitionend', () => {
        if (--pending === 0) settle(names);
      }, { once: true });
      row.appendChild(wrap);
    });
    box.appendChild(row);
    box.appendChild(names);

  } else if (advPair) {
    const row   = document.createElement('div');
    row.className = 'coins-row';
    const names = document.createElement('div');
    names.className = 'coin-names';
    names.style.opacity = '0';
    const span = document.createElement('span');
    span.style.cssText = `color:${advPair.winner.color};text-shadow:0 0 8px ${advPair.winner.glow}`;
    span.textContent = advPair.winner.phrase;
    names.appendChild(span);
    let pending = 2;
    const wrapA = createD4Card(advPair.a);
    const wrapB = createD4Card(advPair.b);
    [wrapA, wrapB].forEach(wrap => {
      wrap.querySelector('.d4-card').addEventListener('transitionend', () => {
        if (--pending === 0) {
          const loserWrap = advPair.loser === advPair.a ? wrapA : wrapB;
          loserWrap.style.transition = 'opacity 0.5s, filter 0.5s';
          loserWrap.style.opacity    = '0.22';
          loserWrap.style.filter     = 'grayscale(0.85)';
          settle(names);
        }
      }, { once: true });
      row.appendChild(wrap);
    });
    box.appendChild(row);
    box.appendChild(names);

  } else {
    const tot = document.createElement('div');
    tot.className = 'result-total';
    tot.style.fontSize = '1.8rem';
    tot.textContent = sum;
    box.appendChild(tot);
    const breakdown = document.createElement('div');
    breakdown.className = 'result-detail';
    breakdown.innerHTML = D4_FACES.filter(f => faceCounts[f.name] > 0)
      .map(f => `<span style="color:${f.color}">${f.logChar} ${f.name} ×${faceCounts[f.name]}</span>`)
      .join('  ');
    box.appendChild(breakdown);
    settle(null);
  }

  resultEl.appendChild(box);
}

/* ── Coin Toss ── */
function createCoin(showDux) {
  const wrap = document.createElement('div');
  wrap.className = 'coin-wrap';
  const coin = document.createElement('div');
  coin.className = 'coin';
  coin.innerHTML = `
    <div class="coin-face coin-front">
      <span class="coin-symbol coin-good">✦</span>
      <span class="coin-name">Elskan</span>
    </div>
    <div class="coin-face coin-back">
      <span class="coin-symbol coin-evil">⚔</span>
      <span class="coin-name">Dux</span>
    </div>`;
  wrap.appendChild(coin);
  const spins    = (COIN_SPINS_MIN + Math.floor(Math.random() * COIN_SPINS_RANGE)) * 360;
  const finalDeg = spins + (showDux ? 180 : 0);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    coin.style.transform = `rotateY(${finalDeg}deg)`;
  }));
  return wrap;
}

function flipCoins(count) {
  const results  = Array.from({ length: count }, () => Math.random() < 0.5 ? 'dux' : 'elskan');
  const resultEl = document.getElementById('diceResult');
  resultEl.innerHTML = '';

  const box = document.createElement('div');
  box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0.5rem;width:100%';

  const lbl = document.createElement('div');
  lbl.className = 'result-label';
  lbl.textContent = `${count}dc`;
  box.appendChild(lbl);

  const e = results.filter(r => r === 'elskan').length;
  const logText = count <= 2
    ? `<span class="log-die">${count}dc</span> → ${results.map(r =>
        r === 'dux'
          ? '<span class="log-dux">⚔ Dux</span>'
          : '<span class="log-elskan">✦ Elskan</span>'
      ).join(', ')}`
    : `<span class="log-die">${count}dc</span> → <span class="log-elskan">${e}✦</span> / <span class="log-dux">${count - e}⚔</span>`;

  function settle(names) {
    if (names) { names.style.transition = 'opacity 0.35s ease'; names.style.opacity = '1'; }
    termPrint(count === 1
      ? (results[0] === 'dux' ? '⚔ Dux has spoken' : '✦ Elskan watches over you')
      : `coin ×${count}  ✦ ${e}  ⚔ ${count - e}`, 'rolls');
    pushDiceLog(logText);
  }

  if (count <= COIN_ANIM_MAX) {
    const row   = document.createElement('div');
    row.className = 'coins-row';
    const names = document.createElement('div');
    names.className = 'coin-names';
    names.style.opacity = '0';
    if (count === 1) {
      const span = document.createElement('span');
      span.className = results[0] === 'dux' ? 'coin-name-dux' : 'coin-name-elskan';
      span.textContent = results[0] === 'dux' ? '⚔ Dux has spoken' : '✦ Elskan watches over you';
      names.appendChild(span);
    } else {
      results.forEach(r => {
        const span = document.createElement('span');
        span.className = r === 'dux' ? 'coin-name-dux' : 'coin-name-elskan';
        span.textContent = r === 'dux' ? '⚔ Dux' : '✦ Elskan';
        names.appendChild(span);
      });
    }
    let pending = count;
    results.forEach(r => {
      const wrap = createCoin(r === 'dux');
      wrap.querySelector('.coin').addEventListener('transitionend', () => {
        if (--pending === 0) settle(names);
      }, { once: true });
      row.appendChild(wrap);
    });
    box.appendChild(row);
    box.appendChild(names);
  } else {
    const tot = document.createElement('div');
    tot.className = 'result-total';
    tot.style.fontSize = '1.6rem';
    tot.innerHTML = `<span class="coin-name-elskan">${e}✦</span> / <span class="coin-name-dux">${count - e}⚔</span>`;
    box.appendChild(tot);
    const detail = document.createElement('div');
    detail.className = 'result-detail';
    detail.textContent = results.map(r => r === 'dux' ? '⚔' : '✦').join(' ');
    box.appendChild(detail);
    settle(null);
  }

  resultEl.appendChild(box);
}
