/* ════════════════════════════════════════════
   STARS
════════════════════════════════════════════ */
(function spawnStars() {
  const container = document.querySelector('.stars');
  for (let i = 0; i < STAR_COUNT; i++) {
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
   PANEL TOGGLES
════════════════════════════════════════════ */
(function initPanelToggles() {
  const KEYS = ['dice', 'terminal', 'wheel', 'party'];
  let state;
  try { state = JSON.parse(localStorage.getItem('arcane-panels')); } catch {}
  if (!state) state = Object.fromEntries(KEYS.map(k => [k, true]));

  function apply() {
    KEYS.forEach(key => {
      const sel = key === 'party' ? '.hp-panel' : `.${key}-panel`;
      document.querySelector(sel).classList.toggle('panel-hidden', !state[key]);
      document.querySelector(`[data-panel="${key}"]`).classList.toggle('active', !!state[key]);
    });
    localStorage.setItem('arcane-panels', JSON.stringify(state));
  }

  document.querySelectorAll('[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      state[btn.dataset.panel] = !state[btn.dataset.panel];
      apply();
    });
  });

  apply();
})();

/* ════════════════════════════════════════════
   DICE PANEL
════════════════════════════════════════════ */
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

function showDiceResult(sides, rolls, modifier, mode, otherRolls) {
  mode = mode || 'normal';
  const sum       = rolls.reduce((a, b) => a + b, 0) + modifier;
  const resultEl  = document.getElementById('diceResult');
  const modeGlyph = mode === 'adv' ? ' ↑' : mode === 'dis' ? ' ↓' : '';
  const label     = `${rolls.length}d${sides}${modifier > 0 ? '+'+modifier : modifier < 0 ? modifier : ''}${modeGlyph}`;

  let detail = '';
  if (mode !== 'normal' && otherRolls) {
    const otherSum = otherRolls.reduce((a, b) => a + b, 0) + modifier;
    detail = rolls.length <= DICE_DETAIL_MAX
      ? `[${rolls.join(', ')}] ✓  vs  [${otherRolls.join(', ')}]`
      : `${sum} ✓  vs  ${otherSum}`;
  } else {
    detail = (rolls.length > 1 && rolls.length <= DICE_DETAIL_MAX)
      ? `[${rolls.join(', ')}]${modifier !== 0 ? (modifier > 0 ? ' +'+modifier : ' '+modifier) : ''}`
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
  diceLog.unshift(logText);
  if (diceLog.length > DICE_LOG_MAX) diceLog.pop();
  document.getElementById('diceLog').innerHTML = diceLog.map(e => `<div class="log-entry">${e}</div>`).join('');
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
    const sides = parseInt(btn.dataset.sides);
    rollAndShow(count, sides, 0, rollMode);
  });
});

/* ════════════════════════════════════════════
   D4 FATE
════════════════════════════════════════════ */
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
  mode = mode || 'normal';
  function oneD4() {
    const a = D4_FACES[Math.floor(Math.random() * D4_FACES.length)];
    if (mode === 'normal') return a;
    const b = D4_FACES[Math.floor(Math.random() * D4_FACES.length)];
    return mode === 'adv'
      ? (a.value >= b.value ? a : b)
      : (a.value <= b.value ? a : b);
  }
  const results   = Array.from({ length: count }, oneD4);
  const sum       = results.reduce((a, f) => a + f.value, 0);
  const modeGlyph = mode === 'adv' ? ' ↑' : mode === 'dis' ? ' ↓' : '';
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
    diceLog.unshift(logText);
    if (diceLog.length > DICE_LOG_MAX) diceLog.pop();
    document.getElementById('diceLog').innerHTML = diceLog.map(e => `<div class="log-entry">${e}</div>`).join('');
  }

  if (count <= COIN_ANIM_MAX) {
    const row = document.createElement('div');
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

/* ════════════════════════════════════════════
   COIN TOSS
════════════════════════════════════════════ */
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

  const logText = count <= 2
    ? `<span class="log-die">${count}dc</span> → ${results.map(r =>
        r === 'dux'
          ? '<span class="log-dux">⚔ Dux</span>'
          : '<span class="log-elskan">✦ Elskan</span>'
      ).join(', ')}`
    : `<span class="log-die">${count}dc</span> → <span class="log-elskan">${results.filter(r=>r==='elskan').length}✦</span> / <span class="log-dux">${results.filter(r=>r==='dux').length}⚔</span>`;

  function settle(names) {
    if (names) {
      names.style.transition = 'opacity 0.35s ease';
      names.style.opacity = '1';
    }
    if (count === 1) {
      termPrint(results[0] === 'dux' ? '⚔ Dux has spoken' : '✦ Elskan has an eye on you', 'rolls');
    } else {
      const e = results.filter(r => r === 'elskan').length;
      termPrint(`coin ×${count}  ✦ ${e}  ⚔ ${count - e}`, 'rolls');
    }
    diceLog.unshift(logText);
    if (diceLog.length > DICE_LOG_MAX) diceLog.pop();
    document.getElementById('diceLog').innerHTML = diceLog.map(e => `<div class="log-entry">${e}</div>`).join('');
  }

  if (count <= COIN_ANIM_MAX) {
    const row = document.createElement('div');
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
    const elskanN = results.filter(r => r === 'elskan').length;
    const duxN    = count - elskanN;
    const tot = document.createElement('div');
    tot.className = 'result-total';
    tot.style.fontSize = '1.6rem';
    tot.innerHTML = `<span class="coin-name-elskan">${elskanN}✦</span> / <span class="coin-name-dux">${duxN}⚔</span>`;
    box.appendChild(tot);
    const detail = document.createElement('div');
    detail.className = 'result-detail';
    detail.textContent = results.map(r => r === 'dux' ? '⚔' : '✦').join(' ');
    box.appendChild(detail);
    settle(null);
  }

  resultEl.appendChild(box);
}

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

