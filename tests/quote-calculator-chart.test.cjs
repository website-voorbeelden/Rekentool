const { test } = require('node:test');
const assert = require('node:assert/strict');
global.window = global;
require('../assets/gasket-configurator-nesting.js');
require('../assets/quote-calculator-core.js');
require('../assets/quote-calculator-chart.js');
const C = QuoteCalculatorCore, N = GasketConfiguratorNesting, Chart = QuoteCalculatorChart;

function fixture() {
  const state = C.defaultState();
  state.materialMode = 'full_plate';
  state.sheetWidth = 1000; state.sheetHeight = 1000;
  Object.assign(state.pieces[0], { width: 100, height: 100, quantity: 4 });
  C.ensureRates(state);
  state.scenarios[0].rates['materiaal|10'].price = 100;
  state.scenarios[0].transport = 20;
  state.scenarios[0].processCost.value = 2;
  return state;
}

test('quantity chart recalculates order cost at every point without changing input', () => {
  const state = fixture();
  state.scenarios[0].layoutChoices = { 'materiaal|10': 'saved-choice' };
  const before = JSON.stringify(state);
  const spy = Object.assign({}, C, { calculate(sample, nesting) {
    assert.deepEqual(sample.scenarios[0].layoutChoices, sample.pieces[0].quantity === 4 ? state.scenarios[0].layoutChoices : {});
    return C.calculate(sample, nesting);
  } });
  const model = Chart.build(state, spy, N);
  assert.equal(model.status, 'ready');
  assert.equal(model.currentQuantity, 4);
  assert(model.sampleQuantities.includes(4));
  assert.equal(new Set(model.sampleQuantities).size, model.sampleQuantities.length);
  assert.equal(model.series.length, 1);
  for (const point of model.series[0].points) assert(Math.abs(point.costPerPiece - (120 / point.quantity + 2)) < 1e-8);
  assert.equal(JSON.stringify(state), before);
  const html = Chart.render(model);
  assert(html.includes('€/stuk'));
  assert(html.includes('Aantal stukken'));
  assert(html.includes('Nu: 4'));
  assert(html.includes('Het huidige aantal gebruikt jouw gekozen indeling'));
});

test('mixed quantity chart preserves integer piece ratios and identifies averages', () => {
  const state = fixture(); state.pieces[0].quantity = 2;
  const second = C.newPiece('saw'); Object.assign(second, { quantity: 4, width: 80, height: 80 });
  state.pieces.push(second);
  const calls = [];
  const spy = Object.assign({}, C, { calculate(sample, nesting) {
    calls.push(sample.pieces.map(piece => piece.quantity));
    assert.deepEqual(sample.scenarios[0].layoutChoices, {});
    return C.calculate(sample, nesting);
  } });
  const model = Chart.build(state, spy, N);
  assert.equal(model.status, 'ready');
  assert.equal(model.ratio, '1 : 2');
  assert.equal(model.bundleQuantity, 3);
  assert(model.yLabel.startsWith('Gemiddelde'));
  calls.forEach(([first, second]) => { assert.equal(second, first * 2); assert(Number.isInteger(first)); });
  assert(model.sampleQuantities.includes(6));
});

test('invalid and unpriced suppliers do not appear as cheap chart options', () => {
  const state = fixture();
  const tooSmall = C.newScenario('Te klein', 'saw'); tooSmall.sheetWidth = 20; tooSmall.sheetHeight = 20;
  const noPrice = C.newScenario('Zonder prijs', 'saw');
  state.scenarios.push(tooSmall, noPrice); C.ensureRates(state);
  tooSmall.rates['materiaal|10'].price = 1;
  const model = Chart.build(state, C, N);
  assert.equal(model.status, 'ready');
  assert.deepEqual(model.series.map(series => series.name), ['Leverancier 1']);
  assert.deepEqual(model.omitted.map(series => series.name).sort(), ['Te klein', 'Zonder prijs']);
});

test('chart accepts explicit core price completeness and caps sampled workload', () => {
  const state = fixture(); state.pieces[0].quantity = 2001;
  const neverCalculate = Object.assign({}, C, { calculate() { throw new Error('Must not run'); } });
  assert.equal(Chart.build(state, neverCalculate, N).status, 'unavailable');
  state.pieces[0].quantity = 4;
  const incomplete = Object.assign({}, C, { calculate(sample, nesting) {
    const result = C.calculate(sample, nesting);
    result.scenarios.forEach(supplier => { supplier.priceComplete = false; });
    return result;
  } });
  assert.equal(Chart.build(state, incomplete, N).series.length, 0);
  const bounded = Object.assign({}, C, { calculate(sample) {
    const quantity = sample.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
    assert(quantity <= 2000);
    return { quantity, scenarios: sample.scenarios.map(supplier => ({ id: supplier.id, errors: [], costPerPiece: 3 })) };
  } });
  state.pieces[0].quantity = 1800;
  const model = Chart.build(state, bounded, N);
  assert(model.rangeLimited);
  assert(model.sampleQuantities.includes(1800));
  assert(Chart.render(model).includes('maximaal 2.000'));
});

test('chart escapes supplier names in visible and accessible labels', () => {
  const state = fixture(); state.scenarios[0].name = '<img src=x onerror=bad()>"';
  const html = Chart.render(Chart.build(state, C, N));
  assert(!html.includes('<img'));
  assert(html.includes('&lt;img'));
  assert(!html.includes('NaN'));
});

test('worker imports its dependencies and returns a chart result with the request id', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const replies = [];
  const context = vm.createContext({ console, TextEncoder, TextDecoder, postMessage(reply) { replies.push(reply); } });
  context.self = context;
  context.importScripts = (...files) => files.forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), context));
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/quote-calculator-chart-worker.js'), 'utf8'), context);
  context.onmessage({ data: { id: 'request-42', state: fixture() } });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].id, 'request-42');
  assert.equal(replies[0].model.status, 'ready');
});
