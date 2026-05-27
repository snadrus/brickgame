// Pure physics helpers for the brick-breaker engine.
// No DOM, no browser APIs, no imports. Safe to run in Node.

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

// circle: { x, y, r }
// rect:   { x, y, w, h }  where (x, y) is the top-left corner.
// Returns { side: 'left'|'right'|'top'|'bottom', overlap: number } or null.
export function circleVsAABB(circle, rect) {
  const rLeft = rect.x;
  const rRight = rect.x + rect.w;
  const rTop = rect.y;
  const rBottom = rect.y + rect.h;

  const cx = clamp(circle.x, rLeft, rRight);
  const cy = clamp(circle.y, rTop, rBottom);

  const dx = circle.x - cx;
  const dy = circle.y - cy;
  const distSq = dx * dx + dy * dy;
  const r = circle.r;

  if (distSq >= r * r) return null;

  const insideX = circle.x > rLeft && circle.x < rRight;
  const insideY = circle.y > rTop && circle.y < rBottom;

  let side;
  let overlap;

  if (dx === 0 && dy === 0) {
    // Circle center is inside the rect: pick the closest face.
    const distLeft = circle.x - rLeft;
    const distRight = rRight - circle.x;
    const distTop = circle.y - rTop;
    const distBottom = rBottom - circle.y;

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    if (minDist === distLeft) {
      side = 'left';
      overlap = distLeft + r;
    } else if (minDist === distRight) {
      side = 'right';
      overlap = distRight + r;
    } else if (minDist === distTop) {
      side = 'top';
      overlap = distTop + r;
    } else {
      side = 'bottom';
      overlap = distBottom + r;
    }
    return { side, overlap };
  }

  // Use the axis with the larger absolute component of (dx, dy) to pick the
  // dominant face. If one component is zero (circle center sits within the
  // rect on that axis) the other component is automatically dominant.
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (adx >= ady) {
    // Horizontal face hit (left or right).
    side = dx < 0 ? 'left' : 'right';
  } else {
    // Vertical face hit (top or bottom).
    side = dy < 0 ? 'top' : 'bottom';
  }

  const dist = Math.sqrt(distSq);
  // Penetration along the chosen axis = how far to push circle out so it just
  // clears the rect along that axis. With closest-point math this is r - dist
  // (since the contact normal aligns with the dominant axis).
  overlap = r - dist;

  // Guard against tiny negative overlaps from floating point noise.
  if (overlap < 0) overlap = 0;

  // Suppress unused-variable lints; insideX/insideY are kept for clarity.
  void insideX;
  void insideY;

  return { side, overlap };
}

// Reflect ball velocity by which side of the rect was struck. Mutates ball.
// Sign is forced so the ball moves AWAY from the rect after reflection,
// avoiding repeated re-collisions on the same brick when penetration is deep.
export function reflectBySide(ball, side) {
  switch (side) {
    case 'left':
      ball.vx = -Math.abs(ball.vx);
      break;
    case 'right':
      ball.vx = Math.abs(ball.vx);
      break;
    case 'top':
      ball.vy = -Math.abs(ball.vy);
      break;
    case 'bottom':
      ball.vy = Math.abs(ball.vy);
      break;
    default:
      break;
  }
}

// Apply paddle "english": map ball offset from paddle center to outgoing angle.
// Mutates ball in place. Preserves total speed. Always reflects upward.
export function applyPaddleEnglish(ball, paddleCenterX, paddleHalfW) {
  const halfW = paddleHalfW || 1; // avoid division by zero
  let offset = (ball.x - paddleCenterX) / halfW;
  if (offset < -1) offset = -1;
  if (offset > 1) offset = 1;

  const angle = offset * (Math.PI / 3); // up to 60° from vertical
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.abs(Math.cos(angle) * speed);
}

// Standard AABB vs AABB intersect test.
export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