const ROLL_RE = /^\/r(?:oll)?([ad])?\s+(\d{1,4})d(\d{1,5}|c)([+-]\d{1,6})?$/i;

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
      '/r &lt;NdX&gt;        Roll N dice (X sides)',
      '/r &lt;NdX+M&gt;      Roll with modifier',
      '/ra &lt;NdX&gt;       Roll with advantage (take higher)',
      '/rd &lt;NdX&gt;       Roll with disadvantage (take lower)',
      '/r &lt;Ndc&gt;        Flip N coins (visual for ≤2)',
      '/roll /rolla /rolld  Long-form aliases',
      '── Wild Magic ────────────────────',
      '/surge           Roll on the Wild Magic Surge table',
      '/wmt             Alias for /surge',
      '── Buff Generator ────────────────',
      '/spell           Draw a random spell from 10 000 effects',

      '── Wheel Commands ────────────────',
      '/add &lt;name&gt; [w]  Add item to wheel (w = weight)',
      '/spin            Spin the wheel',
      '/wlist           List wheel items',
      '/wclear          Clear all wheel items',
      '── Party Tracker ─────────────────',
      '/padd &lt;name&gt; &lt;hp&gt;     Add member',
      '/pdmg &lt;n&gt;             Damage whole party',
      '/pdmg &lt;n&gt; &lt;name&gt;     Damage one member',
      '/pheal &lt;n&gt;            Heal whole party',
      '/pheal &lt;n&gt; &lt;name&gt;    Heal one member',
      '/ptmp &lt;n&gt; &lt;name&gt;     Set temp HP',
      '/plist               List party',
      '/pclear              Clear party',
      '/lrest               Long Rest (full heal)',
      '  Tab = autocomplete member name',
      '── Other ─────────────────────────',
      '/clear           Clear terminal',
      '/help            Show this message',
    ].forEach(l => termPrint(l, 'info'));
    return;
  }

  const m = cmd.match(ROLL_RE);
  if (m) {
    const modeChar   = m[1] ? m[1].toLowerCase() : null;
    const mode       = modeChar === 'a' ? 'adv' : modeChar === 'd' ? 'dis' : 'normal';
    const count      = Math.min(DICE_MAX, Math.max(1, parseInt(m[2])));

    if (m[3].toLowerCase() === 'c') {
      termPrint(`🪙 Flipping ${count} coin${count > 1 ? 's' : ''}…`, 'info');
      flipCoins(count);
      return;
    }

    const sides      = Math.min(1000, Math.max(2, parseInt(m[3])));
    const mod        = m[4] ? parseInt(m[4]) : 0;
    const modStr     = mod > 0 ? ` + ${mod}` : mod < 0 ? ` - ${Math.abs(mod)}` : '';
    const modeLabel  = mode === 'adv' ? ' with advantage' : mode === 'dis' ? ' with disadvantage' : '';

    termPrint(`🎲 Rolling ${count}d${sides}${mod !== 0 ? (mod > 0 ? '+'+mod : mod) : ''}${modeLabel}…`, 'info');

    if (mode === 'normal') {
      const rolls = rollDice(count, sides);
      const sum   = rolls.reduce((a, b) => a + b, 0) + mod;
      showDiceResult(sides, rolls, mod);
      if (count <= DICE_DETAIL_MAX) termPrint(`[ ${rolls.join(' | ')} ]${modStr}`, 'rolls');
      termPrint(`Total: <strong>${sum}</strong>`, 'result');
    } else {
      const a = rollDice(count, sides), b = rollDice(count, sides);
      const sa = a.reduce((x, y) => x + y, 0), sb = b.reduce((x, y) => x + y, 0);
      const [chosen, other] = mode === 'adv'
        ? (sa >= sb ? [a, b] : [b, a])
        : (sa <= sb ? [a, b] : [b, a]);
      const cs = chosen.reduce((x, y) => x + y, 0), os = other.reduce((x, y) => x + y, 0);
      showDiceResult(sides, chosen, mod, mode, other);
      if (count <= DICE_DETAIL_MAX) {
        termPrint(`Roll A: [ ${chosen.join(' | ')} ] = ${cs + mod} ✓`, 'rolls');
        termPrint(`Roll B: [ ${other.join(' | ')} ] = ${os + mod}`, 'rolls');
      } else {
        termPrint(`Roll A: ${cs + mod} ✓  Roll B: ${os + mod}`, 'rolls');
      }
      termPrint(`Total: <strong>${cs + mod}</strong>`, 'result');
    }
    return;
  }

  // /add <name> [weight]
  const addM = cmd.match(/^\/add\s+(.+?)(?:\s+(\d+(?:\.\d+)?))?$/i);
  if (addM) {
    const label  = addM[1].trim().slice(0, 24);
    const weight = addM[2] ? Math.max(0.1, Math.min(100, parseFloat(addM[2]))) : 1;
    if (wheelItems.length >= WHEEL_MAX_ITEMS) {
      termPrint(`✗ Wheel is full (${WHEEL_MAX_ITEMS} items max).`, 'error');
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

  // /surge  or  /wmt  — Wild Magic Surge
  if (/^\/(?:surge|wmt)$/i.test(cmd)) {
    const roll = Math.floor(Math.random() * 100) + 1;
    const idx  = Math.floor((roll - 1) / 2);
    const lo   = idx * 2 + 1;
    const hi   = lo + 1;
    termPrint(`🎲 Wild Magic Surge — roll: <strong>${String(roll).padStart(2,'0')}</strong> (${String(lo).padStart(2,'0')}–${String(hi).padStart(2,'0')})`, 'info');
    termPrint(escHtml(WILD_MAGIC[idx]), 'result');
    return;
  }

  if (/^\/spell$/i.test(cmd)) {
    termPrint(escHtml(randFrom(SPELLS)), 'winner');
    return;
  }

  // /lrest
  if (/^\/lrest$/i.test(cmd)) {
    if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
    partyMembers.forEach(m => { m.hp = m.maxHp; m.conditions = []; });
    saveParty(); renderParty();
    termPrint('⚔ Long Rest — the party is restored.', 'result');
    return;
  }

  // /plist
  if (/^\/plist$/i.test(cmd)) {
    if (partyMembers.length === 0) { termPrint('Party is empty.', 'info'); return; }
    termPrint('── Party ─────────────────────────', 'info');
    partyMembers.forEach(m =>
      termPrint(`  ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP${m.conditions.length ? ' ['+m.conditions.join(', ')+']' : ''}`, 'info')
    );
    return;
  }

  // /pclear
  if (/^\/pclear$/i.test(cmd)) {
    partyMembers.length = 0;
    saveParty(); renderParty();
    termPrint('✦ Party cleared.', 'result');
    return;
  }

  // /padd <name> <hp>
  const pAddM = cmd.match(/^\/padd\s+(.+?)\s+(\d+)$/i);
  if (pAddM) {
    const name  = pAddM[1].trim().slice(0, 24);
    const maxHp = Math.max(1, Math.min(9999, parseInt(pAddM[2])));
    if (partyMembers.length >= HP_MAX_MEMBERS) { termPrint(`✗ Party full (${HP_MAX_MEMBERS} max).`, 'error'); return; }
    partyMembers.push(memberDefaults({ id: Date.now(), name, hp: maxHp, maxHp }));
    saveParty(); renderParty();
    termPrint(`✦ Added ${escHtml(name)} (${maxHp} HP).`, 'result');
    return;
  }

  // /pdmg <n> [name]
  const pDmgM = cmd.match(/^\/pdmg\s+(\d+)(?:\s+(.+))?$/i);
  if (pDmgM) {
    const amt  = parseInt(pDmgM[1]);
    const name = pDmgM[2] ? pDmgM[2].trim() : null;
    if (name) {
      const m = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
      if (!m) { termPrint(`✗ Member "${escHtml(name)}" not found.`, 'error'); return; }
      let a = amt;
      if (m.tempHp > 0) { const ab = Math.min(m.tempHp, a); m.tempHp -= ab; a -= ab; }
      m.hp = Math.max(0, m.hp - a);
      saveParty(); renderParty();
      termPrint(`💢 ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'result');
    } else {
      if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
      partyMembers.forEach(m => {
        let a = amt;
        if (m.tempHp > 0) { const ab = Math.min(m.tempHp, a); m.tempHp -= ab; a -= ab; }
        m.hp = Math.max(0, m.hp - a);
      });
      saveParty(); renderParty();
      termPrint(`💢 Party took ${amt} damage.`, 'result');
      partyMembers.forEach(m => termPrint(`  ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'info'));
    }
    return;
  }

  // /pheal <n> [name]
  const pHealM = cmd.match(/^\/pheal\s+(\d+)(?:\s+(.+))?$/i);
  if (pHealM) {
    const amt  = parseInt(pHealM[1]);
    const name = pHealM[2] ? pHealM[2].trim() : null;
    if (name) {
      const m = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
      if (!m) { termPrint(`✗ Member "${escHtml(name)}" not found.`, 'error'); return; }
      m.hp = Math.min(m.maxHp, m.hp + amt);
      if (m.hp > 0) m.deathSaves = { successes: 0, failures: 0 };
      saveParty(); renderParty();
      termPrint(`💚 ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'result');
    } else {
      if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
      partyMembers.forEach(m => {
        m.hp = Math.min(m.maxHp, m.hp + amt);
        if (m.hp > 0) m.deathSaves = { successes: 0, failures: 0 };
      });
      saveParty(); renderParty();
      termPrint(`💚 Party healed ${amt} HP.`, 'result');
      partyMembers.forEach(m => termPrint(`  ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'info'));
    }
    return;
  }

  // /ptmp <n> <name>
  const pTmpM = cmd.match(/^\/ptmp\s+(\d+)\s+(.+)$/i);
  if (pTmpM) {
    const amt  = Math.max(0, Math.min(9999, parseInt(pTmpM[1])));
    const name = pTmpM[2].trim();
    const m = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
    if (!m) { termPrint(`✗ Member "${escHtml(name)}" not found.`, 'error'); return; }
    m.tempHp = amt;
    saveParty(); renderParty();
    termPrint(`✦ ${escHtml(m.name)}: +${m.tempHp} temp HP`, 'result');
    return;
  }

  termPrint(`✗ Unknown incantation: "${escHtml(cmd)}" — try /help`, 'error');
}


