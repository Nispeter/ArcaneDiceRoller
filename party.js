/* ════════════════════════════════════════════
   party.js — Party HP Tracker
════════════════════════════════════════════ */

function memberDefaults(m) {
  return {
    tempHp: 0, exhaustion: 0,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    ...m,
  };
}

function loadParty() {
  try { return JSON.parse(localStorage.getItem('arcane-party') || '[]').map(memberDefaults); }
  catch { return []; }
}

function saveParty() {
  localStorage.setItem('arcane-party', JSON.stringify(partyMembers));
}

function syncParty() {
  saveParty();
  renderParty();
  if (typeof syncCombatFromParty === 'function') syncCombatFromParty();
}

let partyMembers  = loadParty();
const memberAmounts = new Map();

function renderParty() {
  const list = document.getElementById('partyList');
  list.innerHTML = '';

  partyMembers.forEach((member, idx) => {
    const totalHp  = member.maxHp + member.tempHp;
    const hpPct    = totalHp > 0 ? Math.max(0, member.hp / totalHp) * 100 : 0;
    const tmpPct   = totalHp > 0 ? (member.tempHp / totalHp) * 100 : 0;
    const isCrit   = member.maxHp > 0 && member.hp / member.maxHp < 0.25;
    const ds       = member.deathSaves;
    const isDead   = ds.failures >= 3;
    const isStable = ds.successes >= 3;

    const card = document.createElement('div');
    card.className = 'member-card' + (isDead ? ' member-dead' : isStable ? ' member-stable' : '');

    const condChips = HP_CONDITIONS.map(c => {
      const active = member.conditions.includes(c);
      return `<button class="cond-chip${active ? ' active' : ''}" data-cond="${escHtml(c)}">${escHtml(c)}</button>`;
    }).join('');

    const exChip = `<button class="cond-chip exhaustion-chip${member.exhaustion > 0 ? ' active exh-lv' + member.exhaustion : ''}" data-action="exhaustion">Exhaustion${member.exhaustion > 0 ? ' ' + member.exhaustion : ''}</button>`;

    const dsSaves = member.hp === 0 ? `
      <div class="death-saves">
        <div class="ds-row">
          <span class="ds-label">Death Saves</span>
          <span class="ds-group">
            ${[0, 1, 2].map(i => `<button class="ds-dot ds-success${ds.successes > i ? ' marked' : ''}" data-type="success" data-i="${i}">♥</button>`).join('')}
          </span>
          <span class="ds-sep">·</span>
          <span class="ds-group">
            ${[0, 1, 2].map(i => `<button class="ds-dot ds-fail${ds.failures > i ? ' marked' : ''}" data-type="fail" data-i="${i}">✕</button>`).join('')}
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
    function syncWidth() { amountEl.style.width = Math.max(10, amountEl.value.length) + 'ch'; }
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
      syncParty();
    });

    card.querySelector('.hp-heal-btn').addEventListener('click', () => {
      saveAmt();
      member.hp = Math.min(member.maxHp, member.hp + (Math.max(1, parseInt(amountEl.value) || 1)));
      if (member.hp > 0) member.deathSaves = { successes: 0, failures: 0 };
      syncParty();
    });

    card.querySelector('.hp-tmp-btn').addEventListener('click', () => {
      saveAmt();
      member.tempHp = Math.max(0, Math.min(9999, parseInt(amountEl.value) || 0));
      syncParty();
    });

    card.querySelector('.hp-remove-btn').addEventListener('click', () => {
      partyMembers.splice(idx, 1);
      syncParty();
    });

    card.querySelectorAll('.ds-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const key = dot.dataset.type === 'success' ? 'successes' : 'failures';
        const i   = parseInt(dot.dataset.i);
        ds[key]   = ds[key] === i + 1 ? i : i + 1;
        syncParty();
      });
    });

    card.querySelectorAll('.cond-chip:not(.exhaustion-chip)').forEach(chip => {
      chip.addEventListener('click', () => {
        const cond = chip.dataset.cond;
        const ci   = member.conditions.indexOf(cond);
        if (ci === -1) member.conditions.push(cond);
        else member.conditions.splice(ci, 1);
        syncParty();
      });
    });

    card.querySelector('.exhaustion-chip').addEventListener('click', () => {
      member.exhaustion = (member.exhaustion + 1) % 7;
      syncParty();
    });

    list.appendChild(card);
  });

  document.getElementById('hpLongRestBtn').disabled = partyMembers.length === 0;
}

document.getElementById('hpAddBtn').addEventListener('click', () => {
  const nameEl = document.getElementById('hpName');
  const maxEl  = document.getElementById('hpMax');
  const name   = nameEl.value.trim();
  const maxHp  = Math.max(1, Math.min(9999, parseInt(maxEl.value) || 1));
  if (!name) { nameEl.focus(); return; }
  if (partyMembers.length >= HP_MAX_MEMBERS) {
    termPrint(`✗ Party is full (${HP_MAX_MEMBERS} members max).`, 'error');
    return;
  }
  partyMembers.push(memberDefaults({ id: Date.now(), name, hp: maxHp, maxHp }));
  syncParty();
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
    m.exhaustion  = Math.max(0, m.exhaustion - 2);
    m.deathSaves  = { successes: 0, failures: 0 };
  });
  syncParty();
  termPrint('⚔ Long Rest — the party is restored.', 'result');
});

renderParty();
