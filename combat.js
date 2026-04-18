/* ════════════════════════════════════════════
   combat.js — Initiative Combat Tracker
════════════════════════════════════════════ */

let combatants = [];
let combatRound = 0;
let combatTurn  = -1; // -1 = not yet started

function syncCombatFromParty() {
  partyMembers.forEach(m => {
    if (!combatants.find(c => c.id === m.id)) {
      combatants.push({ id: m.id, name: m.name, faction: 'party', initiative: 0 });
    } else {
      combatants.find(c => c.id === m.id).name = m.name;
    }
  });
  combatants = combatants.filter(c =>
    c.faction !== 'party' || partyMembers.some(m => m.id === c.id)
  );
  renderCombat();
}

function combatActiveSorted() {
  return combatants
    .filter(c => c.initiative >= 0)
    .sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
}

function combatAllSorted() {
  return [...combatants].sort((a, b) =>
    b.initiative - a.initiative || a.name.localeCompare(b.name)
  );
}

function nextCombatTurn() {
  const active = combatActiveSorted();
  if (active.length === 0) {
    termPrint('✗ No combatants with initiative ≥ 0.', 'error');
    return;
  }
  if (combatTurn < 0) {
    combatTurn = 0;
    combatRound = 1;
  } else {
    combatTurn++;
    if (combatTurn >= active.length) {
      combatTurn = 0;
      combatRound++;
    }
  }
  renderCombat();
  const cur = active[combatTurn];
  termPrint(`⚔ Round ${combatRound} — <strong>${escHtml(cur.name)}</strong>'s turn (init ${cur.initiative})`, 'result');
}

function renderCombat() {
  const list    = document.getElementById('combatList');
  const roundEl = document.getElementById('combatRound');
  if (!list) return;

  const active   = combatActiveSorted();
  const activeId = (combatTurn >= 0 && active.length > 0)
    ? active[combatTurn % active.length]?.id
    : null;

  roundEl.textContent = combatTurn >= 0 ? `Round ${combatRound}` : '—';

  list.innerHTML = '';
  combatAllSorted().forEach(c => {
    const pm       = partyMembers.find(m => m.id === c.id) ?? null;
    const isActive  = c.id === activeId;
    const isSkipped = c.initiative < 0;

    const row = document.createElement('div');
    row.className = [
      'combat-row',
      `faction-${c.faction}`,
      isActive  ? 'combat-active'  : '',
      isSkipped ? 'combat-skipped' : '',
    ].filter(Boolean).join(' ');

    const hpHtml = pm
      ? `<span class="combat-hp">${pm.hp}<span class="combat-hp-sep">/</span>${pm.maxHp}</span>`
      : '';

    row.innerHTML = `
      <input type="number" class="combat-init-input" value="${c.initiative}" min="-1" max="99" title="Initiative (−1 = skip)" />
      <span class="combat-faction-pip"></span>
      <span class="combat-name">${escHtml(c.name)}</span>
      ${hpHtml}
      ${c.faction !== 'party' ? '<button class="combat-remove-btn" title="Remove">✕</button>' : ''}
    `;

    row.querySelector('.combat-init-input').addEventListener('change', e => {
      c.initiative = Math.max(-1, Math.min(99, parseInt(e.target.value) || 0));
      renderCombat();
    });

    if (c.faction !== 'party') {
      row.querySelector('.combat-remove-btn').addEventListener('click', () => {
        combatants = combatants.filter(x => x.id !== c.id);
        renderCombat();
      });
    }

    list.appendChild(row);
  });
}

document.getElementById('combatAddBtn').addEventListener('click', () => {
  const nameEl    = document.getElementById('combatName');
  const initEl    = document.getElementById('combatInit');
  const factionEl = document.getElementById('combatFaction');
  const name      = nameEl.value.trim().slice(0, 24);
  if (!name) { nameEl.focus(); return; }
  const initiative = Math.max(-1, Math.min(99, parseInt(initEl.value) || 0));
  combatants.push({ id: Date.now(), name, faction: factionEl.value, initiative });
  nameEl.value = '';
  initEl.value = '10';
  renderCombat();
});

document.getElementById('combatName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('combatAddBtn').click();
});

document.getElementById('combatNextBtn').addEventListener('click', nextCombatTurn);

document.getElementById('combatClearBtn').addEventListener('click', () => {
  combatants = combatants.filter(c => c.faction === 'party');
  combatants.forEach(c => { c.initiative = 0; });
  combatRound = 0;
  combatTurn  = -1;
  renderCombat();
  termPrint('⚔ Combat cleared.', 'result');
});

syncCombatFromParty();
