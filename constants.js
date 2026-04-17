/* ════════════════════════════════════════════
   constants.js — Numeric & config constants
   Loaded before script.js
════════════════════════════════════════════ */

/* Stars */
const STAR_COUNT        = 120;

/* Dice panel */
const DICE_MAX          = 9999;
const DICE_DETAIL_MAX   = 20;   // hide individual rolls above this count
const DICE_LOG_MAX      = 20;   // max entries in recent-rolls log

/* Coin toss */
const COIN_ANIM_MAX     = 2;    // max coins that get 3D animation
const COIN_SPINS_MIN    = 6;    // min full rotations during flip
const COIN_SPINS_RANGE  = 5;    // random extra rotations on top of min

/* Wheel */
const WHEEL_MAX_ITEMS   = 40;
const WHEEL_SPIN_MS     = 4200; // animation duration in ms
const WHEEL_EXTRA_SPINS = 6;    // full rotations added for drama
const WHEEL_EDGE_GUARD  = 0.1;  // fraction of slice edge to avoid when landing
const WHEEL_HUB_RADIUS  = 18;   // center circle radius in px
const WHEEL_LABEL_MAX   = 11;   // chars before truncation on slice
const WHEEL_BADGE_MAX   = 12;   // max items before weight badge is hidden

/* Terminal */
const TERM_HISTORY_MAX  = 50;
