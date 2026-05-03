/* ════════════════════════════════════════════
   ambient.js — Procedural Ambient Soundscapes
   Multiple simultaneous · per-scene volume
════════════════════════════════════════════ */

let ambCtx    = null;
let ambMaster = null;
const ambActive = new Map(); // name → { cleanup, sub }

function ambGetCtx() {
  if (!ambCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ambCtx               = new AC();
    ambMaster            = ambCtx.createGain();
    ambMaster.gain.value = parseFloat(document.getElementById('ambVol').value);
    ambMaster.connect(ambCtx.destination);
  }
  if (ambCtx.state === 'suspended') ambCtx.resume();
  return ambCtx;
}

function ambStop(name) {
  if (name === undefined) {
    ambActive.forEach(obj => { try { obj.cleanup(); } catch(e) {} });
    ambActive.clear();
    document.querySelectorAll('.amb-btn').forEach(b => b.classList.remove('active'));
    _ambStatus();
    return;
  }
  if (ambActive.has(name)) {
    try { ambActive.get(name).cleanup(); } catch(e) {}
    ambActive.delete(name);
    document.querySelector(`.amb-btn[data-scene="${name}"]`)?.classList.remove('active');
    _ambStatus();
  }
}

function _ambStatus() {
  const listEl   = document.getElementById('ambActive');
  const statusEl = document.getElementById('ambStatus');
  listEl.innerHTML = '';
  ambActive.forEach((obj, name) => {
    const vol = obj.sub.gain.value;
    const row = document.createElement('div');
    row.className = 'amb-active-row';
    row.innerHTML = `<span class="amb-active-label">${AMB_SCENES[name].label}</span>`
      + `<input type="range" class="amb-scene-vol" data-scene="${name}" min="0" max="1" step="0.01" value="${vol}" style="--fill:${vol*100}%" />`;
    row.querySelector('input').addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      obj.sub.gain.value = val;
      e.target.style.setProperty('--fill', `${val * 100}%`);
    });
    listEl.appendChild(row);
  });
  statusEl.textContent = ambActive.size === 0
    ? 'No ambience active'
    : `${ambActive.size} scene${ambActive.size > 1 ? 's' : ''} playing`;
}

// ── Audio helpers ───────────────────────────

function _noise(ctx) {
  const n   = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function _lfo(ctx, freq, depth) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq; g.gain.value = depth;
  osc.connect(g); osc.start();
  return { osc, gain: g };
}

function _repeat(fn, lo, hi) {
  let tid;
  const run = () => { fn(); tid = setTimeout(run, lo + Math.random() * (hi - lo)); };
  tid = setTimeout(run, lo + Math.random() * (hi - lo));
  return () => clearTimeout(tid);
}

function _osc(ctx, type, freq, gain, dst) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = gain;
  o.connect(g); g.connect(dst); o.start();
  return o;
}

// Procedural reverb — exponentially decaying noise convolution
function _reverb(ctx, secs, decay, dst) {
  const sr  = ctx.sampleRate;
  const len = Math.floor(sr * secs);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf; conv.connect(dst);
  return conv; // route audio INTO conv to get reverb output at dst
}

// ── Scene builders ──────────────────────────
// Each returns { cleanup, sub }
// sub.gain is controlled by the per-scene volume slider

