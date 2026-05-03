/* ════════════════════════════════════════════
   notes.js — Session Notes
   Autosave · Search · Markdown preview · Clickable dice · Import
════════════════════════════════════════════ */

const NOTES_KEY  = 'arcane-notes';
let notesTimer;
let isPreviewMode = false;
let searchMatches = [], searchIdx = 0;

const notesArea      = document.getElementById('notesArea');
const notesPreview   = document.getElementById('notesPreview');
const notesCountEl   = document.getElementById('notesCount');
const notesSavedEl   = document.getElementById('notesSaved');
const notesSearchBar = document.getElementById('notesSearchBar');
const notesSearchInp = document.getElementById('notesSearchInput');
const notesSearchSt  = document.getElementById('notesSearchStatus');

// ── Persistence ──────────────────────────────

function notesSave() {
  localStorage.setItem(NOTES_KEY, notesArea.value);
  notesSavedEl.classList.add('flash');
  setTimeout(() => notesSavedEl.classList.remove('flash'), 1500);
}

function updateNotesCount() {
  notesCountEl.textContent = `${notesArea.value.length.toLocaleString()} chars`;
}

notesArea.addEventListener('input', () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(notesSave, 500);
  updateNotesCount();
});

// ── List continuation on Enter ────────────────

notesArea.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
  const pos = notesArea.selectionStart;
  const val = notesArea.value;

  // Only auto-continue when cursor is at end of a line
  const nextNl = val.indexOf('\n', pos);
  if (nextNl !== -1 && nextNl !== pos) return;

  const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
  const currentLine = val.substring(lineStart, pos);

  const ulMatch = currentLine.match(/^(\s*)([-*]) (.*)/);
  const olMatch = currentLine.match(/^(\s*)(\d+)\. (.*)/);
  const match = ulMatch || olMatch;
  if (!match) return;

  e.preventDefault();
  const content = match[3];

  if (!content.trim()) {
    // Empty bullet — end the list
    notesArea.value = val.substring(0, lineStart) + '\n' + val.substring(pos);
    notesArea.selectionStart = notesArea.selectionEnd = lineStart + 1;
  } else if (ulMatch) {
    const prefix = '\n' + ulMatch[1] + ulMatch[2] + ' ';
    notesArea.value = val.substring(0, pos) + prefix + val.substring(pos);
    notesArea.selectionStart = notesArea.selectionEnd = pos + prefix.length;
  } else {
    const prefix = '\n' + olMatch[1] + (parseInt(olMatch[2]) + 1) + '. ';
    notesArea.value = val.substring(0, pos) + prefix + val.substring(pos);
    notesArea.selectionStart = notesArea.selectionEnd = pos + prefix.length;
  }

  clearTimeout(notesTimer);
  notesTimer = setTimeout(notesSave, 500);
  updateNotesCount();
});

// ── 📌 Stamp ──────────────────────────────────

document.getElementById('notesStampBtn').addEventListener('click', () => {
  if (isPreviewMode) return;
  const d = new Date();
  const stamp = `\n── ${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ──\n`;
  const pos = notesArea.selectionStart;
  notesArea.value = notesArea.value.slice(0, pos) + stamp + notesArea.value.slice(pos);
  notesArea.selectionStart = notesArea.selectionEnd = pos + stamp.length;
  notesArea.focus();
  clearTimeout(notesTimer);
  notesTimer = setTimeout(notesSave, 500);
  updateNotesCount();
});

// ── 📋 Copy ───────────────────────────────────

document.getElementById('notesCopyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(notesArea.value).then(() => {
    const btn = document.getElementById('notesCopyBtn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
  });
});

// ── 💾 Save .md ───────────────────────────────

