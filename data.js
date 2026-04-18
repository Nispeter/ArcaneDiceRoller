/* ════════════════════════════════════════════
   data.js — Game data constants
   Loaded before script.js
════════════════════════════════════════════ */

/* ── Wild Magic Surge Table (D&D 5e, 50 effects mapped to d100) ── */
const WILD_MAGIC = [
  "Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.",
  "For the next minute, you can see any invisible creature if you have line of sight to it.",
  "A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later.",
  "You cast fireball as a 3rd-level spell centered on yourself.",
  "You cast magic missile as a 5th-level spell.",
  "Roll a d10. Your height changes by a number of inches equal to the roll. Odd = shrink, even = grow.",
  "You cast confusion centered on yourself.",
  "For the next minute, you regain 5 hit points at the start of each of your turns.",
  "You grow a long beard made of feathers that remains until you sneeze, at which point the feathers explode from your face.",
  "You cast grease centered on yourself.",
  "Creatures have disadvantage on saving throws against the next spell you cast in the next minute that involves a saving throw.",
  "Your skin turns a vibrant shade of blue. A remove curse spell can end this effect.",
  "An eye appears on your forehead for the next minute, granting you advantage on Wisdom (Perception) checks that rely on sight.",
  "For the next minute, all your spells with a casting time of 1 action have a casting time of 1 bonus action instead.",
  "You teleport up to 60 feet to an unoccupied space of your choice that you can see.",
  "You are transported to the Astral Plane until the end of your next turn, after which you return to the space you previously occupied.",
  "Maximize the damage of the next damaging spell you cast within the next minute.",
  "Roll a d10. Your age changes by a number of years equal to the roll. Odd = younger (min 1 year old), even = older.",
  "1d6 flumphs controlled by the DM appear in unoccupied spaces within 60 feet and are frightened of you. They vanish after 1 minute.",
  "You regain 2d10 hit points.",
  "You turn into a potted plant until the start of your next turn. While a plant, you are incapacitated and have vulnerability to all damage.",
  "For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns.",
  "You cast levitate on yourself.",
  "A unicorn controlled by the DM appears in a space within 5 feet of you, then disappears 1 minute later.",
  "You can't speak for the next minute. Whenever you try, pink bubbles float out of your mouth.",
  "A spectral shield hovers near you for the next minute, granting you +2 AC and immunity to magic missile.",
  "You are immune to being intoxicated by alcohol for the next 5d6 days.",
  "Your hair falls out but grows back within 24 hours.",
  "For the next minute, any flammable object you touch that isn't worn or carried by someone else bursts into flame.",
  "You regain your lowest-level expended spell slot.",
  "For the next minute, you must shout when you speak.",
  "You cast fog cloud centered on yourself.",
  "Up to three creatures you choose within 30 feet of you take 4d10 lightning damage.",
  "You are frightened by the nearest creature until the end of your next turn.",
  "Each creature within 30 feet of you becomes invisible for the next minute. Invisibility ends on a creature when it attacks or casts a spell.",
  "You gain resistance to all damage for the next minute.",
  "A random creature within 60 feet of you becomes poisoned for 1d4 hours.",
  "You glow with bright light in a 30-foot radius for the next minute. Any creature ending its turn within 5 feet of you is blinded until the end of its next turn.",
  "You cast polymorph on yourself. If you fail the saving throw, you turn into a sheep for the spell's duration.",
  "Illusory butterflies and flower petals flutter in the air within 10 feet of you for the next minute.",
  "You can take one additional action immediately.",
  "Each creature within 30 feet of you takes 1d10 necrotic damage. You regain hit points equal to the sum of the necrotic damage dealt.",
  "You cast mirror image.",
  "You cast fly on a random creature within 60 feet of you.",
  "You become invisible until the start of your next turn or until you attack or cast a spell.",
  "If you die within the next minute, you immediately come back to life as if by the reincarnate spell.",
  "Your size increases by one size category for the next minute.",
  "You and all creatures within 30 feet of you gain vulnerability to piercing damage for the next minute.",
  "You are surrounded by faint, ethereal music for the next minute.",
  "You regain all expended sorcery points.",
];

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ── D4 Fate Faces ── */
const D4_FACES = [
  {
    name: 'Bolverk', value: 1, logChar: '▲',
    phrase: 'Bolverk circles above you',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L3 10h4l-3 9 8-4 8 4-3-9h4z"/></svg>',
    color: '#4ade80', glow: 'rgba(74,222,128,0.7)',  bg: 'rgba(34,197,94,0.12)',  border: 'rgba(74,222,128,0.55)',
  },
  {
    name: 'Navnlos', value: 2, logChar: '☠',
    phrase: 'Navnlos is judging your actions',
    icon: '&#9760;',
    color: '#d8b4fe', glow: 'rgba(216,180,254,0.7)', bg: 'rgba(168,85,247,0.12)', border: 'rgba(192,132,252,0.55)',
  },
  {
    name: 'Pandora', value: 3, logChar: '♥',
    phrase: 'Pandora likes you',
    icon: '&#9829;',
    color: '#f472b6', glow: 'rgba(244,114,182,0.7)', bg: 'rgba(236,72,153,0.12)', border: 'rgba(244,114,182,0.55)',
  },
  {
    name: 'Eevona', value: 4, logChar: '✦',
    phrase: 'Eevona is writing your story',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 4h9v16H2zM13 4h9v16h-9zM11 3h2v18h-2z"/></svg>',
    color: '#a855f7', glow: 'rgba(168,85,247,0.7)',  bg: 'rgba(109,40,217,0.18)', border: 'rgba(124,58,237,0.65)',
  },
];
