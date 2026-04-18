/* ════════════════════════════════════════════
   init.js — Stars background + panel toggles
════════════════════════════════════════════ */

(function spawnStars() {
  const container = document.querySelector('.stars');
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.2 + 0.6;
    s.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`, `top:${Math.random() * 100}%`,
      `--dur:${(Math.random() * 3 + 1.5).toFixed(1)}s`,
      `--delay:-${(Math.random() * 4).toFixed(1)}s`,
      `opacity:${(Math.random() * 0.5 + 0.1).toFixed(2)}`,
    ].join(';');
    container.appendChild(s);
  }
})();

(function initPanelToggles() {
  const KEYS = ['dice', 'terminal', 'wheel', 'party', 'tarot'];
  let state;
  try { state = JSON.parse(localStorage.getItem('arcane-panels')); } catch {}
  if (!state) state = Object.fromEntries(KEYS.map(k => [k, true]));

  function apply() {
    KEYS.forEach(key => {
      const sel = key === 'party' ? '.hp-panel' : key === 'tarot' ? '.tarot-panel' : `.${key}-panel`;
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
