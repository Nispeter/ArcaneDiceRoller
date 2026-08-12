/* ════════════════════════════════════════════
   guesswho.js — Masquerade
   Personaje secreto · descarte manual y por
   atributo · fichas · roster importable
════════════════════════════════════════════ */

const GW_STATE_KEY  = 'arcane-guesswho';
const GW_ROSTER_KEY = 'arcane-guesswho-roster';
const GW_HISTORY_MAX = 60;

// Clases base que se ofrecen como pregunta; sólo aparecen las presentes en el roster
const GW_CLASS_KEYWORDS = [
  'Artificer', 'Barbarian', 'Bard', 'Blacksmith', 'Champion', 'Cleric', 'Clerigo',
  'Druid', 'Fighter', 'Gunslinger', 'Inquisidor', 'Jeager', 'Mago', 'Merchant',
  'Monk', 'Paladin', 'Pugilist', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
];

const GW_FIELD_LABELS = {
  raza: 'Raza', subespecie: 'Sub-especie', clase: 'Clase',
  faccion: 'Facción', jugador: 'Jugador', estado: 'Estado',
};

// Glifo de la insignia según el estado; vacío = vivo y activo, sin insignia
function gwEstadoIcon(estado) {
  const e = estado.toLowerCase();
  if (e.includes('muert'))     return '☠';
  if (e.includes('desaparec')) return '?';
  if (e.includes('traidor'))   return '⚑';
  return '✦';
}

// ── Datos ────────────────────────────────────

const GW_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

