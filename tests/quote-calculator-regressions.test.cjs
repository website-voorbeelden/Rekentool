const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
  const context = { console, TextEncoder, TextDecoder, URLSearchParams, btoa, atob };
  context.window = context;
  vm.createContext(context);
  for (const file of ['gasket-configurator-nesting.js', 'quote-calculator-core.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), context, { filename: file });
  }
  return { C: context.QuoteCalculatorCore, N: context.GasketConfiguratorNesting };
}

function fixture(C) {
  const state = C.defaultState();
  state.sheetWidth = 1000;
  state.sheetHeight = 1000;
  state.materialMode = 'full_plate';
  state.pieces[0].material = 'PE';
  C.ensureRates(state);
  state.scenarios[0].rates[C.groupKey(state.pieces[0])].price = 50;
  return state;
}

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
}

test('reopening a saved request reserves loaded IDs before adding more pieces or suppliers', () => {
  const first = runtime();
  const state = fixture(first.C);
  state.pieces.push(first.C.newPiece('saw'));
  state.pieces.shift();
  const savedId = state.pieces[0].id;
  state.scenarios[0].linePricing = { [savedId]: { mode: 'salePerPiece', value: 71 } };
  const link = first.C.encodeState(state);

  const reopened = runtime();
  const restored = reopened.C.decodeState(link);
  for (let i = 0; i < 8; i++) {
    restored.pieces.push(reopened.C.newPiece('saw'));
    restored.scenarios.push(reopened.C.newScenario('Extra leverancier ' + i, 'saw'));
  }
  assert.equal(restored.pieces[0].id, savedId);
  const ids = Array.from(restored.pieces.concat(restored.scenarios), record => record.id);
  assert.equal(new Set(ids).size, ids.length, 'every loaded and newly created record needs its own ID');

  restored.scenarios[0].linePricing[restored.pieces[1].id] = { mode: 'salePerPiece', value: 9 };
  const result = reopened.C.calculate(restored, reopened.N).scenarios[0];
  close(result.lines[0].salePrice, 71);
  close(result.lines[1].salePrice, 9);
});

test('material prices must be complete for each supplier, while free sawing is valid', () => {
  const { C, N } = runtime();
  const state = fixture(C);
  const secondPiece = C.newPiece('saw');
  secondPiece.material = 'PE';
  secondPiece.thickness = 20;
  state.pieces.push(secondPiece);
  state.scenarios.push(C.newScenario('Nog niet ingevuld', 'saw'));
  C.ensureRates(state);
  state.scenarios[1].processCost.value = 10;

  let results = C.calculate(state, N).scenarios;
  assert.equal(results[0].priceComplete, false);
  assert.deepEqual(Array.from(results[0].missingPrices), ['PE 20 mm']);
  assert.equal(results[1].priceComplete, false, 'a positive operation price does not supply material prices');
  assert.equal(results[1].missingPrices.length, 2);

  state.scenarios[0].rates[C.groupKey(secondPiece)].price = 20;
  results = C.calculate(state, N).scenarios;
  assert.equal(results[0].priceComplete, true);
  assert.equal(results[0].processCost, 0, 'the requested default of free sawing stays valid');
  assert.equal(results[1].priceComplete, false, 'completing one supplier must not complete another');

  state.scenarios[0].rates[C.groupKey(secondPiece)].price = 0;
  assert.equal(C.calculate(state, N).scenarios[0].priceComplete, false);
});

test('zero and fractional quantities stay visible as invalid instead of being silently rounded', () => {
  const { C, N } = runtime();
  for (const quantity of [0, 1.5]) {
    const state = fixture(C);
    state.pieces[0].quantity = quantity;
    const restored = C.decodeState(C.encodeState(state));
    const result = C.calculate(restored, N);
    assert.equal(restored.pieces[0].quantity, quantity);
    assert.equal(result.state.pieces[0].quantity, quantity);
    assert.equal(result.quantity, quantity);
    assert.ok(result.errors.some(error => /geheel aantal van minimaal 1/.test(error)));
    assert.ok(result.scenarios[0].errors.some(error => /geheel aantal van minimaal 1/.test(error)));
  }
});