function sceneRain(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Main rain body — bandpass noise
  const rain = _noise(ctx);
  const bp   = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.4;
  const gR = ctx.createGain(); gR.gain.value = 0.55;
  rain.connect(bp); bp.connect(gR); gR.connect(sub); rain.start(); nodes.push(rain);

  // Low body — impact of drops on surfaces
  const low = _noise(ctx);
  const lp  = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 250;
  const gL = ctx.createGain(); gL.gain.value = 0.20;
  low.connect(lp); lp.connect(gL); gL.connect(sub); low.start(); nodes.push(low);

  // Gentle intensity swell
  const lfo = _lfo(ctx, 0.05, 0.06);
  lfo.gain.connect(gR.gain); nodes.push(lfo.osc);

  // Individual drops — pitch falls slightly as they splat
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'sine';
    const f = 1600 + Math.random() * 1400;
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 0.78, t + 0.10);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(env); env.connect(sub);
    o.start(t); o.stop(t + 0.16);
  }, 120, 550));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneStorm(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  const rain = _noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.3;
  const gR = ctx.createGain(); gR.gain.value = 1.0;
  rain.connect(bp); bp.connect(gR); gR.connect(sub); rain.start(); nodes.push(rain);

  const low = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 180;
  const gL = ctx.createGain(); gL.gain.value = 0.40;
  low.connect(lp); lp.connect(gL); gL.connect(sub); low.start(); nodes.push(low);

  // Wind — two detuned sines create howl beating
  nodes.push(_osc(ctx, 'sine', 88,  0.035, sub));
  nodes.push(_osc(ctx, 'sine', 133, 0.020, sub));

  // Gust swell LFO
  const lfo = _lfo(ctx, 0.07, 0.12);
  lfo.gain.connect(gR.gain); nodes.push(lfo.osc);

  // Thunder — low noise burst with slow rise and long rumble tail
  cancels.push(_repeat(() => {
    const n = _noise(ctx), lpT = ctx.createBiquadFilter(), env = ctx.createGain();
    lpT.type = 'lowpass'; lpT.frequency.value = 120;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(2.0, t + 0.06);   // sharp crack
    env.gain.exponentialRampToValueAtTime(0.08, t + 1.0); // body
    env.gain.exponentialRampToValueAtTime(0.001, t + 4.5); // long rumble
    n.connect(lpT); lpT.connect(env); env.connect(sub);
    n.start(t); n.stop(t + 5.0);
  }, 8000, 18000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneOcean(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Wave body — low filtered noise
  const wave = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 350;
  const gW = ctx.createGain(); gW.gain.value = 0.48;
  wave.connect(lp); lp.connect(gW); gW.connect(sub); wave.start(); nodes.push(wave);

  // Surf hiss — higher bandpass
  const surf = _noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.4;
  const gS = ctx.createGain(); gS.gain.value = 0.25;
  surf.connect(bp); bp.connect(gS); gS.connect(sub); surf.start(); nodes.push(surf);

  // Very slow wave LFO — ~12 second wave period
  const lfo  = _lfo(ctx, 0.08, 0.40);
  lfo.gain.connect(gW.gain); nodes.push(lfo.osc);

  // Surf follows slightly offset phase
  const lfo2 = _lfo(ctx, 0.065, 0.18);
  lfo2.gain.connect(gS.gain); nodes.push(lfo2.osc);

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneForest(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Wind body
  const wind = _noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 200; bp.Q.value = 0.5;
  const gW = ctx.createGain(); gW.gain.value = 0.35;
  wind.connect(bp); bp.connect(gW); gW.connect(sub); wind.start(); nodes.push(wind);

  // Leaf rustle — high-frequency shhh
  const rustle = _noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 5000;
  const gRu = ctx.createGain(); gRu.gain.value = 0.014;
  rustle.connect(hp); hp.connect(gRu); gRu.connect(sub); rustle.start(); nodes.push(rustle);

  // Breathing wind LFO
  const lfo = _lfo(ctx, 0.028, 0.14);
  lfo.gain.connect(gW.gain); nodes.push(lfo.osc);

  // Birds — two slightly detuned oscillators per chirp for organic tone
  cancels.push(_repeat(() => {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const base = 900 + Math.random() * 1400;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        const env = ctx.createGain();
        o1.type = o2.type = 'sine';
        const t = ctx.currentTime;
        // Chirp: rise then fall in pitch
        [o1, o2].forEach((o, j) => {
          const det = j === 0 ? 1 : 1.005;
          o.frequency.setValueAtTime(base * det, t);
          o.frequency.linearRampToValueAtTime(base * det * (1.10 + Math.random() * 0.18), t + 0.06);
          o.frequency.linearRampToValueAtTime(base * det * 0.95, t + 0.18);
        });
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.018, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o1.connect(env); o2.connect(env); env.connect(sub);
        o1.start(t); o2.start(t); o1.stop(t + 0.26); o2.stop(t + 0.26);
      }, i * (90 + Math.random() * 150));
    }
  }, 2000, 6000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneFire(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Crackle band
  const crackle = _noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 0.5;
  const gC = ctx.createGain(); gC.gain.value = 0.40;
  crackle.connect(bp); bp.connect(gC); gC.connect(sub); crackle.start(); nodes.push(crackle);

  // Low roar
  const roar = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 130;
  const gR = ctx.createGain(); gR.gain.value = 0.22;
  roar.connect(lp); lp.connect(gR); gR.connect(sub); roar.start(); nodes.push(roar);

  // Two non-harmonically-related LFOs sum to create irregular flicker
  const lfo1 = _lfo(ctx, 7.3, 0.065);
  const lfo2 = _lfo(ctx, 11.9, 0.042);
  lfo1.gain.connect(gC.gain); nodes.push(lfo1.osc);
  lfo2.gain.connect(gC.gain); nodes.push(lfo2.osc);

  // Occasional wood pop — short broadband burst
  cancels.push(_repeat(() => {
    const n = _noise(ctx), bpP = ctx.createBiquadFilter(), env = ctx.createGain();
    bpP.type = 'bandpass'; bpP.frequency.value = 400 + Math.random() * 1200; bpP.Q.value = 2;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0.30, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(bpP); bpP.connect(env); env.connect(sub);
    n.start(t); n.stop(t + 0.10);
  }, 300, 1400));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneSwamp(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Stagnant water — low rumble
  const water = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 200;
  const gW = ctx.createGain(); gW.gain.value = 0.22;
  water.connect(lp); lp.connect(gW); gW.connect(sub); water.start(); nodes.push(water);

  // Night insects — narrow bandpass drone
  const insect = _noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 3.5;
  const gI = ctx.createGain(); gI.gain.value = 0.05;
  insect.connect(bp); bp.connect(gI); gI.connect(sub); insect.start(); nodes.push(insect);

  // Insect pulse LFO
  const lfo = _lfo(ctx, 6.5, 0.03);
  lfo.gain.connect(gI.gain); nodes.push(lfo.osc);

  // Frog croaks — short triangle bursts at realistic pitch (400-700 Hz)
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 400 + Math.random() * 300;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.11, t + 0.02);
    env.gain.setValueAtTime(0.11, t + 0.10);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(env); env.connect(sub);
    o.start(t); o.stop(t + 0.32);
  }, 600, 2200));

  // Water bubbles — short upward pitch blip
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'sine';
    const f = 350 + Math.random() * 250;
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 1.6, t + 0.06);
    env.gain.setValueAtTime(0.04, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(env); env.connect(sub);
    o.start(t); o.stop(t + 0.12);
  }, 300, 1300));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneDungeon(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);
  // Reverb for the wet transient signals (drips, creaks)
  const rev = _reverb(ctx, 2.2, 3.0, sub);

  // Sub-bass stone rumble + mid-low air pressure
  const rumble = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 65;
  const gRu = ctx.createGain(); gRu.gain.value = 1.0;
  rumble.connect(lp); lp.connect(gRu); gRu.connect(sub); rumble.start(); nodes.push(rumble);

  const airN = _noise(ctx);
  const bpAir = ctx.createBiquadFilter();
  bpAir.type = 'bandpass'; bpAir.frequency.value = 180; bpAir.Q.value = 1.2;
  const gAir = ctx.createGain(); gAir.gain.value = 0.08;
  airN.connect(bpAir); bpAir.connect(gAir); gAir.connect(sub); airN.start(); nodes.push(airN);

  // Water drips — sine with long ring-out → reverb
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 1400 + Math.random() * 1100;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.08, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(env); env.connect(rev); // wet signal through reverb
    o.start(t); o.stop(t + 0.65);
  }, 2200, 7000));

  // Stone creak — noise through a sweeping peaking EQ (sounds like wood/stone grinding)
  cancels.push(_repeat(() => {
    const n = _noise(ctx), pk = ctx.createBiquadFilter(), env = ctx.createGain();
    pk.type = 'peaking'; pk.Q.value = 8; pk.gain.value = 24;
    const t = ctx.currentTime;
    pk.frequency.setValueAtTime(160, t);
    pk.frequency.linearRampToValueAtTime(320 + Math.random() * 180, t + 0.7);
    pk.frequency.linearRampToValueAtTime(110, t + 1.6);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 0.20);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
    n.connect(pk); pk.connect(env); env.connect(rev);
    n.start(t); n.stop(t + 2.1);
  }, 10000, 25000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneCave(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);
  // Long reverb — cavernous space
  const rev = _reverb(ctx, 3.5, 2.5, sub);

  // Deep resonant rumble (dry)
  const rumble = _noise(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 90;
  const gRu = ctx.createGain(); gRu.gain.value = 0.90;
  rumble.connect(lp); lp.connect(gRu); gRu.connect(sub); rumble.start(); nodes.push(rumble);

  // Wind through passages (dry)
  const wind = _noise(ctx);
  const bpW = ctx.createBiquadFilter();
  bpW.type = 'bandpass'; bpW.frequency.value = 360; bpW.Q.value = 1.0;
  const gW = ctx.createGain(); gW.gain.value = 0.09;
  wind.connect(bpW); bpW.connect(gW); gW.connect(sub); wind.start(); nodes.push(wind);
  const lfo = _lfo(ctx, 0.038, 0.055);
  lfo.gain.connect(gW.gain); nodes.push(lfo.osc);

  // Drips with echo — 3 decaying taps into reverb
  cancels.push(_repeat(() => {
    const bases = [1100, 1400, 1800, 2200];
    const base  = bases[Math.floor(Math.random() * bases.length)];
    const t     = ctx.currentTime;
    [0, 0.22, 0.44].forEach((delay, i) => {
      const o = ctx.createOscillator(), env = ctx.createGain();
      o.type = 'sine'; o.frequency.value = base;
      const g = 0.08 / (i + 1);
      env.gain.setValueAtTime(0, t + delay);
      env.gain.linearRampToValueAtTime(g, t + delay + 0.003);
      env.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.40);
      o.connect(env); env.connect(rev);
      o.start(t + delay); o.stop(t + delay + 0.48);
    });
  }, 1500, 4500));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneCrypt(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);
  // Very long reverb — stone vault
  const rev = _reverb(ctx, 5.0, 2.0, sub);

  // Audible beating drones — detuned pairs create slow, creeping throb
  nodes.push(_osc(ctx, 'sine', 55,    0.030, sub));
  nodes.push(_osc(ctx, 'sine', 55.4,  0.024, sub));
  nodes.push(_osc(ctx, 'sine', 110,   0.014, sub));

  // Dusty air — filtered noise with very slow breath
  const airN = _noise(ctx);
  const bpA  = ctx.createBiquadFilter();
  bpA.type = 'bandpass'; bpA.frequency.value = 260; bpA.Q.value = 2.5;
  const gA   = ctx.createGain(); gA.gain.value = 0.018;
  airN.connect(bpA); bpA.connect(gA); gA.connect(sub); airN.start(); nodes.push(airN);
  const lfo = _lfo(ctx, 0.012, 0.010);
  lfo.gain.connect(gA.gain); nodes.push(lfo.osc);

  // Rare bone creak — peaking EQ sweep on noise → long reverb
  cancels.push(_repeat(() => {
    const n = _noise(ctx), pk = ctx.createBiquadFilter(), env = ctx.createGain();
    pk.type = 'peaking'; pk.Q.value = 10; pk.gain.value = 28;
    const t = ctx.currentTime;
    pk.frequency.setValueAtTime(70, t);
    pk.frequency.linearRampToValueAtTime(130 + Math.random() * 60, t + 1.4);
    pk.frequency.linearRampToValueAtTime(60, t + 2.8);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.04, t + 0.5);
    env.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
    n.connect(pk); pk.connect(env); env.connect(rev);
    n.start(t); n.stop(t + 3.5);
  }, 16000, 35000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneTavern(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);
  // Short room reverb — wooden hall
  const rev = _reverb(ctx, 0.7, 4.5, sub);

  // Low crowd murmur
  const crowd = _noise(ctx);
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 480; bp1.Q.value = 0.7;
  const gC = ctx.createGain(); gC.gain.value = 0.25;
  crowd.connect(bp1); bp1.connect(gC); gC.connect(sub); crowd.start(); nodes.push(crowd);

  // Higher chatter
  const chatter = _noise(ctx);
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 1200; bp2.Q.value = 1.5;
  const gCh = ctx.createGain(); gCh.gain.value = 0.06;
  chatter.connect(bp2); bp2.connect(gCh); gCh.connect(sub); chatter.start(); nodes.push(chatter);

  // Crowd swell
  const lfo = _lfo(ctx, 0.05, 0.05);
  lfo.gain.connect(gC.gain); nodes.push(lfo.osc);

  // Lute — sawtooth through lowpass gives warm plucked-string harmonics
  const NOTES = [330, 370, 440, 495, 587, 659, 740];
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), filt = ctx.createBiquadFilter(), env = ctx.createGain();
    o.type = 'sawtooth';
    filt.type = 'lowpass'; filt.frequency.value = 1600; filt.Q.value = 0.6;
    o.frequency.value = NOTES[Math.floor(Math.random() * NOTES.length)];
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.038, t + 0.010);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(filt); filt.connect(env); env.connect(rev);
    o.start(t); o.stop(t + 0.65);
  }, 700, 2000));

  // Mug thud on table — low noise burst → direct
  cancels.push(_repeat(() => {
    const n = _noise(ctx), lpM = ctx.createBiquadFilter(), env = ctx.createGain();
    lpM.type = 'lowpass'; lpM.frequency.value = 200;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0.42, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    n.connect(lpM); lpM.connect(env); env.connect(sub);
    n.start(t); n.stop(t + 0.09);
  }, 5000, 14000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneMarket(ctx, dst) {
  const nodes = [], cancels = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Busy crowd body
  const crowd = _noise(ctx);
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 650; bp1.Q.value = 0.6;
  const gC = ctx.createGain(); gC.gain.value = 0.32;
  crowd.connect(bp1); bp1.connect(gC); gC.connect(sub); crowd.start(); nodes.push(crowd);

  // Vendor calls — higher pitch
  const calls = _noise(ctx);
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 1700; bp2.Q.value = 1.8;
  const gCa = ctx.createGain(); gCa.gain.value = 0.08;
  calls.connect(bp2); bp2.connect(gCa); gCa.connect(sub); calls.start(); nodes.push(calls);

  const lfo = _lfo(ctx, 0.065, 0.07);
  lfo.gain.connect(gC.gain); nodes.push(lfo.osc);

  // Bell/chime — clean sine, slow decay
  cancels.push(_repeat(() => {
    const freq = [880, 1047, 1175, 1319][Math.floor(Math.random() * 4)];
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0.07, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(env); env.connect(sub);
    o.start(t); o.stop(t + 1.8);
  }, 5000, 15000));

  // Coin clink — brief high sine
  cancels.push(_repeat(() => {
    const o = ctx.createOscillator(), env = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2800 + Math.random() * 1600;
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0.05, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    o.connect(env); env.connect(sub);
    o.start(t); o.stop(t + 0.14);
  }, 2000, 7000));

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); cancels.forEach(c => c()); sub.disconnect(); } };
}

