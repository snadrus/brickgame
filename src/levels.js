import { BRICK_COLS, BRICK_ROWS } from './constants.js';
import { Brick } from './entities/brick.js';

/**
 * 8 levels with a deliberate difficulty curve.
 *
 * Layout grammar (each row is EXACTLY BRICK_COLS chars, max BRICK_ROWS rows):
 *   '.'  empty
 *   '1'  hardness 1
 *   '2'  hardness 2
 *   '3'  hardness 3
 *   'S'  steel (indestructible)
 *
 * Each layout is hand-tuned to be left/right symmetric so the field reads as a
 * coherent shape. Difficulty escalates via brick hardness, paddle width,
 * ball speed, and how often capsules drop.
 *
 * Brick rows are placed below BRICK_GRID_TOP so several empty rows exist under
 * the ceiling — room to bounce the ball overhead.
 */
export const LEVELS = [
  {
    name: 'Welcome',
    ballSpeed: 354,
    paddleWidth: 130,
    capsuleDropMultiplier: 1.2,
    musicTrack: 'level-1',
    layout: [
      '..1111111111..',
      '..1111111111..',
      '..1111111111..',
      '..1111111111..',
    ],
  },
  {
    name: 'Stripes',
    ballSpeed: 378,
    paddleWidth: 120,
    capsuleDropMultiplier: 1.1,
    musicTrack: 'level-2',
    layout: [
      '22222222222222',
      '11111111111111',
      '22222222222222',
      '11111111111111',
      '22222222222222',
      '11111111111111',
    ],
  },
  {
    name: 'Pyramid',
    ballSpeed: 402,
    paddleWidth: 120,
    capsuleDropMultiplier: 1.0,
    musicTrack: 'level-3',
    layout: [
      '......22......',
      '.....2332.....',
      '....233332....',
      '...23333332...',
      '..2333333332..',
      '.233333333332.',
      '23333333333332',
    ],
  },
  {
    name: 'Pillars',
    ballSpeed: 426,
    paddleWidth: 110,
    capsuleDropMultiplier: 1.0,
    musicTrack: 'level-4',
    layout: [
      'S222222222222S',
      'S111111111111S',
      'S111111111111S',
      'S222222222222S',
      'S111111111111S',
      'S111111111111S',
      'S222222222222S',
    ],
  },
  {
    name: 'Channels',
    ballSpeed: 450,
    paddleWidth: 110,
    capsuleDropMultiplier: 0.9,
    musicTrack: 'level-5',
    layout: [
      '22S22S22S22S22',
      '22S22S22S22S22',
      '11S11S11S11S11',
      '11S11S11S11S11',
      '22S22S22S22S22',
      '22S22S22S22S22',
    ],
  },
  {
    name: 'Wall',
    ballSpeed: 474,
    paddleWidth: 100,
    capsuleDropMultiplier: 0.8,
    musicTrack: 'level-6',
    layout: [
      '33333333333333',
      '33333333333333',
      '33333333333333',
      '33222222222233',
      '33222222222233',
      '33333333333333',
      '33333333333333',
      '33333333333333',
    ],
  },
  {
    name: 'Diamond',
    ballSpeed: 498,
    paddleWidth: 100,
    capsuleDropMultiplier: 0.7,
    musicTrack: 'level-7',
    layout: [
      '......SS......',
      '.....S33S.....',
      '....S3333S....',
      '...S333333S...',
      '..S33333333S..',
      '...S333333S...',
      '....S3333S....',
      '.....S33S.....',
      '......SS......',
    ],
  },
  {
    name: 'Fortress',
    ballSpeed: 544,
    paddleWidth: 90,
    capsuleDropMultiplier: 0.6,
    musicTrack: 'level-8',
    layout: [
      'SS.SSSSSSSS.SS',
      'S33S333333S33S',
      'S33S322223S33S',
      'S33S322223S33S',
      'S33S322223S33S',
      'S33S322223S33S',
      'S33SS3333SS33S',
      'S333333333333S',
      'SSSS......SSSS',
    ],
  },
];

const VALID_CHARS = new Set(['.', '1', '2', '3', 'S']);

function validateLayout(level) {
  if (!level || typeof level.name !== 'string') {
    console.error('Level missing name:', level);
    throw new Error('Level missing name.');
  }
  if (!Array.isArray(level.layout)) {
    console.error(`Level "${level.name}" layout is not an array.`);
    throw new Error(`Level "${level.name}" layout is not an array.`);
  }
  if (level.layout.length === 0) {
    console.error(`Level "${level.name}" has no rows.`);
    throw new Error(`Level "${level.name}" has no rows.`);
  }
  if (level.layout.length > BRICK_ROWS) {
    console.error(
      `Level "${level.name}" has ${level.layout.length} rows; max is ${BRICK_ROWS}.`
    );
    throw new Error(`Level "${level.name}" exceeds max ${BRICK_ROWS} rows.`);
  }
  for (let r = 0; r < level.layout.length; r++) {
    const row = level.layout[r];
    if (typeof row !== 'string' || row.length !== BRICK_COLS) {
      console.error(
        `Level "${level.name}" row ${r} has length ${row && row.length}; expected ${BRICK_COLS}.`
      );
      throw new Error(
        `Level "${level.name}" row ${r} must be exactly ${BRICK_COLS} chars.`
      );
    }
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (!VALID_CHARS.has(ch)) {
        console.error(
          `Level "${level.name}" row ${r} col ${c} has invalid char "${ch}".`
        );
        throw new Error(
          `Level "${level.name}" row ${r} col ${c} has invalid char "${ch}".`
        );
      }
    }
  }
}

for (const lvl of LEVELS) validateLayout(lvl);

export function buildBricksFromLayout(level) {
  const bricks = [];
  const rows = level.layout;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < BRICK_COLS; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const hardness = ch === 'S' ? 'steel' : Number(ch);
      bricks.push(new Brick(c, r, hardness));
    }
  }
  return bricks;
}

export function countBreakable(bricks) {
  return bricks.filter((b) => b.alive && b.isBreakable).length;
}