function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const termHistory = [];
let termHistIdx = -1;

function submitTerm() {
  const raw = termInput.value;
  if (raw.trim()) {
    termHistory.unshift(raw);
    if (termHistory.length > TERM_HISTORY_MAX) termHistory.pop();
  }
  termHistIdx = -1;
  handleTermCommand(raw);
  termInput.value = '';
  termInput.focus();
}

termInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { submitTerm(); return; }
  if (e.key === 'Tab') {
    e.preventDefault();
    const val  = termInput.value;
    const acM  = val.match(/^(\/p(?:dmg|heal|tmp)\s+\d+\s+)(\S*)$/i);
    if (acM && partyMembers.length > 0) {
      const partial = acM[2].toLowerCase();
      const match   = partyMembers.find(m => m.name.toLowerCase().startsWith(partial));
      if (match) termInput.value = acM[1] + match.name + ' ';
    }
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (termHistIdx < termHistory.length - 1) {
      termHistIdx++;
      termInput.value = termHistory[termHistIdx];
      setTimeout(() => termInput.setSelectionRange(termInput.value.length, termInput.value.length), 0);
    }
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (termHistIdx > 0) {
      termHistIdx--;
      termInput.value = termHistory[termHistIdx];
    } else {
      termHistIdx = -1;
      termInput.value = '';
    }
  }
});
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
      const label = item.label.length > WHEEL_LABEL_MAX ? item.label.slice(0, WHEEL_LABEL_MAX - 1) + '…' : item.label;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Weight badge (small arc near rim)
    if (arc > 0.3 && wheelItems.length <= WHEEL_BADGE_MAX) {
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
  ctx.arc(CX, CY, WHEEL_HUB_RADIUS, 0, Math.PI * 2);
  const hub = ctx.createRadialGradient(CX, CY, 2, CX, CY, WHEEL_HUB_RADIUS);
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
  const offset = sliceAngle * WHEEL_EDGE_GUARD + Math.random() * sliceAngle * (1 - WHEEL_EDGE_GUARD * 2);

  // The pointer sits at -π/2. We need:
  //   wheelAngle_final + cumulAngle + offset = -π/2  (mod 2π)
  const targetBase = -Math.PI / 2 - cumulAngle - offset;
  let delta = ((targetBase - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  if (delta < 0.01) delta = Math.PI * 2;
  delta += WHEEL_EXTRA_SPINS * Math.PI * 2;

  const finalAngle   = wheelAngle + delta;
  const startAngle   = wheelAngle;
  const duration     = WHEEL_SPIN_MS;
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
  if (wheelItems.length >= 40) {
    alert(`Maximum ${WHEEL_MAX_ITEMS} items on the wheel.`);
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

/* ════════════════════════════════════════════
   PARTY HP TRACKER
════════════════════════════════════════════ */
function memberDefaults(m) {
  return {
    tempHp: 0, exhaustion: 0,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    ...m
  };
}
function loadParty() {
  try { return JSON.parse(localStorage.getItem('arcane-party') || '[]').map(memberDefaults); }
  catch { return []; }
}
function saveParty() {
  localStorage.setItem('arcane-party', JSON.stringify(partyMembers));
}

let partyMembers = loadParty();
const memberAmounts = new Map();


function renderParty() {
  const list = document.getElementById('partyList');
  list.innerHTML = '';

  partyMembers.forEach((member, idx) => {
    const totalHp = member.maxHp + member.tempHp;
    const hpPct   = totalHp > 0 ? Math.max(0, member.hp   / totalHp) * 100 : 0;
    const tmpPct  = totalHp > 0 ? (member.tempHp / totalHp) * 100 : 0;
    const isCrit  = member.maxHp > 0 && member.hp / member.maxHp < 0.25;
    const ds      = member.deathSaves;
    const isDead = ds.failures >= 3;
    const isStable = ds.successes >= 3;
    const card   = document.createElement('div');
    card.className = 'member-card' + (isDead ? ' member-dead' : isStable ? ' member-stable' : '');

    const condChips = HP_CONDITIONS.map(c => {
      const active = member.conditions.includes(c);
      return `<button class="cond-chip${active ? ' active' : ''}" data-cond="${escHtml(c)}">${escHtml(c)}</button>`;
    }).join('');

    const exChip = `<button class="cond-chip exhaustion-chip${member.exhaustion > 0 ? ' active exh-lv'+member.exhaustion : ''}" data-action="exhaustion">Exhaustion${member.exhaustion > 0 ? ' '+member.exhaustion : ''}</button>`;

    const dsSaves = member.hp === 0 ? `
      <div class="death-saves">
        <div class="ds-row">
          <span class="ds-label">Death Saves</span>
          <span class="ds-group">
            ${[0,1,2].map(i => `<button class="ds-dot ds-success${ds.successes > i ? ' marked' : ''}" data-type="success" data-i="${i}">♥</button>`).join('')}
          </span>
          <span class="ds-sep">·</span>
          <span class="ds-group">
            ${[0,1,2].map(i => `<button class="ds-dot ds-fail${ds.failures > i ? ' marked' : ''}" data-type="fail" data-i="${i}">✕</button>`).join('')}
          </span>
          ${isStable ? '<span class="ds-status ds-stable">Stable</span>' : ''}
          ${isDead   ? '<span class="ds-status ds-dead">Dead</span>'     : ''}
        </div>
      </div>` : '';

    const tempTxt = member.tempHp > 0 ? `<span class="temp-badge">+${member.tempHp}</span>` : '';

    card.innerHTML = `
      <div class="member-header">
        <span class="member-name">${escHtml(member.name)}</span>
        <span class="member-hp-text"><strong>${member.hp}</strong>/${member.maxHp}</span>
        ${tempTxt}
        <button class="hp-remove-btn" title="Remove">✕</button>
      </div>
      <div class="hp-bar-track">
        <div class="hp-bar-fill${isCrit ? ' critical' : ''}" style="width:${hpPct.toFixed(1)}%"></div>
        ${member.tempHp > 0 ? `<div class="hp-bar-temp" style="width:${tmpPct.toFixed(1)}%"></div>` : ''}
      </div>
      <div class="hp-controls">
        <input type="number" class="hp-amount" value="${memberAmounts.get(member.id) || 10}" min="1" max="9999" />
        <button class="hp-dmg-btn">💢</button>
        <button class="hp-heal-btn">💚</button>
        <button class="hp-tmp-btn">⛨</button>
      </div>
      ${dsSaves}
      <div class="conditions-row">${exChip}${condChips}</div>
    `;

    const amountEl = card.querySelector('.hp-amount');

    function syncWidth() {
      amountEl.style.width = Math.max(10, amountEl.value.length) + 'ch';
    }
    syncWidth();
    amountEl.addEventListener('input', syncWidth);

    function saveAmt() { memberAmounts.set(member.id, amountEl.value); }

    card.querySelector('.hp-dmg-btn').addEventListener('click', () => {
      saveAmt();
      let amt = Math.max(1, parseInt(amountEl.value) || 1);
      if (member.tempHp > 0) {
        const absorbed = Math.min(member.tempHp, amt);
        member.tempHp -= absorbed;
        amt -= absorbed;
      }
      member.hp = Math.max(0, member.hp - amt);
      saveParty(); renderParty();
    });
    card.querySelector('.hp-heal-btn').addEventListener('click', () => {
      saveAmt();
      const amt = Math.max(1, parseInt(amountEl.value) || 1);
      member.hp = Math.min(member.maxHp, member.hp + amt);
      if (member.hp > 0) member.deathSaves = { successes: 0, failures: 0 };
      saveParty(); renderParty();
    });
    card.querySelector('.hp-tmp-btn').addEventListener('click', () => {
      saveAmt();
      member.tempHp = Math.max(0, Math.min(9999, parseInt(amountEl.value) || 0));
      saveParty(); renderParty();
    });
    card.querySelector('.hp-remove-btn').addEventListener('click', () => {
      partyMembers.splice(idx, 1);
      saveParty(); renderParty();
    });
    card.querySelectorAll('.ds-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const type = dot.dataset.type;
        const i    = parseInt(dot.dataset.i);
        const key  = type === 'success' ? 'successes' : 'failures';
        ds[key]    = ds[key] === i + 1 ? i : i + 1;
        saveParty(); renderParty();
      });
    });
    card.querySelectorAll('.cond-chip:not(.exhaustion-chip)').forEach(chip => {
      chip.addEventListener('click', () => {
        const cond = chip.dataset.cond;
        const ci   = member.conditions.indexOf(cond);
        if (ci === -1) member.conditions.push(cond);
        else member.conditions.splice(ci, 1);
        saveParty(); renderParty();
      });
    });
    card.querySelector('.exhaustion-chip').addEventListener('click', () => {
      member.exhaustion = (member.exhaustion + 1) % 7;
      saveParty(); renderParty();
    });

    list.appendChild(card);
  });

  document.getElementById('hpLongRestBtn').disabled = partyMembers.length === 0;
}

document.getElementById('hpAddBtn').addEventListener('click', () => {
  const nameEl  = document.getElementById('hpName');
  const maxEl   = document.getElementById('hpMax');
  const name    = nameEl.value.trim();
  const maxHp   = Math.max(1, Math.min(9999, parseInt(maxEl.value) || 1));
  if (!name) { nameEl.focus(); return; }
  if (partyMembers.length >= HP_MAX_MEMBERS) {
    termPrint(`✗ Party is full (${HP_MAX_MEMBERS} members max).`, 'error');
    return;
  }
  partyMembers.push(memberDefaults({ id: Date.now(), name, hp: maxHp, maxHp }));
  saveParty(); renderParty();
  nameEl.value = '';
  maxEl.value  = '';
  nameEl.focus();
});

document.getElementById('hpName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('hpAddBtn').click();
});

document.getElementById('hpLongRestBtn').addEventListener('click', () => {
  partyMembers.forEach(m => {
    m.hp = m.maxHp; m.tempHp = 0; m.conditions = [];
    m.exhaustion = Math.max(0, m.exhaustion - 2);
    m.deathSaves = { successes: 0, failures: 0 };
  });
  saveParty(); renderParty();
  termPrint('⚔ Long Rest — the party is restored.', 'result');
});

renderParty();