function sceneVoid(ctx, dst) {
  const nodes = [];
  const sub = ctx.createGain(); sub.gain.value = 1; sub.connect(dst);

  // Audible beating drone pairs — slow beats create unease
  [[65, 0.036], [65.4, 0.030], [130, 0.022], [130.7, 0.016]].forEach(([freq, vol]) => {
    nodes.push(_osc(ctx, 'sine', freq, vol, sub));
  });

  // Noise bed — filtered broadband gives depth without pure tones
  const voidN = _noise(ctx);
  const bpV   = ctx.createBiquadFilter();
  bpV.type = 'bandpass'; bpV.frequency.value = 320; bpV.Q.value = 0.8;
  const gV    = ctx.createGain(); gV.gain.value = 0.028;
  voidN.connect(bpV); bpV.connect(gV); gV.connect(sub); voidN.start(); nodes.push(voidN);

  // High shimmer — two slightly detuned tones give slow celestial beating
  nodes.push(_osc(ctx, 'sine', 528,   0.009, sub));
  nodes.push(_osc(ctx, 'sine', 528.6, 0.007, sub));

  const lfo = _lfo(ctx, 0.018, 0.018);
  lfo.gain.connect(sub.gain); nodes.push(lfo.osc);

  return { sub, cleanup: () => { nodes.forEach(n => { try { n.stop(); } catch(e) {} }); sub.disconnect(); } };
}

