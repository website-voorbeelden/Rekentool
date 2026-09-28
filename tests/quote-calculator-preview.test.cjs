const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/quote-calculator-preview.js'), 'utf8'), context);
const preview = context.window.QuoteCalculatorPreview;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function piece(overrides = {}) {
  return { shape: 'rect', width: 300, height: 200, cornerRadius: 0, opening: 'none',
    outerDiameter: 300, innerDiameter: 0, innerWidth: 0, innerHeight: 0, innerRadius: 0,
    holeDiameter: 10, holes: 5, ...overrides };
}
function holes(p) {
  const svg = preview.renderPiece(p, 0);
  return Array.from(svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)" fill="black"\/>/g))
    .map(match => ({ x: Number(match[1]), y: Number(match[2]), radius: Number(match[3]) }))
    .filter(point => point.radius === p.holeDiameter / 2);
}
test('rectangles use a grid with a centered incomplete row and the requested count', () => {
  const positions = holes(piece());
  assert.equal(positions.length, 5);
  const rows = Map.groupBy(positions, point => point.y);
  assert.deepEqual(Array.from(rows.values(), row => row.length), [3, 2]);
  for (const row of rows.values()) close(row.reduce((sum, point) => sum + point.x, 0), 0);
  close(positions[1].x - positions[0].x, positions[4].x - positions[3].x);
  assert.deepEqual(holes(piece()), positions, 'positions must be deterministic');
  for (const count of [1, 2, 4, 6, 12, 50, 200]) {
    const p = piece({ width: 1000, height: 800, holes: count });
    assert.equal(holes(p).length, count);
  }
});
test('a long strip uses a row rather than a circular pattern', () => {
  const positions = holes(piece({ width: 700, height: 60, holes: 7 }));
  assert.equal(positions.length, 7);
  positions.forEach(point => close(point.y, 0));
  close(positions[0].x, -positions[6].x);
});
test('circular pieces and rings retain the original circular arrangement', () => {
  for (const innerDiameter of [0, 120]) {
    const p = piece({ shape: 'circle', innerDiameter, holes: 6 });
    const positions = holes(p);
    assert.equal(positions.length, 6);
    const radius = (p.outerDiameter + innerDiameter) / 4;
    positions.forEach((point, i) => {
      close(point.x, Math.cos(2 * Math.PI * i / 6 - Math.PI / 2) * radius);
      close(point.y, Math.sin(2 * Math.PI * i / 6 - Math.PI / 2) * radius);
    });
  }
});
test('rectangular and circular middle openings remain free of illustrative holes', () => {
  for (const opening of ['rect', 'circle']) {
    const p = piece({ width: 400, height: 300, holes: 8, opening, innerWidth: 200, innerHeight: 100, innerDiameter: 180 });
    const positions = holes(p);
    assert.equal(positions.length, 8);
    positions.forEach(point => {
      assert(Math.abs(point.x) + point.radius <= p.width / 2 + 1e-7);
      assert(Math.abs(point.y) + point.radius <= p.height / 2 + 1e-7);
      if (opening === 'circle') assert(Math.hypot(point.x, point.y) >= p.innerDiameter / 2 + point.radius - 1e-7);
      else assert(Math.hypot(Math.max(0, Math.abs(point.x) - p.innerWidth / 2),
        Math.max(0, Math.abs(point.y) - p.innerHeight / 2)) >= point.radius - 1e-7);
    });
  }
});
test('capsule holes stay inside the rounded outer contour', () => {
  const positions = holes(piece({ shape: 'manhole', width: 400, height: 200, holes: 12 }));
  assert.equal(positions.length, 12);
  positions.forEach(point => assert(Math.hypot(Math.max(0, Math.abs(point.x) - 100), point.y) <= 95 + 1e-7));
});
test('a schematic that cannot fit every hole reports how many it can show', () => {
  const p = piece({ width: 30, height: 30, holeDiameter: 20, holes: 20 });
  const visible = holes(p).length;
  assert(visible < p.holes);
  assert(preview.renderPiece(p, 0).includes(`${visible} van ${p.holes} gaten zichtbaar`));
});