test('own work does not absorb another piece’s import duty and allocated transport remains taxable', () => {
  const { C, N } = runtime();
  const state = fixture(C);
  state.pieces[0].holes = 10;
  const secondPiece = C.newPiece('saw');
  secondPiece.material = 'PE';
  secondPiece.thickness = 20;
  state.pieces.push(secondPiece);
  C.ensureRates(state);
  const supplier = state.scenarios[0];
  supplier.rates[C.groupKey(secondPiece)].price = 50;
  supplier.holeCost = { performedBy: 'own', mode: 'per_hole', value: 10, hourlyRate: 75 };
  supplier.dutyPct = 10;

  let result = C.calculate(state, N).scenarios[0];
  close(result.ownHoleCost, 100);
  close(result.duty, 10);
  close(result.landedCost, 210);
  close(result.lines[0].cost, 155);
  close(result.lines[1].cost, 55);

  supplier.transport = 40;
  result = C.calculate(state, N).scenarios[0];
  close(result.duty, 14);
  close(result.landedCost, 254);
  close(result.lines[0].cost, 188);
  close(result.lines[1].cost, 66);
  close(result.lines.reduce((sum, line) => sum + line.cost, 0), result.landedCost);
  close(result.lines.reduce((sum, line) => sum + line.salePrice, 0), result.salePrice);
});

test('nesting alternatives reuse cached packing, survive sharing and stay supplier-specific', () => {
  const { C, N } = runtime();
  const state = fixture(C);
  state.sheetWidth = 2000;
  state.materialMode = 'used_strip';
  Object.assign(state.pieces[0], { width: 430, height: 270, quantity: 7 });
  state.scenarios.push(C.newScenario('Leverancier 2', 'saw'));
  C.ensureRates(state);
  state.scenarios[1].rates[C.groupKey(state.pieces[0])].price = 50;
  let packCalls = 0;
  const countedNesting = {
    packSinglePattern(...args) { packCalls++; return N.packSinglePattern(...args); },
    packMixedSmart(...args) { packCalls++; return N.packMixedSmart(...args); }
  };
  let calculation = C.calculate(state, countedNesting);
  const best = calculation.scenarios[0].groups[0];
  assert.ok(best.layout.optionCount > 1, 'fixture needs meaningful alternative layouts');
  const initialPackCalls = packCalls;
  assert.ok(initialPackCalls > 0);
  const areas = [];
  const layouts = new Set();

  for (let index = 0; index < best.layout.optionCount; index++) {
    state.scenarios[0].layoutChoices[best.key] = { key: best.layout.selectionKey, index };
    calculation = C.calculate(state, countedNesting);
    const selected = calculation.scenarios[0].groups[0];
    assert.equal(selected.layout.optionIndex, index);
    assert.equal(calculation.scenarios[1].groups[0].layout.optionIndex, 0);
    close(selected.layout.bestAreaMm2, best.areaMm2);
    areas.push(selected.areaMm2);
    layouts.add(JSON.stringify([selected.layout.sheetWidth, selected.layout.sheetHeight, selected.layout.packing.plates]));
    close(calculation.scenarios[0].materialCost, selected.areaMm2 / 1000000 * 50);
  }
  assert.equal(packCalls, initialPackCalls, 'cycling alternatives must use the cached candidates');
  assert.equal(layouts.size, best.layout.optionCount, 'each offered layout must be distinct');
  assert.deepEqual(areas, areas.slice().sort((a, b) => a - b));
  assert.ok(areas[areas.length - 1] > areas[0], 'fixture should expose the extra cost of a worse layout');

  const chosenIndex = best.layout.optionCount - 1;
  state.scenarios[0].rates[best.key].price = 75;
  state.scenarios[0].pricing = { mode: 'salePrice', value: 200 };
  calculation = C.calculate(state, countedNesting);
  assert.equal(calculation.scenarios[0].groups[0].layout.optionIndex, chosenIndex);
  assert.equal(packCalls, initialPackCalls, 'editing prices must not repack');

  const fresh = runtime();
  const restored = fresh.C.decodeState(C.encodeState(state));
  const shared = fresh.C.calculate(restored, fresh.N);
  assert.equal(shared.scenarios[0].groups[0].layout.optionIndex, chosenIndex);
  assert.equal(shared.scenarios[1].groups[0].layout.optionIndex, 0);
  close(shared.scenarios[0].materialCost, calculation.scenarios[0].materialCost);

  state.scenarios[0].layoutChoices[best.key].index = (chosenIndex + 1) % best.layout.optionCount;
  assert.equal(C.calculate(state, countedNesting).scenarios[0].groups[0].layout.optionIndex, 0);
  state.scenarios[0].layoutChoices[best.key].index = chosenIndex;
  state.pieces[0].width += 1;
  calculation = C.calculate(state, countedNesting);
  assert.equal(calculation.scenarios[0].groups[0].layout.optionIndex, 0);
  assert.notEqual(calculation.scenarios[0].groups[0].layout.selectionKey, best.layout.selectionKey);
  assert.ok(packCalls > initialPackCalls, 'a geometry change needs newly computed candidates');
});
