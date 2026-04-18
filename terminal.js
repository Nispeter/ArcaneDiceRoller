/* ════════════════════════════════════════════
   terminal.js — Arcane Terminal
   Loaded last: calls functions from all other modules
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

const termHistory = [];
let termHistIdx = -1;

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
      '/r &lt;NdX&gt;        #Roll N dice (X sides)',
      '/r &lt;NdX+M&gt;      #Roll with modifier',
      '/ra &lt;NdX&gt;       #Roll with advantage (take higher)',
      '/rd &lt;NdX&gt;       #Roll with disadvantage (take lower)',
      '/r &lt;Ndc&gt;        #Flip N coins (visual for ≤2)',
      '/roll /rolla /rolld  #Long-form aliases',
      '── Wild Magic ────────────────────',
      '/surge           #Roll on the Wild Magic Surge table',
      '/wmt             #Alias for /surge',
      '── Buff Generator ────────────────',
      '/spell           #Draw a random spell from 10 000 effects',
      '── Oracle ────────────────────────',
      '/oracle 1        #Draw 1 tarot card',
      '/oracle 3        #Draw 3 cards (Past · Present · Future)',
      '/oracle major    #Switch to 22-card Major Arcana deck',
      '/oracle full     #Switch to full 78-card deck',
      '── Wheel Commands ────────────────',
      '/add &lt;name&gt; [w]  #Add item to wheel (w = weight)',
      '/spin            #Spin the wheel',
      '/wlist           #List wheel items',
      '/wclear          #Clear all wheel items',
      '── Party Tracker ─────────────────',
      '/padd &lt;name&gt; &lt;hp&gt;     #Add member',
      '/pdmg &lt;n&gt;             #Damage whole party',
      '/pdmg &lt;n&gt; &lt;name&gt;     #Damage one member',
      '/pheal &lt;n&gt;            #Heal whole party',
      '/pheal &lt;n&gt; &lt;name&gt;    #Heal one member',
      '/ptmp &lt;n&gt; &lt;name&gt;     #Set temp HP',
      '/plist               #List party',
      '/pclear              #Clear party',
      '/lrest               #Long Rest (full heal)',
      '  Tab = autocomplete member name',
      '── Other ─────────────────────────',
      '/clear           #Clear terminal',
      '/help            #Show this message',
    ].forEach(l => termPrint(l, 'info'));
    return;
  }

  // /r /roll — dice roll
  const rollM = cmd.match(ROLL_RE);
  if (rollM) {
    const modeChar  = rollM[1] ? rollM[1].toLowerCase() : null;
    const mode      = modeChar === 'a' ? 'adv' : modeChar === 'd' ? 'dis' : 'normal';
    const count     = Math.min(DICE_MAX, Math.max(1, parseInt(rollM[2])));

    if (rollM[3].toLowerCase() === 'c') {
      termPrint(`🪙 Flipping ${count} coin${count > 1 ? 's' : ''}…`, 'info');
      flipCoins(count);
      return;
    }

    const sides     = Math.min(1000, Math.max(2, parseInt(rollM[3])));
    const mod       = rollM[4] ? parseInt(rollM[4]) : 0;
    const modStr    = mod > 0 ? ` + ${mod}` : mod < 0 ? ` - ${Math.abs(mod)}` : '';
    const modeLabel = mode === 'adv' ? ' with advantage' : mode === 'dis' ? ' with disadvantage' : '';
    termPrint(`🎲 Rolling ${count}d${sides}${mod !== 0 ? (mod > 0 ? '+' + mod : mod) : ''}${modeLabel}…`, 'info');

    if (mode === 'normal') {
      const rolls = rollDice(count, sides);
      showDiceResult(sides, rolls, mod);
      if (count <= DICE_DETAIL_MAX) termPrint(`[ ${rolls.join(' | ')} ]${modStr}`, 'rolls');
      termPrint(`Total: <strong>${rolls.reduce((a, b) => a + b, 0) + mod}</strong>`, 'result');
    } else {
      const a = rollDice(count, sides), b = rollDice(count, sides);
      const sa = a.reduce((x, y) => x + y, 0), sb = b.reduce((x, y) => x + y, 0);
      const [chosen, other] = mode === 'adv' ? (sa >= sb ? [a, b] : [b, a]) : (sa <= sb ? [a, b] : [b, a]);
      const cs = chosen.reduce((x, y) => x + y, 0);
      showDiceResult(sides, chosen, mod, mode, other);
      if (count <= DICE_DETAIL_MAX) {
        termPrint(`Roll A: [ ${chosen.join(' | ')} ] = ${cs + mod} ✓`, 'rolls');
        termPrint(`Roll B: [ ${other.join(' | ')} ] = ${other.reduce((x, y) => x + y, 0) + mod}`, 'rolls');
      } else {
        termPrint(`Roll A: ${cs + mod} ✓  Roll B: ${other.reduce((x, y) => x + y, 0) + mod}`, 'rolls');
      }
      termPrint(`Total: <strong>${cs + mod}</strong>`, 'result');
    }
    return;
  }

  // /surge /wmt — Wild Magic Surge
  if (/^\/(?:surge|wmt)$/i.test(cmd)) {
    const roll = Math.floor(Math.random() * 100) + 1;
    const idx  = Math.floor((roll - 1) / 2);
    const lo   = idx * 2 + 1;
    termPrint(`🎲 Wild Magic Surge — roll: <strong>${String(roll).padStart(2, '0')}</strong> (${String(lo).padStart(2, '0')}–${String(lo + 1).padStart(2, '0')})`, 'info');
    termPrint(escHtml(WILD_MAGIC[idx]), 'result');
    return;
  }

  // /spell
  if (/^\/spell$/i.test(cmd)) {
    termPrint(escHtml(randFrom(SPELLS)), 'winner');
    return;
  }

  // /oracle
  const oracleN = cmd.match(/^\/oracle\s+([13])$/i);
  if (oracleN) { drawTarot(parseInt(oracleN[1])); return; }
  const oracleM = cmd.match(/^\/oracle\s+(full|major)$/i);
  if (oracleM) { setTarotMode(oracleM[1].toLowerCase() === 'full' ? 'full' : 'major'); return; }

  // /add — wheel item
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
    if (wheelItems.length < 2) { termPrint('✗ Need at least 2 items. Use /add &lt;name&gt; [weight].', 'error'); return; }
    if (spinning)               { termPrint('✗ The wheel is already spinning!', 'error'); return; }
    termPrint('🎡 Spinning the wheel…', 'info');
    spinWheel(winner => termPrint(`✦ The wheel chose: <strong>${escHtml(winner)}</strong>`, 'winner'));
    return;
  }

  // /wlist
  if (/^\/wlist$/i.test(cmd)) {
    if (wheelItems.length === 0) { termPrint('Wheel is empty. Use /add &lt;name&gt; [weight].', 'info'); return; }
    termPrint('── Wheel Items ───────────────────', 'info');
    wheelItems.forEach((item, i) => termPrint(`  ${i + 1}. ${escHtml(item.label)} (weight ${item.weight})`, 'info'));
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

  // /lrest
  if (/^\/lrest$/i.test(cmd)) {
    if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
    partyMembers.forEach(m => { m.hp = m.maxHp; m.conditions = []; });
    syncParty();
    termPrint('⚔ Long Rest — the party is restored.', 'result');
    return;
  }

  // /plist
  if (/^\/plist$/i.test(cmd)) {
    if (partyMembers.length === 0) { termPrint('Party is empty.', 'info'); return; }
    termPrint('── Party ─────────────────────────', 'info');
    partyMembers.forEach(m =>
      termPrint(`  ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP${m.conditions.length ? ' [' + m.conditions.join(', ') + ']' : ''}`, 'info')
    );
    return;
  }

  // /pclear
  if (/^\/pclear$/i.test(cmd)) {
    partyMembers.length = 0;
    syncParty();
    termPrint('✦ Party cleared.', 'result');
    return;
  }

  // /padd <name> <hp>
  const pAddM = cmd.match(/^\/padd\s+(.+?)\s+(\d+)$/i);
  if (pAddM) {
    const name  = pAddM[1].trim().slice(0, 24);
    const maxHp = Math.max(1, Math.min(9999, parseInt(pAddM[2])));
    if (partyMembers.length >= HP_MAX_MEMBERS) { termPrint(`✗ Party is full (${HP_MAX_MEMBERS} max).`, 'error'); return; }
    partyMembers.push(memberDefaults({ id: Date.now(), name, hp: maxHp, maxHp }));
    syncParty();
    termPrint(`✦ Added ${escHtml(name)} (${maxHp} HP).`, 'result');
    return;
  }

  // /pdmg <n> [name]
  const pDmgM = cmd.match(/^\/pdmg\s+(\d+)(?:\s+(.+))?$/i);
  if (pDmgM) {
    const amt  = parseInt(pDmgM[1]);
    const name = pDmgM[2] ? pDmgM[2].trim() : null;
    function applyDmg(m) {
      let a = amt;
      if (m.tempHp > 0) { const ab = Math.min(m.tempHp, a); m.tempHp -= ab; a -= ab; }
      m.hp = Math.max(0, m.hp - a);
    }
    if (name) {
      const m = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
      if (!m) { termPrint(`✗ "${escHtml(name)}" not found.`, 'error'); return; }
      applyDmg(m);
      syncParty();
      termPrint(`💢 ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'result');
    } else {
      if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
      partyMembers.forEach(applyDmg);
      syncParty();
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
    function applyHeal(m) {
      m.hp = Math.min(m.maxHp, m.hp + amt);
      if (m.hp > 0) m.deathSaves = { successes: 0, failures: 0 };
    }
    if (name) {
      const m = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
      if (!m) { termPrint(`✗ "${escHtml(name)}" not found.`, 'error'); return; }
      applyHeal(m);
      syncParty();
      termPrint(`💚 ${escHtml(m.name)}: ${m.hp}/${m.maxHp} HP`, 'result');
    } else {
      if (partyMembers.length === 0) { termPrint('✗ No party members.', 'error'); return; }
      partyMembers.forEach(applyHeal);
      syncParty();
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
    const m    = partyMembers.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
    if (!m) { termPrint(`✗ "${escHtml(name)}" not found.`, 'error'); return; }
    m.tempHp = amt;
    syncParty();
    termPrint(`✦ ${escHtml(m.name)}: +${m.tempHp} temp HP`, 'result');
    return;
  }

  termPrint(`✗ Unknown incantation: "${escHtml(cmd)}" — try /help`, 'error');
}

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
    const acM = termInput.value.match(/^(\/p(?:dmg|heal|tmp)\s+\d+\s+)(\S*)$/i);
    if (acM && partyMembers.length > 0) {
      const match = partyMembers.find(m => m.name.toLowerCase().startsWith(acM[2].toLowerCase()));
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
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (termHistIdx > 0) { termHistIdx--; termInput.value = termHistory[termHistIdx]; }
    else { termHistIdx = -1; termInput.value = ''; }
  }
});

document.getElementById('termSubmit').addEventListener('click', submitTerm);

document.querySelectorAll('.term-hints span').forEach(hint => {
  hint.addEventListener('click', () => {
    termInput.value = hint.dataset.cmd;
    termInput.focus();
  });
});