// ── Scene registry ──────────────────────────

const AMB_SCENES = {
  rain:    { fn: sceneRain,    label: '🌧 Rain'    },
  storm:   { fn: sceneStorm,   label: '⛈ Storm'   },
  ocean:   { fn: sceneOcean,   label: '🌊 Ocean'   },
  forest:  { fn: sceneForest,  label: '🌲 Forest'  },
  fire:    { fn: sceneFire,    label: '🔥 Fire'    },
  swamp:   { fn: sceneSwamp,   label: '🌿 Swamp'   },
  dungeon: { fn: sceneDungeon, label: '🕳 Dungeon' },
  cave:    { fn: sceneCave,    label: '⛏ Cave'    },
  crypt:   { fn: sceneCrypt,   label: '💀 Crypt'   },
  tavern:  { fn: sceneTavern,  label: '🍺 Tavern'  },
  market:  { fn: sceneMarket,  label: '🛒 Market'  },
  void:    { fn: sceneVoid,    label: '✦ Void'     },
};

function ambPlay(name) {
  if (ambActive.has(name)) { ambStop(name); return; }
  const ctx = ambGetCtx();
  if (!ctx) {
    document.getElementById('ambStatus').textContent = '✗ Web Audio not supported';
    return;
  }
  document.querySelector(`.amb-btn[data-scene="${name}"]`)?.classList.add('active');
  const result = AMB_SCENES[name].fn(ctx, ambMaster);
  result.sub.gain.value = 0.75;
  ambActive.set(name, result);
  _ambStatus();
}

// ── Event listeners ─────────────────────────

document.querySelectorAll('.amb-btn').forEach(btn =>
  btn.addEventListener('click', () => ambPlay(btn.dataset.scene))
);

// Master volume slider
document.getElementById('ambVol').addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  if (ambMaster) ambMaster.gain.value = val;
  e.target.style.setProperty('--fill', `${val * 100}%`);
});

// Init master slider fill
(function () {
  const el = document.getElementById('ambVol');
  el.style.setProperty('--fill', `${parseFloat(el.value) * 100}%`);
})();

window.addEventListener('beforeunload', () => ambStop());
