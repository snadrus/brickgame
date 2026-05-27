import {
  circleVsAABB,
  reflectBySide,
  applyPaddleEnglish,
  rectsIntersect
} from '../src/physics.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    passed++;
  } catch (e) {
    console.error('  FAIL', name, '-', e.message);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function approxEq(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

console.log('physics tests:');

// 1. No collision when far away.
test('circleVsAABB: no collision when ball is far away', () => {
  const circle = { x: 1000, y: 1000, r: 8 };
  const rect = { x: 0, y: 0, w: 50, h: 20 };
  const hit = circleVsAABB(circle, rect);
  assert(hit === null, 'expected null, got ' + JSON.stringify(hit));
});

// 2. LEFT side: ball center to the left of the rect.
test('circleVsAABB: hits LEFT side', () => {
  const rect = { x: 100, y: 100, w: 60, h: 20 };
  // Ball center is to the left of rect.x, partially overlapping.
  const circle = { x: 95, y: 110, r: 10 };
  const hit = circleVsAABB(circle, rect);
  assert(hit !== null, 'expected collision, got null');
  assert(hit.side === 'left', `expected 'left', got '${hit.side}'`);
  assert(hit.overlap > 0, 'overlap should be > 0, got ' + hit.overlap);
});

// 3. RIGHT side.
test('circleVsAABB: hits RIGHT side', () => {
  const rect = { x: 100, y: 100, w: 60, h: 20 };
  const circle = { x: 165, y: 110, r: 10 };
  const hit = circleVsAABB(circle, rect);
  assert(hit !== null, 'expected collision, got null');
  assert(hit.side === 'right', `expected 'right', got '${hit.side}'`);
  assert(hit.overlap > 0, 'overlap should be > 0, got ' + hit.overlap);
});

// 4. TOP side.
test('circleVsAABB: hits TOP side', () => {
  const rect = { x: 100, y: 100, w: 60, h: 20 };
  const circle = { x: 130, y: 95, r: 10 };
  const hit = circleVsAABB(circle, rect);
  assert(hit !== null, 'expected collision, got null');
  assert(hit.side === 'top', `expected 'top', got '${hit.side}'`);
  assert(hit.overlap > 0, 'overlap should be > 0, got ' + hit.overlap);
});

// 5. BOTTOM side.
test('circleVsAABB: hits BOTTOM side', () => {
  const rect = { x: 100, y: 100, w: 60, h: 20 };
  const circle = { x: 130, y: 125, r: 10 };
  const hit = circleVsAABB(circle, rect);
  assert(hit !== null, 'expected collision, got null');
  assert(hit.side === 'bottom', `expected 'bottom', got '${hit.side}'`);
  assert(hit.overlap > 0, 'overlap should be > 0, got ' + hit.overlap);
});

// Bonus sanity check: corner (close to top-left corner) — picks the dominant
// axis. This is not strictly required but guards against regressions.
test('circleVsAABB: returns a valid side when hitting near a corner', () => {
  const rect = { x: 100, y: 100, w: 60, h: 20 };
  const circle = { x: 96, y: 96, r: 8 };
  const hit = circleVsAABB(circle, rect);
  assert(hit !== null, 'expected collision near corner');
  assert(
    hit.side === 'left' || hit.side === 'top',
    `expected 'left' or 'top' near top-left corner, got '${hit.side}'`
  );
});

// 6. reflectBySide flips the correct component with the correct sign.
test("reflectBySide: vx=5 side='left' -> vx becomes negative", () => {
  const ball = { vx: 5, vy: 3 };
  reflectBySide(ball, 'left');
  assert(ball.vx === -5, 'expected vx=-5, got ' + ball.vx);
  assert(ball.vy === 3, 'vy should be unchanged');
});

test("reflectBySide: vx=-5 side='right' -> vx becomes 5", () => {
  const ball = { vx: -5, vy: 3 };
  reflectBySide(ball, 'right');
  assert(ball.vx === 5, 'expected vx=5, got ' + ball.vx);
  assert(ball.vy === 3, 'vy should be unchanged');
});

test("reflectBySide: vy=5 side='top' -> vy becomes -5", () => {
  const ball = { vx: 2, vy: 5 };
  reflectBySide(ball, 'top');
  assert(ball.vy === -5, 'expected vy=-5, got ' + ball.vy);
  assert(ball.vx === 2, 'vx should be unchanged');
});

test("reflectBySide: vy=-5 side='bottom' -> vy becomes 5", () => {
  const ball = { vx: 2, vy: -5 };
  reflectBySide(ball, 'bottom');
  assert(ball.vy === 5, 'expected vy=5, got ' + ball.vy);
  assert(ball.vx === 2, 'vx should be unchanged');
});

test("reflectBySide: 'left' on already-negative vx stays negative", () => {
  const ball = { vx: -7, vy: 0 };
  reflectBySide(ball, 'left');
  assert(ball.vx === -7, 'expected vx to remain -7, got ' + ball.vx);
});

// 7. applyPaddleEnglish: ball directly above paddle center.
test('applyPaddleEnglish: offset 0 -> vx≈0, vy<0, speed preserved', () => {
  const ball = { x: 100, y: 50, vx: 3, vy: 4 };
  const speedBefore = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  applyPaddleEnglish(ball, 100, 40);
  const speedAfter = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  assert(approxEq(ball.vx, 0), 'expected vx≈0, got ' + ball.vx);
  assert(ball.vy < 0, 'expected vy<0, got ' + ball.vy);
  assert(
    approxEq(speedBefore, speedAfter),
    `speed mismatch: before=${speedBefore}, after=${speedAfter}`
  );
});

// 8. applyPaddleEnglish: ball at far left edge.
test('applyPaddleEnglish: offset -1 -> vx<0, vy<0, speed preserved', () => {
  const ball = { x: 60, y: 50, vx: 0, vy: 5 };
  const speedBefore = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  applyPaddleEnglish(ball, 100, 40);
  const speedAfter = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  assert(ball.vx < 0, 'expected vx<0, got ' + ball.vx);
  assert(ball.vy < 0, 'expected vy<0, got ' + ball.vy);
  assert(
    approxEq(speedBefore, speedAfter),
    `speed mismatch: before=${speedBefore}, after=${speedAfter}`
  );
});

// Bonus: clamp behavior for offsets beyond the paddle edge.
test('applyPaddleEnglish: offset beyond +1 clamps; vx>0, vy<0', () => {
  const ball = { x: 200, y: 50, vx: 0, vy: 5 };
  applyPaddleEnglish(ball, 100, 40);
  assert(ball.vx > 0, 'expected vx>0, got ' + ball.vx);
  assert(ball.vy < 0, 'expected vy<0, got ' + ball.vy);
  // Clamped offset = +1 -> angle = +60° -> sin(60°) ≈ 0.866, cos(60°) = 0.5.
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  assert(approxEq(speed, 5), 'speed should be preserved (5), got ' + speed);
});

// 9. rectsIntersect.
test('rectsIntersect: overlapping rects -> true', () => {
  const a = { x: 0, y: 0, w: 50, h: 50 };
  const b = { x: 25, y: 25, w: 50, h: 50 };
  assert(rectsIntersect(a, b) === true, 'expected true');
});

test('rectsIntersect: separated rects -> false', () => {
  const a = { x: 0, y: 0, w: 50, h: 50 };
  const b = { x: 100, y: 100, w: 50, h: 50 };
  assert(rectsIntersect(a, b) === false, 'expected false');
});

test('rectsIntersect: edge-touching rects -> false (strict)', () => {
  const a = { x: 0, y: 0, w: 50, h: 50 };
  const b = { x: 50, y: 0, w: 50, h: 50 };
  assert(rectsIntersect(a, b) === false, 'expected false for edge-touch');
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
