/* ════════════════════════════════════════════
   oracle.js — Oracle / Tarot
════════════════════════════════════════════ */

let tarotDeck = [];
let tarotMode = 'major';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shuffleTarot() {
  const source = tarotMode === 'full' ? [...TAROT, ...TAROT_MINOR] : TAROT;
  tarotDeck = source.map(c => ({ ...c, isRev: Math.random() < 0.3 }));
  for (let i = tarotDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tarotDeck[i], tarotDeck[j]] = [tarotDeck[j], tarotDeck[i]];
  }
  document.getElementById('tarotDeckCount').textContent = `${tarotDeck.length} cards`;
}

function setTarotMode(mode) {
  tarotMode = mode;
  const wrap = document.getElementById('deckSliderWrap');
  wrap.dataset.mode = mode;
  document.getElementById('deckSlider').value = mode === 'full' ? '1' : '0';
  shuffleTarot();
  document.getElementById('tarotSpread').innerHTML  = '';
  document.getElementById('tarotReading').innerHTML = '';
  termPrint(`✦ Oracle deck: ${mode === 'full' ? '78 cards (full deck)' : '22 cards (Major Arcana)'}`, 'info');
}

function createTarotCard(entry) {
  const wrap = document.createElement('div');
  wrap.className = 'tarot-wrap';
  const card = document.createElement('div');
  card.className = 'tarot-card';
  const numLabel = entry.label ?? String(entry.num).padStart(2, '0');
  card.innerHTML = `
    <div class="tarot-face tarot-back"><span class="tarot-back-deco">✦</span></div>
    <div class="tarot-face tarot-front">
      <span class="tarot-card-num">${numLabel}</span>
      <span class="tarot-card-symbol">${entry.symbol}</span>
      <span class="tarot-card-name">${entry.name}</span>
      ${entry.isRev ? '<span class="tarot-rev-badge">↓ rev</span>' : ''}
    </div>`;
  wrap.appendChild(card);
  return { wrap, card };
}

function drawTarot(count) {
  if (tarotDeck.length < count) shuffleTarot();
  const drawn = [];
  for (let i = 0; i < count; i++) drawn.push(tarotDeck.pop());
  document.getElementById('tarotDeckCount').textContent = `${tarotDeck.length} cards`;

  const spread  = document.getElementById('tarotSpread');
  const reading = document.getElementById('tarotReading');
  spread.innerHTML  = '';
  reading.innerHTML = '';

  const LABELS = count === 3 ? ['Past', 'Present', 'Future'] : [null];
  const cards = drawn.map((entry, i) => {
    const slot = document.createElement('div');
    slot.className = 'tarot-spread-slot';
    if (LABELS[i]) {
      const lbl = document.createElement('div');
      lbl.className = 'tarot-position-label';
      lbl.textContent = LABELS[i];
      slot.appendChild(lbl);
    }
    const { wrap, card } = createTarotCard(entry);
    slot.appendChild(wrap);
    spread.appendChild(slot);
    return { card, entry };
  });

  cards.forEach(({ card }, i) => {
    const spins = (COIN_SPINS_MIN + Math.floor(Math.random() * COIN_SPINS_RANGE)) * 360;
    setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.transform = `rotateY(${spins + 180}deg)`;
      }));
    }, i * 420);
  });

  setTimeout(() => {
    drawn.forEach((entry, i) => {
      const meaning = entry.isRev ? entry.reversed : entry.upright;
      const div = document.createElement('div');
      div.className = 'tarot-reading-entry';
      div.innerHTML = `
        ${LABELS[i] ? `<div class="tarot-reading-pos">${LABELS[i]}</div>` : ''}
        <div class="tarot-reading-name">
          ${entry.symbol} ${entry.name}
          ${entry.isRev ? '<span class="tarot-rev-badge">↓ Reversed</span>' : ''}
        </div>
        <div class="tarot-reading-meaning">${meaning}</div>`;
      reading.appendChild(div);
    });
    termPrint(`✦ Oracle: ${drawn.map(e => `${e.name}${e.isRev ? ' (rev)' : ''}`).join(' · ')}`, 'result');
  }, (drawn.length - 1) * 420 + 1400);
}

document.querySelectorAll('.tarot-draw-btn').forEach(btn =>
  btn.addEventListener('click', () => drawTarot(parseInt(btn.dataset.draw)))
);

document.getElementById('tarotShuffleBtn').addEventListener('click', () => {
  shuffleTarot();
  document.getElementById('tarotSpread').innerHTML  = '';
  document.getElementById('tarotReading').innerHTML = '';
});

document.getElementById('deckSlider').addEventListener('input', e => {
  setTarotMode(e.target.value === '1' ? 'full' : 'major');
});

shuffleTarot();
