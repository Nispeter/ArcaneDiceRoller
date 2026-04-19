/* ════════════════════════════════════════════
   timer.js — Stopwatch & Countdown
════════════════════════════════════════════ */

function timerPad(n) { return String(n).padStart(2, '0'); }

// ── Stopwatch ──────────────────────────────
let swInterval = null;
let swElapsed  = 0;
let swOrigin   = 0;

function swFmt(ms) {
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return h > 0
    ? `${timerPad(h)}:${timerPad(m)}:${timerPad(s)}`
    : `${timerPad(m)}:${timerPad(s)}.${timerPad(cs)}`;
}

const swDisplay  = document.getElementById('swDisplay');
const swStartBtn = document.getElementById('swStartBtn');

swStartBtn.addEventListener('click', () => {
  if (swInterval) {
    clearInterval(swInterval);
    swInterval = null;
    swStartBtn.textContent = '▶ Resume';
    swStartBtn.classList.remove('timer-running');
    swDisplay.classList.add('sw-paused');
  } else {
    swOrigin   = Date.now() - swElapsed;
    swInterval = setInterval(() => {
      swElapsed = Date.now() - swOrigin;
      swDisplay.textContent = swFmt(swElapsed);
    }, 30);
    swStartBtn.textContent = '⏸ Pause';
    swStartBtn.classList.add('timer-running');
    swDisplay.classList.remove('sw-paused');
  }
});

document.getElementById('swResetBtn').addEventListener('click', () => {
  clearInterval(swInterval);
  swInterval = null;
  swElapsed  = 0;
  swDisplay.textContent = '00:00.00';
  swDisplay.classList.remove('sw-paused');
  swStartBtn.textContent = '▶ Start';
  swStartBtn.classList.remove('timer-running');
});

// ── Countdown ──────────────────────────────
let cdInterval = null;
let cdEndTime  = 0;
let cdPauseMs  = 0;
let cdTotalMs  = 0;

const cdDisplay  = document.getElementById('cdDisplay');
const cdStartBtn = document.getElementById('cdStartBtn');
const cdFill     = document.getElementById('cdProgressFill');

function cdFmt(ms) {
  if (ms <= 0) return '00:00';
  const totalS = Math.ceil(ms / 1000);
  const hh = Math.floor(totalS / 3600);
  const mm = Math.floor((totalS % 3600) / 60);
  const ss = totalS % 60;
  return hh > 0
    ? `${timerPad(hh)}:${timerPad(mm)}:${timerPad(ss)}`
    : `${timerPad(mm)}:${timerPad(ss)}`;
}

function cdGetSetMs() {
  const h = parseInt(document.getElementById('cdHours').value)   || 0;
  const m = parseInt(document.getElementById('cdMinutes').value) || 0;
  const s = parseInt(document.getElementById('cdSeconds').value) || 0;
  return (h * 3600 + m * 60 + s) * 1000;
}

function cdSetInputs(disabled) {
  ['cdHours', 'cdMinutes', 'cdSeconds'].forEach(id =>
    document.getElementById(id).disabled = disabled
  );
}

function cdUpdateProgress(left) {
  const pct = cdTotalMs > 0 ? Math.max(0, left / cdTotalMs) * 100 : 0;
  cdFill.style.width = pct + '%';
  cdFill.style.background = pct < 20
    ? '#ef4444'
    : pct < 50
      ? '#f97316'
      : 'var(--cyan-light)';
}

function cdDone() {
  clearInterval(cdInterval);
  cdInterval = null;
  cdPauseMs  = 0;
  cdDisplay.textContent = '00:00';
  cdFill.style.width = '0%';
  cdDisplay.classList.add('cd-done');
  const panel = document.querySelector('.timer-panel');
  panel.classList.add('cd-panel-done');
  cdStartBtn.textContent = '▶ Start';
  cdStartBtn.classList.remove('timer-running');
  cdSetInputs(false);
  termPrint('✦ Countdown complete!', 'result');
  setTimeout(() => {
    cdDisplay.classList.remove('cd-done');
    panel.classList.remove('cd-panel-done');
  }, 4000);
}

cdStartBtn.addEventListener('click', () => {
  if (cdInterval) {
    cdPauseMs = cdEndTime - Date.now();
    clearInterval(cdInterval);
    cdInterval = null;
    cdStartBtn.textContent = '▶ Resume';
    cdStartBtn.classList.remove('timer-running');
  } else {
    const ms = cdPauseMs > 0 ? cdPauseMs : cdGetSetMs();
    if (ms <= 0) return;
    if (cdPauseMs === 0) cdTotalMs = ms;
    cdPauseMs  = 0;
    cdEndTime  = Date.now() + ms;
    cdInterval = setInterval(() => {
      const left = cdEndTime - Date.now();
      if (left <= 0) { cdDone(); return; }
      cdDisplay.textContent = cdFmt(left);
      cdUpdateProgress(left);
    }, 100);
    cdDisplay.classList.remove('cd-done');
    cdStartBtn.textContent = '⏸ Pause';
    cdStartBtn.classList.add('timer-running');
    cdSetInputs(true);
    cdUpdateProgress(ms);
  }
});

document.getElementById('cdResetBtn').addEventListener('click', () => {
  clearInterval(cdInterval);
  cdInterval = null;
  cdPauseMs  = 0;
  cdDisplay.classList.remove('cd-done');
  cdStartBtn.textContent = '▶ Start';
  cdStartBtn.classList.remove('timer-running');
  cdSetInputs(false);
  const ms = cdGetSetMs();
  cdDisplay.textContent = cdFmt(ms);
  cdFill.style.width = '100%';
  cdFill.style.background = 'var(--cyan-light)';
});

['cdHours', 'cdMinutes', 'cdSeconds'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    if (!cdInterval && !cdPauseMs) {
      cdDisplay.textContent = cdFmt(cdGetSetMs());
      cdFill.style.width = '100%';
    }
  })
);

cdDisplay.textContent = cdFmt(cdGetSetMs());
