/* ════════════════════════════════════════════
   init.js — Stars background + panel toggles
════════════════════════════════════════════ */

const THEMES = ['arcane', 'fey', 'ice', 'infernal', 'bloom'];

function setTheme(theme) {
  document.body.className = document.body.className.replace(/\btheme-\S+/g, '').trim();
  if (theme !== 'arcane') document.body.classList.add(`theme-${theme}`);
  const wrap = document.getElementById('themeSliderWrap');
  if (wrap) {
    wrap.dataset.theme = theme;
    document.getElementById('themeSlider').value = THEMES.indexOf(theme);
  }
  localStorage.setItem('arcane-theme', theme);
  if (typeof drawWheel === 'function') drawWheel();
}

(function initTheme() {
  const saved = localStorage.getItem('arcane-theme') || 'arcane';
  setTheme(saved);
  document.getElementById('themeSlider').addEventListener('input', e => {
    setTheme(THEMES[parseInt(e.target.value)]);
  });
})();

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
  const KEYS = ['dice', 'terminal', 'wheel', 'party', 'combat', 'tarot', 'timer', 'prob', 'notes'];
  let state;
  try { state = JSON.parse(localStorage.getItem('arcane-panels')); } catch {}
  if (!state) state = Object.fromEntries(KEYS.map(k => [k, true]));

  function apply() {
    KEYS.forEach(key => {
      const sel = key === 'party' ? '.hp-panel' : key === 'tarot' ? '.tarot-panel' : key === 'combat' ? '.combat-panel' : `.${key}-panel`;
      const visible = state[key] === undefined ? true : !!state[key];
      document.querySelector(sel).classList.toggle('panel-hidden', !visible);
      document.querySelector(`[data-panel="${key}"]`).classList.toggle('active', visible);
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

(function initDragReorder() {
  const grid = document.querySelector('main.grid');
  let dragSrc = null;

  function panelCls(p) {
    return [...p.classList].find(c => c !== 'panel' && c.endsWith('-panel'));
  }

  function saveOrder() {
    const order = [...grid.querySelectorAll('.panel')].map(panelCls).filter(Boolean);
    localStorage.setItem('arcane-panel-order', JSON.stringify(order));
  }

  function loadOrder() {
    try {
      const order = JSON.parse(localStorage.getItem('arcane-panel-order'));
      if (!Array.isArray(order)) return;
      order.forEach(cls => {
        const el = grid.querySelector(`.${cls}`);
        if (el) grid.appendChild(el);
      });
      // Append any panels added since the order was saved
      grid.querySelectorAll('.panel').forEach(p => {
        if (!order.includes(panelCls(p))) grid.appendChild(p);
      });
    } catch {}
  }

  function clearIndicators() {
    grid.querySelectorAll('.drag-before, .drag-after').forEach(p => {
      p.classList.remove('drag-before', 'drag-after');
    });
  }

  grid.querySelectorAll('.panel').forEach(panel => {
    const title = panel.querySelector('.panel-title');
    if (!title) return;

    title.addEventListener('mousedown', () => panel.setAttribute('draggable', 'true'));

    panel.addEventListener('dragstart', e => {
      if (!panel.hasAttribute('draggable')) { e.preventDefault(); return; }
      dragSrc = panel;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => panel.classList.add('panel-dragging'));
    });

    panel.addEventListener('dragend', () => {
      panel.classList.remove('panel-dragging');
      panel.removeAttribute('draggable');
      clearIndicators();
      dragSrc = null;
      saveOrder();
    });

    panel.addEventListener('dragover', e => {
      if (!dragSrc || panel === dragSrc) return;
      e.preventDefault();
      clearIndicators();
      const r = panel.getBoundingClientRect();
      panel.classList.add(e.clientX < r.left + r.width / 2 ? 'drag-before' : 'drag-after');
    });

    panel.addEventListener('dragleave', e => {
      if (!panel.contains(e.relatedTarget)) clearIndicators();
    });

    panel.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || panel === dragSrc) return;
      const r   = panel.getBoundingClientRect();
      const before = e.clientX < r.left + r.width / 2;
      grid.insertBefore(dragSrc, before ? panel : panel.nextSibling);
      clearIndicators();
    });
  });

  loadOrder();
})();