document.getElementById('notesSaveBtn').addEventListener('click', () => {
  const blob = new Blob([notesArea.value], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `session-notes-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── 📂 Import .txt ────────────────────────────

document.getElementById('notesLoadBtn').addEventListener('click', () => {
  document.getElementById('notesFileIn').click();
});

document.getElementById('notesFileIn').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    notesArea.value = ev.target.result;
    notesSave();
    updateNotesCount();
    if (isPreviewMode) renderPreview();
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── 🔍 Search ─────────────────────────────────

document.getElementById('notesSearchBtn').addEventListener('click', () => {
  const showing = notesSearchBar.style.display !== 'none';
  notesSearchBar.style.display = showing ? 'none' : 'flex';
  document.getElementById('notesSearchBtn').classList.toggle('active', !showing);
  if (!showing) {
    notesSearchInp.focus();
    notesSearchInp.select();
  } else {
    searchMatches = [];
    notesSearchSt.textContent = '';
    if (isPreviewMode) renderPreview();
  }
});

notesSearchInp.addEventListener('input', () => {
  const q = notesSearchInp.value;
  if (isPreviewMode) {
    renderPreview(q);
    const marks = notesPreview.querySelectorAll('mark.notes-mark');
    notesSearchSt.textContent = marks.length ? `${marks.length} found` : (q ? 'not found' : '');
  } else {
    runSearch(q);
  }
});

notesSearchInp.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.shiftKey ? prevMatch() : nextMatch(); }
  if (e.key === 'Escape') { document.getElementById('notesSearchBtn').click(); }
});

document.getElementById('notesSearchPrev').addEventListener('mousedown', e => e.preventDefault());
document.getElementById('notesSearchNext').addEventListener('mousedown', e => e.preventDefault());
document.getElementById('notesSearchPrev').addEventListener('click', prevMatch);
document.getElementById('notesSearchNext').addEventListener('click', nextMatch);

function runSearch(q) {
  if (!q) { searchMatches = []; notesSearchSt.textContent = ''; return; }
  const text = notesArea.value.toLowerCase();
  const ql = q.toLowerCase();
  searchMatches = [];
  let pos = 0;
  while ((pos = text.indexOf(ql, pos)) !== -1) { searchMatches.push(pos); pos += ql.length; }
  searchIdx = 0;
  jumpToMatch(false);
}

function nextMatch() {
  if (!searchMatches.length) return;
  searchIdx = (searchIdx + 1) % searchMatches.length;
  jumpToMatch(true);
}

function prevMatch() {
  if (!searchMatches.length) return;
  searchIdx = (searchIdx - 1 + searchMatches.length) % searchMatches.length;
  jumpToMatch(true);
}

function jumpToMatch(navigate = false) {
  if (!searchMatches.length) { notesSearchSt.textContent = notesSearchInp.value ? 'not found' : ''; return; }
  if (isPreviewMode) return;
  const pos = searchMatches[searchIdx];
  const len = notesSearchInp.value.length;
  notesArea.setSelectionRange(pos, pos + len);
  if (navigate) {
    notesArea.focus();
    const lh = parseFloat(getComputedStyle(notesArea).lineHeight) || 20;
    const linesBefore = notesArea.value.substring(0, pos).split('\n').length - 1;
    notesArea.scrollTop = Math.max(0, linesBefore * lh - notesArea.clientHeight / 2 + lh / 2);
  }
  notesSearchSt.textContent = `${searchIdx + 1} / ${searchMatches.length}`;
}

// ── 👁 Preview ────────────────────────────────

document.getElementById('notesPreviewBtn').addEventListener('click', togglePreview);

function togglePreview() {
  isPreviewMode = !isPreviewMode;
  const btn = document.getElementById('notesPreviewBtn');
  if (isPreviewMode) {
    renderPreview(notesSearchBar.style.display !== 'none' ? notesSearchInp.value : '');
    notesArea.style.display  = 'none';
    notesPreview.style.display = 'block';
    btn.innerHTML = '✏️ Edit';
    btn.title = 'Back to edit';
    btn.classList.add('active');
  } else {
    notesArea.style.display  = 'block';
    notesPreview.style.display = 'none';
    btn.innerHTML = '👁 Preview';
    btn.title = 'Preview';
    btn.classList.remove('active');
    notesArea.focus();
    if (notesSearchInp.value) runSearch(notesSearchInp.value);
  }
}

function renderPreview(highlight) {
  notesPreview.innerHTML = markdownToHtml(notesArea.value, highlight || '');
}

// ── Markdown renderer ─────────────────────────

function markdownToHtml(text, highlight) {
  if (!text.trim()) return '<p class="notes-empty">Nothing written yet.</p>';

  // Escape HTML
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Extract fenced code blocks before line processing (they can span multiple lines)
  const codeBlocks = [];
  s = s.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    const i = codeBlocks.length;
    codeBlocks.push(`<pre class="notes-pre"><code>${code.trimEnd()}</code></pre>`);
    return `\x00CB${i}\x00`;
  });

  const lines = s.split('\n');
  const out   = [];
  let inUl = false, inOl = false, inPara = false, inBq = false;

  const closePara = () => { if (inPara) { out.push('</p>');          inPara = false; } };
  const closeUl   = () => { if (inUl)   { out.push('</ul>');         inUl   = false; } };
  const closeOl   = () => { if (inOl)   { out.push('</ol>');         inOl   = false; } };
  const closeBq   = () => { if (inBq)   { out.push('</blockquote>'); inBq   = false; } };
  const closeAll  = () => { closePara(); closeUl(); closeOl(); closeBq(); };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Fenced code block placeholder
    if (/^\x00CB\d+\x00$/.test(line)) {
      closeAll();
      out.push(codeBlocks[parseInt(line.replace(/\x00CB(\d+)\x00/, '$1'))]);
    }
    // Headings
    else if (/^#{1,4}\s/.test(line)) {
      closeAll();
      const lvl = Math.min(line.match(/^(#+)/)[1].length, 4);
      out.push(`<h${lvl} class="notes-h notes-h${lvl}">${applyInline(line.replace(/^#+\s+/, ''))}</h${lvl}>`);
    }
    // Unordered list
    else if (/^[-*]\s/.test(line)) {
      closePara(); closeOl(); closeBq();
      if (!inUl) { out.push('<ul class="notes-ul">'); inUl = true; }
      out.push(`<li>${applyInline(line.replace(/^[-*]\s+/, ''))}</li>`);
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      closePara(); closeUl(); closeBq();
      if (!inOl) { out.push('<ol class="notes-ol">'); inOl = true; }
      out.push(`<li>${applyInline(line.replace(/^\d+\.\s+/, ''))}</li>`);
    }
    // Blockquote
    else if (/^>\s?/.test(line)) {
      closePara(); closeUl(); closeOl();
      if (!inBq) { out.push('<blockquote class="notes-bq">'); inBq = true; } else out.push('<br>');
      out.push(applyInline(line.replace(/^>\s?/, '')));
    }
    // Horizontal rule
    else if (/^---+$/.test(line)) {
      closeAll();
      out.push('<hr class="notes-hr">');
    }
    // Blank line
    else if (line === '') {
      closeAll();
    }
    // Normal text / paragraph
    else {
      closeUl(); closeOl(); closeBq();
      if (!inPara) { out.push('<p>'); inPara = true; } else out.push('<br>');
      out.push(applyInline(line));
    }
  }
  closeAll();

  let html = out.join('');

  // Highlight search matches (skip inside HTML tags)
  if (highlight) {
    const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`(${esc})(?![^<]*>)`, 'gi'), '<mark class="notes-mark">$1</mark>');
  }

  return html;
}

function applyInline(s) {
  return s
    // Inline code first (protect its contents from further processing)
    .replace(/`([^`]+)`/g, '<code class="notes-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Links — open externally
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a class="notes-link" href="$2" target="_blank" rel="noopener">$1</a>')
    // Clickable dice (after links so 1d20 inside [text](url) isn't double-wrapped)
    .replace(/\b(\d{1,3}d(?:\d{1,4}|c)(?:[+-](?:\d{1,3}d(?:\d{1,4}|c)|\d{1,5}))*)\b/gi,
      '<a class="notes-dice" href="#" data-roll="$1">$1</a>');
}

// Dice link clicks → fire roll in terminal
notesPreview.addEventListener('click', e => {
  const link = e.target.closest('.notes-dice');
  if (!link) return;
  e.preventDefault();
  if (typeof handleTermCommand === 'function') {
    handleTermCommand(`/r ${link.dataset.roll}`);
    const termPanel = document.querySelector('.terminal-panel');
    if (termPanel?.classList.contains('panel-hidden')) {
      document.querySelector('[data-panel="terminal"]')?.click();
    }
  }
});

// ── 🗑 Clear ──────────────────────────────────

let clearPending = false, clearTimer;
document.getElementById('notesClearBtn').addEventListener('click', () => {
  const btn = document.getElementById('notesClearBtn');
  if (!clearPending) {
    clearPending = true;
    btn.textContent = 'Sure?';
    clearTimer = setTimeout(() => { clearPending = false; btn.textContent = '🗑'; }, 2000);
  } else {
    clearTimeout(clearTimer);
    notesArea.value = '';
    if (isPreviewMode) renderPreview();
    notesSave();
    updateNotesCount();
    clearPending = false;
    btn.textContent = '🗑';
  }
});

// ── Init ──────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  notesArea.value = localStorage.getItem(NOTES_KEY) || '';
  updateNotesCount();
});
