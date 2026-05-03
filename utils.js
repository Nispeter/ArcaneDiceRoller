/* ════════════════════════════════════════════
   utils.js — Shared utility functions
════════════════════════════════════════════ */

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Parse "2d6+1d4+3" → { terms:[{count,sides,sign}…], modifier }  or null on failure
function parseDiceExpr(raw) {
  const s = raw.replace(/\s+/g, '').toLowerCase();
  if (!s) return null;
  const re = /([+-]?)(\d{1,4})(d(\d{1,4}|c))?/gi;
  const terms = [];
  let modifier = 0;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index !== lastIdx) return null;
    lastIdx += m[0].length;
    const sign = m[1] === '-' ? -1 : 1;
    const num  = parseInt(m[2]);
    if (m[3]) {
      const sides = m[4] === 'c' ? 'c' : parseInt(m[4]);
      terms.push({ count: num, sides, sign });
    } else {
      modifier += sign * num;
    }
  }
  if (lastIdx !== s.length || !terms.length) return null;
  return { terms, modifier };
}

// Canonical label: "2d6+1d4+3"
function diceExprLabel({ terms, modifier }) {
  let s = '';
  terms.forEach(({ count, sides, sign }, i) => {
    if (i === 0) s += (sign < 0 ? '-' : '') + `${count}d${sides}`;
    else          s += (sign < 0 ? '-' : '+') + `${count}d${sides}`;
  });
  if (modifier > 0) s += `+${modifier}`;
  else if (modifier < 0) s += `${modifier}`;
  return s;
}
