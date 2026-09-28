const { test } = require('node:test');
const assert = require('node:assert/strict');
global.window = global;
require('../assets/gasket-configurator-nesting.js');
require('../assets/quote-calculator-core.js');
require('../assets/quote-calculator-preview.js');
const C = QuoteCalculatorCore;
const N = GasketConfiguratorNesting;
test('mixed operations and supplier sheets remain independent and survive URLs', () => {
  const s = C.parseReadableUrl('?material_mode=full_plate&piece1_process=saw&piece1_quantity=2&piece1_width=200&piece1_height=100&piece2_process=mill&piece2_quantity=3&piece2_shape=circle&piece2_diameter=100&supplier1_sheet_w=1000&supplier1_sheet_h=1000&supplier1_material_price=40&supplier1_saw_price=2&supplier1_mill_price=7&supplier2_sheet_w=2000&supplier2_sheet_h=1000&supplier2_material_price=40&supplier2_saw_price=2&supplier2_mill_price=7');
  s.pieces[1].outerDiameter = 100;
  s.pieces.forEach(p => { p.thickness = 10; });
  C.ensureRates(s);
  s.scenarios.forEach(sc => { Object.values(sc.rates).forEach(rate => { rate.price = 40; }); });
  const restored = C.decodeState(C.encodeState(s));
  assert.deepEqual(restored.pieces.map(p => p.process), ['saw', 'mill']);
  let r = C.calculate(restored, N);
  close(r.scenarios[0].processCost, 25); close(r.scenarios[1].processCost, 25);
  close(r.scenarios[0].materialCost, 40); close(r.scenarios[1].materialCost, 80);
  restored.scenarios[0].sheetWidth = 50; restored.scenarios[0].sheetHeight = 50;
  r = C.calculate(restored, N);
  assert(r.scenarios[0].errors.length > 0); assert.equal(r.scenarios[1].errors.length, 0);
  assert.equal(r.errors.length, 0);
});
test('legacy global operation and plate URL fields still supply defaults', () => {
  const s = C.parseReadableUrl('?process=mill&sheet_w=1500&sheet_h=900&supplier1_process_price=6');
  assert.equal(s.pieces[0].process, 'mill'); assert.equal(s.scenarios[0].sheetWidth, 1500);
  assert.equal(s.scenarios[0].sheetHeight, 900); assert.equal(s.scenarios[0].processCosts.mill.value, 6);
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function fixture() {
  const s = C.defaultState();
  s.sheetWidth = 1000; s.sheetHeight = 1000; s.materialMode = 'full_plate';
  s.pieces[0].material = 'PE';
  C.ensureRates(s);
  s.scenarios[0].rates['pe|10'].price = 40;
  return s;
}
test('unit sale and unit margin follow quantity and survive URL roundtrip', () => {
  const s = fixture(); s.pieces[0].quantity = 2;
  s.scenarios[0].pricing = { mode: 'salePerPiece', value: 30 };
  let r = C.calculate(s, N).scenarios[0]; close(r.salePrice, 60);
  s.pieces[0].quantity = 3;
  r = C.calculate(C.decodeState(C.encodeState(s)), N).scenarios[0]; close(r.salePrice, 90);
  s.scenarios[0].pricing = { mode: 'marginPerPiece', value: 7 };
  r = C.calculate(s, N).scenarios[0];
  close(r.salePrice, C.roundMoney((r.landedCost + 7 * s.pieces[0].quantity) / s.pieces[0].quantity) * s.pieces[0].quantity);
  close(r.marginEuro, r.salePrice - r.landedCost);
  assert(Math.abs(r.marginEuro - 21) < 0.02);
});
test('editing a mixed line unit price affects that line and the total, not another line', () => {
  const s = fixture(); const piece = C.newPiece('saw'); piece.material = 'PE'; piece.quantity = 2;
  s.pieces.push(piece);
  const before = C.calculate(s, N).scenarios[0];
  s.scenarios[0].linePricing = { [piece.id]: { mode: 'salePerPiece', value: 15 } };
  const after = C.calculate(C.decodeState(C.encodeState(s)), N).scenarios[0];
  close(after.lines[0].salePrice, before.lines[0].salePrice);
  close(after.lines[1].salePrice, 30);
  close(after.salePrice, after.lines[0].salePrice + 30);
  close(after.marginEuro, after.salePrice - after.landedCost);
});
test('percentage, sale and euro margin remain the chosen intent when cost changes', () => {
  const s = fixture(); const scenario = s.scenarios[0];
  scenario.pricing = { mode: 'marginPct', value: 60 };
  let result = C.calculate(s, N).scenarios[0];
  close(result.landedCost, 40); close(result.salePrice, 100); close(result.marginEuro, 60);
  scenario.transport = 20;
  result = C.calculate(s, N).scenarios[0];
  close(result.salePrice, 150); close(result.marginPct, 60);
  scenario.pricing = { mode: 'salePrice', value: 100 };
  result = C.calculate(s, N).scenarios[0]; close(result.marginPct, 40);
  scenario.pricing = { mode: 'marginEuro', value: 25 };
  result = C.calculate(s, N).scenarios[0]; close(result.salePrice, 85);
  scenario.pricing = { mode: 'salePrice', value: 30 };
  result = C.calculate(s, N).scenarios[0]; close(result.marginEuro, -30);
});
test('transport is charged once and allocated by quantity while the margin includes its full amount', () => {
  const s = fixture();
  Object.assign(s.pieces[0], { width: 100, height: 100 });
  s.scenarios[0].pricing = { mode: 'salePrice', value: 1000 };
  for (const quantity of [5, 10]) {
    s.pieces[0].quantity = quantity;
    s.scenarios[0].transport = 0;
    const before = C.calculate(s, N).scenarios[0];
    s.scenarios[0].transport = 100;
    const after = C.calculate(C.decodeState(C.encodeState(s)), N).scenarios[0];
    close(after.transport, 100);
    close(after.landedCost - before.landedCost, 100);
    close(after.costPerPiece - before.costPerPiece, 100 / quantity);
    close(before.marginEuro - after.marginEuro, 100);
    close(after.lines.reduce((sum, line) => sum + line.cost, 0), after.landedCost);
  }
});
test('line costs and sales sum to scenario totals across two thicknesses', () => {
  const s = fixture(); const p = C.newPiece('saw'); p.material = 'PE'; p.thickness = 5; p.quantity = 3;
  s.pieces.push(p); C.ensureRates(s);
  const sc = s.scenarios[0]; sc.rates['pe|5'].price = 20; sc.transport = 17; sc.dutyPct = 5;
  sc.processCost.value = 2; s.pieces[0].holes = 5; sc.holeCost.value = 1.5;
  const r = C.calculate(s, N).scenarios[0];
  for (const [line, total] of [['cost', 'landedCost'], ['salePrice', 'salePrice'], ['materialCost', 'materialCost'], ['marginEuro', 'marginEuro']]) {
    close(r.lines.reduce((sum, l) => sum + l[line], 0), r[total]);
  }
  close(r.holeCost, 7.5);
});
test('own hole costs stay separate from imported goods for the configured duty estimate', () => {
  const s = fixture(); const sc = s.scenarios[0]; s.pieces[0].holes = 5;
  sc.holeCost = { performedBy: 'own', mode: 'minutes', value: 2, hourlyRate: 60 };
  sc.dutyPct = 10;
  const r = C.calculate(s, N).scenarios[0]; close(r.holeCost, 10); close(r.duty, 4); close(r.landedCost, 54);
});
test('supplier quote inclusions inherit per line and extra operations use the applicable rates', () => {
  const s = fixture();
  const first = s.pieces[0];
  Object.assign(first, { quantity: 2, holes: 3 });
  const second = C.newPiece('mill');
  Object.assign(second, { quantity: 3, holes: 2, material: 'PE', thickness: 10 });
  s.pieces.push(second);
  C.ensureRates(s);
  const supplier = s.scenarios[0];
  supplier.costSource = 'quote_per_piece';
  supplier.quotedUnitPrices[first.id] = 10;
  supplier.quotedUnitPrices[second.id] = 20;
  supplier.quoteProcess = 'extra';
  supplier.quoteHoles = 'extra';
  supplier.processCosts = {
    saw: { mode: 'per_piece', value: 2, hourlyRate: 75 },
    mill: { mode: 'per_piece', value: 4, hourlyRate: 75 }
  };
  supplier.holeCost = { mode: 'per_hole', value: 1, hourlyRate: 75, performedBy: 'supplier' };
  supplier.pieceCosts[first.id] = {
    mode: 'default', quoteProcessOverride: 'included', quoteHolesOverride: 'included'
  };

  let result = C.calculate(s, N).scenarios[0];
  close(result.quoteCost, 80);
  close(result.processCost, 12, 'the second line inherits the supplier extra setting');
  close(result.holeCost, 6, 'the second line inherits the supplier extra setting');
  close(result.landedCost, 98);

  supplier.pieceCosts[first.id].quoteProcessOverride = 'extra';
  supplier.pieceCosts[first.id].quoteHolesOverride = 'extra';
  supplier.pieceCosts[second.id] = {
    mode: 'default', quoteProcessOverride: 'included', quoteHolesOverride: 'included'
  };
  result = C.calculate(C.decodeState(C.encodeState(s)), N).scenarios[0];
  close(result.quoteCost, 80);
  close(result.processCost, 4);
  close(result.holeCost, 6);
  close(result.landedCost, 90);
});
test('total quotes add extra operations in supplier currency and preserve own-hole EUR costs', () => {
  const s = fixture();
  Object.assign(s.pieces[0], { quantity: 2, holes: 3 });
  const supplier = s.scenarios[0];
  supplier.costSource = 'quote_total';
  supplier.quotedTotal = 500;
  supplier.currency = 'TRY';
  supplier.exchangeRate = 5;
  supplier.quoteProcess = 'extra';
  supplier.quoteHoles = 'included';
  supplier.processCosts = {
    saw: { mode: 'minutes', value: 10, hourlyRate: 60 },
    mill: { mode: 'per_piece', value: 0, hourlyRate: 75 }
  };
  supplier.holeCost = { mode: 'per_hole', value: 1, hourlyRate: 75, performedBy: 'own' };

  let result = C.calculate(s, N).scenarios[0];
  close(result.quoteCost, 100);
  close(result.processCost, 4);
  close(result.ownHoleCost, 6);
  close(result.landedCost, 110);

  supplier.holeCost.performedBy = 'supplier';
  supplier.quoteHoles = 'extra';
  supplier.holeCost.value = 2;
  result = C.calculate(s, N).scenarios[0];
  close(result.quoteCost, 100);
  close(result.processCost, 4);
  close(result.holeCost, 2.4);
  close(result.landedCost, 106.4);
});
test('financial changes reuse nesting; geometric changes invalidate it', () => {
  const s = fixture(); let calls = 0;
  const spy = { packSinglePattern(...args) { calls++; return N.packSinglePattern(...args); }, packMixedSmart: N.packMixedSmart };
  s.pieces[0].width = 437;
  C.calculate(s, spy); const before = calls; assert(before > 0);
  s.scenarios[0].pricing = { mode: 'salePrice', value: 100 }; C.calculate(s, spy); assert.equal(calls, before);
  s.pieces[0].width = 438; C.calculate(s, spy); assert(calls > before);
});
test('opening choices validate and persist through copied URL, including pricing intent', () => {
  const s = fixture(); const p = s.pieces[0]; p.process = 'mill'; p.shape = 'circle'; p.opening = 'circle'; p.innerDiameter = 100;
  s.scenarios[0].pricing = { mode: 'salePrice', value: 180 };
  const restored = C.decodeState(C.encodeState(s));
  assert.equal(restored.pieces[0].innerDiameter, 100); close(C.calculate(restored, N).scenarios[0].salePrice, 180);
  p.innerDiameter = 300; assert(C.calculate(s, N).errors.length > 0);
  p.process = 'saw'; assert.equal(C.calculate(s, N).errors.length, 0);
  assert.equal(s.pieces[0].innerDiameter, 300, 'calculation must not erase original geometry');
});
test('readable URLs accept rectangular openings and retain defaults for omitted settings', () => {
  const s = C.parseReadableUrl('?process=mill&piece1_width=500&piece1_height=300&piece1_shape=rect&piece1_thickness=10&piece1_inner_width=200&piece1_inner_height=100');
  assert.equal(s.marginPct, 40); assert.equal(s.pieces[0].opening, 'rect');
  assert.equal(C.calculate(s, N).errors.length, 0);
  const html = QuoteCalculatorPreview.renderPiece(s.pieces[0], 0);
  assert(html.includes('200')); assert(!html.includes('NaN'));
});
test('readable quote URL settings validate and persist supplier and line inclusion overrides', () => {
  const s = C.parseReadableUrl('?piece1_process=saw&piece1_quantity=2&piece1_width=100&piece1_height=100&piece1_thickness=10&piece1_holes=3&supplier1_cost_source=quote_per_piece&supplier1_piece1_quote_price=10&supplier1_quote_process=extra&supplier1_quote_holes=included&supplier1_saw_price=2&supplier1_hole_price=1&supplier1_piece1_quote_process=extra&supplier1_piece1_quote_holes=extra&supplier1_piece1_process_price=5&supplier1_piece1_process_mode=per_piece&supplier1_piece1_hole_price=2&supplier1_piece1_hole_mode=per_hole');
  const scenario = s.scenarios[0], piece = s.pieces[0];
  assert.equal(scenario.quoteProcess, 'extra');
  assert.equal(scenario.quoteHoles, 'included');
  assert.equal(scenario.pieceCosts[piece.id].mode, 'custom');
  assert.equal(scenario.pieceCosts[piece.id].quoteProcessOverride, 'extra');
  assert.equal(scenario.pieceCosts[piece.id].quoteHolesOverride, 'extra');
  const restored = C.decodeState(C.encodeState(s));
  const result = C.calculate(restored, N).scenarios[0];
  close(result.quoteCost, 20);
  close(result.processCost, 10);
  close(result.holeCost, 12);
  close(result.landedCost, 42);
  assert.equal(result.priceComplete, true);
});