function gwSlug(s) {
  return s.toLowerCase().normalize('NFD').replace(GW_DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Color de acento estable, derivado del nombre
function gwAccent(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 58%)`;
}

function gwCharDefaults(c, i) {
  const personaje = String(c.personaje ?? '').trim() || `Personaje ${i + 1}`;
  return {
    jugador: '', raza: '', subespecie: '', clase: '',
    faccion: '', estado: '', descripcion: '', lore: '', imagen: '',
    ...c,
    personaje,
    id: String(c.id ?? '').trim() || gwSlug(personaje) || `pj-${i}`,
  };
}

function gwLoadRoster() {
  try {
    const saved = JSON.parse(localStorage.getItem(GW_ROSTER_KEY));
    if (Array.isArray(saved) && saved.length) return saved.map(gwCharDefaults);
  } catch {}
  return GUESS_WHO.map(gwCharDefaults);
}

function gwSaveRoster() {
  localStorage.setItem(GW_ROSTER_KEY, JSON.stringify(gwRoster));
}

function gwLoadState() {
  try {
    const s = JSON.parse(localStorage.getItem(GW_STATE_KEY)) || {};
    return { secretId: s.secretId || null, out: new Set(Array.isArray(s.out) ? s.out : []) };
  } catch { return { secretId: null, out: new Set() }; }
}

function gwSaveState() {
  localStorage.setItem(GW_STATE_KEY, JSON.stringify({ secretId: gwSecretId, out: [...gwOut] }));
}

let gwRoster = gwLoadRoster();
const gwInitial = gwLoadState();
let gwSecretId = gwInitial.secretId;
let gwOut      = gwInitial.out;      // ids descartados
let gwHistory  = [];                 // snapshots de gwOut para deshacer
let gwRevealed = false;              // nunca se persiste: un refresh siempre oculta el secreto

// ── Refs DOM ─────────────────────────────────

const gwGridEl     = document.getElementById('gwGrid');
const gwStatusEl   = document.getElementById('gwStatus');
const gwSecretEl   = document.getElementById('gwSecret');
const gwDetailEl   = document.getElementById('gwDetail');
const gwAskFieldEl = document.getElementById('gwAskField');
const gwAskValueEl = document.getElementById('gwAskValue');

function gwTerm(msg, cls) {
  if (typeof termPrint === 'function') termPrint(msg, cls);
}

function gwById(id) {
  return gwRoster.find(c => c.id === id) || null;
}

function gwPushHistory() {
  gwHistory.push(new Set(gwOut));
  if (gwHistory.length > GW_HISTORY_MAX) gwHistory.shift();
}

// ── Render ───────────────────────────────────

function gwThumb(c, cls) {
  const initial = [...c.personaje][0] || '?';
  const img = c.imagen
    ? `<img src="${encodeURI(c.imagen)}" alt="" loading="lazy" decoding="async" onerror="this.remove()" />`
    : '';
  return `<div class="${cls}" style="--gw-accent:${gwAccent(c.personaje)}">
            <span class="gw-initial">${escHtml(initial)}</span>${img}
          </div>`;
}

function gwRenderGrid() {
  gwGridEl.innerHTML = '';

  gwRoster.forEach(c => {
    const card = document.createElement('div');
    card.className = 'gw-card' + (gwOut.has(c.id) ? ' out' : '');
    card.style.setProperty('--gw-accent', gwAccent(c.personaje));
    card.title = `${c.personaje} — clic para descartar`;
    const badge = c.estado
      ? `<span class="gw-badge" title="${escHtml(c.estado)}">${gwEstadoIcon(c.estado)}</span>`
      : '';
    card.innerHTML = `
      ${gwThumb(c, 'gw-thumb')}${badge}
      <span class="gw-card-name">${escHtml(c.personaje)}</span>
      <button class="gw-info-btn" title="Ver ficha">i</button>`;

    card.addEventListener('click', () => {
      gwPushHistory();
      if (gwOut.has(c.id)) gwOut.delete(c.id); else gwOut.add(c.id);
      gwSaveState();
      gwRender();
    });

    card.querySelector('.gw-info-btn').addEventListener('click', e => {
      e.stopPropagation();
      gwShowDetail(c.id);
    });

    gwGridEl.appendChild(card);
  });
}

function gwRenderStatus() {
  const alive = gwRoster.length - gwOut.size;
  if (!gwSecretId) {
    gwStatusEl.innerHTML = `<span class="gw-status-dim">Sin partida — dale a 🎲 Nueva partida</span>
                            <span class="gw-status-count">${gwRoster.length} personajes</span>`;
    return;
  }
  const secretOut = gwOut.has(gwSecretId);
  gwStatusEl.innerHTML = `
    <span class="gw-status-count"><strong>${alive}</strong> de ${gwRoster.length} en pie</span>
    ${alive === 1 ? '<span class="gw-status-hint">¡Queda uno! 🎯</span>' : ''}
    ${secretOut ? '<span class="gw-status-warn">⚠ descartaste tu propio personaje</span>' : ''}`;
}

function gwRenderSecret() {
  if (!gwRevealed || !gwSecretId) { gwSecretEl.style.display = 'none'; return; }
  const c = gwById(gwSecretId);
  if (!c) { gwSecretEl.style.display = 'none'; return; }
  gwSecretEl.style.display = '';
  gwSecretEl.innerHTML = `
    ${gwThumb(c, 'gw-secret-thumb')}
    <div class="gw-secret-body">
      <div class="gw-secret-label">Tu personaje</div>
      <div class="gw-secret-name" style="color:${gwAccent(c.personaje)}">${escHtml(c.personaje)}</div>
      ${gwMetaRows(c)}
    </div>`;
}

function gwMetaRows(c) {
  const rows = [
    ['Jugador', c.jugador],
    ['Raza', [c.raza, c.subespecie].filter(Boolean).join(' · ')],
    ['Clase', c.clase],
    ['Facción', c.faccion],
    ['Estado', c.estado && `${gwEstadoIcon(c.estado)} ${c.estado}`],
  ].filter(([, v]) => v);
  return rows.map(([k, v]) =>
    `<div class="gw-meta"><span class="gw-meta-k">${k}</span><span class="gw-meta-v">${escHtml(v)}</span></div>`
  ).join('');
}

function gwRender() {
  gwRenderGrid();
  gwRenderStatus();
  gwRenderSecret();
}

// ── Ficha ────────────────────────────────────

function gwShowDetail(id) {
  const c = gwById(id);
  if (!c) return;
  gwDetailEl.style.display = '';
  gwDetailEl.innerHTML = `
    <button class="gw-detail-close" title="Cerrar">✕</button>
    ${gwThumb(c, 'gw-detail-thumb')}
    <div class="gw-detail-body">
      <div class="gw-detail-name" style="color:${gwAccent(c.personaje)}">${escHtml(c.personaje)}</div>
      ${gwMetaRows(c)}
      ${c.descripcion ? `<p class="gw-detail-desc">${escHtml(c.descripcion)}</p>` : ''}
      ${c.lore ? `<p class="gw-detail-lore">${escHtml(c.lore)}</p>` : ''}
      <div class="gw-detail-actions">
        <button class="gw-action-btn gw-primary gw-guess-btn">🎯 Adivinar que es este</button>
      </div>
    </div>`;

  gwDetailEl.querySelector('.gw-detail-close').addEventListener('click', gwHideDetail);
  gwDetailEl.querySelector('.gw-guess-btn').addEventListener('click', () => gwGuess(c.id));
  if (gwDetailEl.scrollIntoView) gwDetailEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function gwHideDetail() {
  gwDetailEl.style.display = 'none';
  gwDetailEl.innerHTML = '';
}

function gwGuess(id) {
  const c = gwById(id);
  if (!c) return;
  if (!gwSecretId) {
    gwTerm('✗ Masquerade: no hay partida en curso. Usá /gw o 🎲 Nueva partida.', 'error');
    return;
  }
  const win = id === gwSecretId;
  const secret = gwById(gwSecretId);
  gwDetailEl.innerHTML = `
    <div class="gw-verdict ${win ? 'gw-win' : 'gw-lose'}">
      <div class="gw-verdict-title">${win ? '✦ ¡Correcto! ✦' : '✗ No era'}</div>
      <div class="gw-verdict-body">
        ${win
          ? `Era <strong>${escHtml(c.personaje)}</strong>.`
          : `Elegiste <strong>${escHtml(c.personaje)}</strong> — el secreto era <strong>${escHtml(secret ? secret.personaje : '???')}</strong>.`}
      </div>
      <button class="gw-action-btn gw-primary gw-verdict-again">🎲 Otra partida</button>
    </div>`;
  gwDetailEl.querySelector('.gw-verdict-again').addEventListener('click', () => { gwHideDetail(); gwNewGame(); });
  gwTerm(win
    ? `🎭 Masquerade: acertaste — era ${escHtml(c.personaje)}.`
    : `🎭 Masquerade: fallaste — era ${escHtml(secret ? secret.personaje : '???')}.`,
    win ? 'winner' : 'error');
}

// ── Partida ──────────────────────────────────

function gwNewGame() {
  if (!gwRoster.length) { gwTerm('✗ Masquerade: el roster está vacío.', 'error'); return; }
  gwSecretId = gwRoster[Math.floor(Math.random() * gwRoster.length)].id;
  gwOut.clear();
  gwHistory = [];
  gwRevealed = false;
  gwHideDetail();
  gwSaveState();
  gwRender();
  gwTerm(`🎭 Masquerade: personaje secreto asignado (${gwRoster.length} en el tablero).`, 'info');
}

function gwResetBoard() {
  gwPushHistory();
  gwOut.clear();
  gwSaveState();
  gwRender();
}

function gwUndo() {
  if (!gwHistory.length) return;
  gwOut = gwHistory.pop();
  gwSaveState();
  gwRender();
}

function gwToggleReveal() {
  if (!gwSecretId) { gwTerm('✗ Masquerade: no hay partida en curso.', 'error'); return; }
  gwRevealed = !gwRevealed;
  gwRenderSecret();
}

// ── Preguntas por atributo ───────────────────

function gwValuesFor(field) {
  if (field === 'clase') return gwClassValues();
  return [...new Set(gwRoster.map(c => c[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

// Clases base presentes + un token de rescate para quien no calce con ninguna
// (p.ej. "Arcane Trickster"), así ningún personaje queda sin pregunta posible.
function gwClassValues() {
  const values = GW_CLASS_KEYWORDS.filter(k =>
    gwRoster.some(c => c.clase.toLowerCase().includes(k.toLowerCase()))
  );
  gwRoster.forEach(c => {
    if (!c.clase) return;
    if (values.some(k => c.clase.toLowerCase().includes(k.toLowerCase()))) return;
    const token = c.clase.split(/[|/]/)[0].trim().replace(/\s+\d+$/, '');
    if (token && !values.includes(token)) values.push(token);
  });
  return values.sort((a, b) => a.localeCompare(b, 'es'));
}

function gwMatches(c, field, value) {
  if (field === 'clase') return c.clase.toLowerCase().includes(value.toLowerCase());
  return c[field] === value;
}

function gwFillValues() {
  const field = gwAskFieldEl.value;
  const values = gwValuesFor(field);
  gwAskValueEl.innerHTML = values.length
    ? values.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('')
    : '<option value="">— sin datos —</option>';
  gwAskValueEl.disabled = !values.length;
}

function gwAsk(isYes) {
  const field = gwAskFieldEl.value;
  const value = gwAskValueEl.value;
  if (!value) return;

  gwPushHistory();
  let hit = 0;
  gwRoster.forEach(c => {
    const m = gwMatches(c, field, value);
    if (isYes ? !m : m) { if (!gwOut.has(c.id)) hit++; gwOut.add(c.id); }
  });
  gwSaveState();
  gwRender();
  gwTerm(`🕵 ¿${GW_FIELD_LABELS[field]} = ${escHtml(value)}? → ${isYes ? 'Sí' : 'No'} · ${hit} descartado${hit === 1 ? '' : 's'}`, 'result');
}

// ── Importar / exportar roster ───────────────

function gwExport() {
  const blob = new Blob([JSON.stringify(gwRoster, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `masquerade-roster-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function gwImportText(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { gwTerm('✗ Masquerade: el archivo no es JSON válido.', 'error'); return; }
  if (!Array.isArray(parsed) || !parsed.length) {
    gwTerm('✗ Masquerade: el JSON debe ser un array de personajes.', 'error');
    return;
  }
  gwRoster = parsed.map(gwCharDefaults);
  gwSaveRoster();
  gwSecretId = null;
  gwOut.clear();
  gwHistory = [];
  gwRevealed = false;
  gwHideDetail();
  gwSaveState();
  gwFillValues();
  gwRender();
  gwTerm(`🎭 Masquerade: roster importado — ${gwRoster.length} personajes.`, 'info');
}

// ── Listeners ────────────────────────────────

document.getElementById('gwNewBtn').addEventListener('click', gwNewGame);
document.getElementById('gwRevealBtn').addEventListener('click', gwToggleReveal);
document.getElementById('gwUndoBtn').addEventListener('click', gwUndo);
document.getElementById('gwResetBtn').addEventListener('click', gwResetBoard);
document.getElementById('gwExportBtn').addEventListener('click', gwExport);
document.getElementById('gwImportBtn').addEventListener('click', () => document.getElementById('gwFileIn').click());

document.getElementById('gwFileIn').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => gwImportText(ev.target.result);
  reader.readAsText(file);
  e.target.value = '';
});

// La fila de preguntas arranca oculta: es una ayuda opcional, no parte del tablero
document.getElementById('gwAskToggleBtn').addEventListener('click', e => {
  const row  = document.getElementById('gwAskRow');
  const show = row.style.display === 'none';
  row.style.display = show ? '' : 'none';
  e.currentTarget.classList.toggle('active', show);
  e.currentTarget.setAttribute('aria-expanded', String(show));
});

gwAskFieldEl.addEventListener('change', gwFillValues);
document.getElementById('gwAskYes').addEventListener('click', () => gwAsk(true));
document.getElementById('gwAskNo').addEventListener('click', () => gwAsk(false));

gwFillValues();
gwRender();
