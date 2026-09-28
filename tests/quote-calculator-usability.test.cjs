const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scripts = ['gasket-configurator-nesting', 'quote-calculator-core', 'quote-calculator-preview', 'quote-calculator-chart', 'quote-calculator-ai', 'quote-calculator'];

function app(hash = '') {
  const events = {}, registrations = {}, created = [];
  function element(tag) {
    const el = { tagName: tag.toUpperCase(), style: {}, children: [], classList: { toggle() {} },
      append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.children.push(node); },
      querySelector() { return null; }, remove() {}, focus() {}, select() {} };
    created.push(el); return el;
  }
  const status = element('span'), actions = element('div'), message = element('div');
  const root = { innerHTML: '', addEventListener(type, handler, options) { events[type] = handler; registrations[type] = options; },
    querySelectorAll() { return []; }, querySelector(selector) { return selector === '[data-ai-message]' ? status : selector === '[data-message]' ? message : actions; } };
  const context = { console, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    location: { href: 'http://localhost:4173/gasket-configurator/', origin: 'http://localhost:4173', pathname: '/gasket-configurator/', search: '', hash },
    document: { activeElement: null, currentScript: { src: 'http://localhost:4173/gasket-configurator/assets/quote-calculator.js' },
      querySelector() { return root; }, createElement: element, body: element('body'), execCommand() { return false; } },
    QuoteCalculatorView: { update(container, html) { container.innerHTML = html; }, keepPosition(root, update) { update(); } },
    setTimeout() {}, clearTimeout() {}, navigator: { clipboard: { writeText(text) { context.copied = text; return Promise.resolve(); } } } };
  context.window = context; vm.createContext(context);
  scripts.forEach(name => vm.runInContext(fs.readFileSync(require.resolve('../assets/' + name + '.js'), 'utf8'), context));
  function click(action) { events.click({ target: { closest(selector) { return selector === '[data-action]' ? { getAttribute(name) { return name === 'data-action' ? action : '0'; } } : null; } } }); }
  function input(path, value, pricing, kind) { events.input({ target: { value: String(value), tagName: 'INPUT', dataset: pricing ? { pricing, scenario: '0' } : {},
    validity: { valid: false, stepMismatch: true }, hasAttribute() { return false; }, getAttribute(name) { return name === 'data-path' ? path : name === 'data-kind' ? kind : null; } } }); }
  function choose(path, value) {
    events.input({ target: { value, tagName: 'SELECT', dataset: {}, hasAttribute() { return false; },
      getAttribute(name) { return name === 'data-path' ? path : null; } } });
  }
  function rate(key, field, value, scenario = 0) {
    const attrs = { 'data-rate-field': field, 'data-rate-key': encodeURIComponent(key), 'data-rate-scenario': String(scenario) };
    events.input({ target: { value: String(value), dataset: {}, hasAttribute(name) { return name in attrs; }, getAttribute(name) { return attrs[name]; } } });
  }
  return { context, root, events, registrations, created, actions, status, message, click, input, choose, rate };
}

test('scrolling a focused numeric input releases it without cancelling page scroll', () => {
  const a = app(); let blurred = false;
  const field = { tagName: 'INPUT', type: 'number', value: '12.5', blur() { blurred = true; } };
  a.context.document.activeElement = field;
  a.events.wheel({ target: field, ctrlKey: false });
  assert(blurred); assert.equal(field.value, '12.5'); assert(a.registrations.wheel.passive);
  blurred = false; a.events.wheel({ target: field, ctrlKey: true }); assert(!blurred);
});

test('overview and detail quantities stay mirrored, with decimal financial input and unit steppers', () => {
  const a = app(); a.input('pieces.0.quantity', 7);
  let copies = [...a.root.innerHTML.matchAll(/data-path="pieces\.0\.quantity"[^>]*value="([^"]*)"/g)];
  assert.equal(copies.length, 3); copies.forEach(match => assert.equal(match[1], '7'));
  a.input('pieces.0.quantity', ''); assert(a.root.innerHTML.includes('geheel aantal'));
  assert(a.root.innerHTML.includes('data-path="pieces.0.quantity"'));
  a.input('pieces.0.quantity', 3); a.input('', 32.5, 'marginPct');
  assert(a.root.innerHTML.includes('data-pricing="marginPct" data-scenario="0" value="32.5"'));
  assert(!/step="0\./.test(a.root.innerHTML));
});

test('AI button copies a neutral, complete prompt and its example opens as a valid calculation', async () => {
  const a = app(); a.click('copy-ai-prompt'); await Promise.resolve();
  const prompt = a.context.copied;
  assert(prompt.includes('Basis-URL: http://localhost:4173/gasket-configurator/'));
  assert(prompt.includes('Geen klantnamen')); assert(prompt.includes('supplierN_rate1_price'));
  assert(prompt.includes('supplierN_holes_by')); assert(a.status.textContent.includes('Gekopieerd'));
  assert(prompt.includes('pieceN_name'));
  assert(a.root.innerHTML.indexOf('data-action="copy-ai-prompt"') < a.root.innerHTML.indexOf('<h1>Prijs en marge'));
  const example = prompt.split('\n').find(line => line.startsWith('http://') && line.includes('?'));
  const C = a.context.QuoteCalculatorCore;
  const restored = C.parseReadableUrl(new URL(example).search);
  const result = C.calculate(restored, a.context.GasketConfiguratorNesting);
  assert.equal(result.errors.length, 0); assert(result.scenarios[0].priceComplete);
  assert.equal(result.holes, 100); assert.equal(result.scenarios[0].holeCost, 150);
  assert.equal(restored.pieces[0].name, 'Montageplaat');
  const urlOwn = C.parseReadableUrl(new URL(example.replace('holes_by=supplier', 'holes_by=own')).search);
  assert.equal(urlOwn.scenarios[0].holeCost.performedBy, 'own');
});

test('quote inclusion controls are available globally and as inheritable line overrides', () => {
  const C = app().context.QuoteCalculatorCore;
  const state = C.defaultState();
  state.pieces[0].holes = 2;
  state.scenarios[0].costSource = 'quote_per_piece';
  state.scenarios[0].quotedUnitPrices[state.pieces[0].id] = 10;
  state.scenarios[0].quoteProcess = 'extra';
  state.scenarios[0].quoteHoles = 'extra';
  state.scenarios[0].processCosts = {
    saw: { mode: 'per_piece', value: 5, hourlyRate: 75 },
    mill: { mode: 'per_piece', value: 0, hourlyRate: 75 }
  };
  const instance = app('#calc=' + C.encodeState(state));
  const processPath = 'scenarios.0.quoteProcess';
  const pieceProcessPath = 'scenarios.0.pieceCosts.' + state.pieces[0].id + '.quoteProcessOverride';
  assert(instance.root.innerHTML.includes('data-path="' + processPath + '"'));
  assert(instance.root.innerHTML.includes('data-path="scenarios.0.quoteHoles"'));
  assert(instance.root.innerHTML.includes('data-path="' + pieceProcessPath + '"'));
  assert(instance.root.innerHTML.includes('Leveranciersinstelling'));
  assert(instance.root.innerHTML.includes('Leveranciersbewerkingen apart'));

  instance.choose(pieceProcessPath, 'included');
  assert(instance.root.innerHTML.includes('<option value="included" selected>Inbegrepen in offerte</option>'));
});

test('AI prompt contains the exact supplier quote instructions', async () => {
  const a = app(); a.click('copy-ai-prompt'); await Promise.resolve();
  const expected = [
    'LEVERANCIERSOFFERTE EN APARTE BEWERKINGEN',
    '',
    'Bepaal eerst wat de offerteprijs omvat. Een leverancier kan een compleet afgewerkt stuk aanbieden, maar ook een basisproduct met apart berekende bewerkingen.',
    '',
    'Gebruik:',
    '- supplierN_cost_source=quote_per_piece voor een offerteprijs per stukregel. Vul supplierN_pieceM_quote_price in als prijs per stuk van regel M.',
    '- supplierN_cost_source=quote_total voor één offertebedrag voor de volledige aanvraag. Vul supplierN_quoted_total in.',
    '',
    'Geef bij relevante bewerkingen expliciet aan of ze inbegrepen zijn:',
    '- supplierN_quote_process=included|extra voor zagen/frezen.',
    '- supplierN_quote_holes=included|extra voor gaten door de leverancier.',
    '',
    'Gebruik included wanneer de bewerking al in de offerteprijs zit. Vul hiervoor geen extra kosten in.',
    'Gebruik extra wanneer de bewerking afzonderlijk wordt berekend. Vul dan ook het betreffende bewerkingstarief in.',
    '',
    'Voor uitzonderingen per stukregel M:',
    '- supplierN_pieceM_quote_process=included|extra',
    '- supplierN_pieceM_quote_holes=included|extra',
    '',
    'Zonder uitzondering geldt de instelling van de leverancier.',
    '',
    'APARTE TARIEVEN',
    '',
    'Zagen/frezen:',
    '- supplierN_saw_price of supplierN_mill_price: bedrag per stuk.',
    '- Bij tijd: supplierN_saw_mode=minutes of supplierN_mill_mode=minutes; het bijbehorende price-veld bevat minuten per stuk en het hourly_rate-veld bevat het uurtarief.',
    '',
    'Gaten:',
    '- supplierN_holes_by=supplier',
    '- supplierN_hole_mode=per_hole',
    '- supplierN_hole_price=bedrag PER GAT.',
    'De calculator vermenigvuldigt dit zelf met het aantal gaten per stuk en het aantal stukken.',
    'Bij tijd: hole_mode=minutes, hole_price=minuten per gat en hole_hourly_rate=uurtarief.',
    '',
    'Afwijkende tarieven per stukregel:',
    '- supplierN_pieceM_process_price',
    '- supplierN_pieceM_process_mode=per_piece|minutes',
    '- supplierN_pieceM_process_hourly_rate',
    '- supplierN_pieceM_hole_price',
    '- supplierN_pieceM_hole_mode=per_hole|minutes',
    '- supplierN_pieceM_hole_hourly_rate',
    '- supplierN_pieceM_holes_by=supplier|own',
    '',
    'Eigen gatenwerk gebruikt holes_by=own en wordt apart berekend in EUR. Tel dezelfde gatenbewerking niet ook bij de leverancier mee. Controleer dat de basisofferte betrekking heeft op de juiste uitvoering.',
    '',
    'VOORBEELD',
    '',
    '80 blokken kosten €22,50 per blok, inclusief zagen maar exclusief gaten.',
    'Elk blok krijgt 5 gaten à €1 per gat bij de leverancier.',
    '',
    'Gebruik:',
    'piece1_quantity=80',
    'piece1_holes=5',
    'supplier1_currency=EUR',
    'supplier1_cost_source=quote_per_piece',
    'supplier1_piece1_quote_price=22.50',
    'supplier1_quote_process=included',
    'supplier1_quote_holes=extra',
    'supplier1_holes_by=supplier',
    'supplier1_hole_mode=per_hole',
    'supplier1_hole_price=1',
    '',
    'Basisproducten: 80 × €22,50 = €1.800.',
    'Gaten: 80 × 5 × €1 = €400.',
    'Samen: €2.200 vóór transport en overige kosten.',
    '',
    'Deze voorbeeldparameters zijn alleen het kostengedeelte. Voeg de werkelijke materiaalnaam, dikte, vorm, maten en gatdiameter uit de aanvraag toe.',
    '',
    'BELANGRIJK',
    '',
    'Een offerte vervangt de berekende materiaalkosten. Gebruik geen fictieve plaatprijs om een offerteprijs na te bootsen.',
    '',
    'Tel bewerkingen alleen extra op wanneer ze afzonderlijk worden berekend. Neem een bewerking alleen als inbegrepen aan wanneer dat duidelijk uit de aanvraag of offerte blijkt. Vraag bij twijfel om verduidelijking.',
    '',
    'Offertebedragen en leveranciersbewerkingen zijn in de gekozen leveranciersvaluta. Eigen gatenwerk is in EUR.',
    '',
    'Transport en overige kosten worden apart ingevoerd wanneer ze niet al in de offerteprijs zitten. Tel inbegrepen kosten niet dubbel.',
    '',
    'Een totaalofferte geldt voor het opgegeven aantal. Leid daar zonder bevestiging geen offerte voor andere aantallen uit af. De verdeling van een totaalofferte naar stukregels is een interne toerekening, geen afzonderlijk geoffreerde stukprijs.'
  ].join('\n');
  assert(a.context.copied.includes(expected));
});

test('failed native copying exposes the actual prompt or link instead of reporting success', () => {
  const a = app(); a.context.navigator.clipboard = null;
  a.click('copy-ai-prompt');
  assert(a.status.textContent.includes('niet gelukt'));
  assert(a.created.some(el => el.tagName === 'TEXTAREA' && el.readOnly && el.value.includes('MIJN AANVRAAG')));
  a.click('copy-link');
  assert(a.message.textContent.includes('niet gelukt'));
  assert(a.created.some(el => el.tagName === 'INPUT' && el.readOnly && el.value.includes('#calc=')));
});

test('identity colours survive changes, removal and saved links and match the quantity chart', () => {
  const a = app(), C = a.context.QuoteCalculatorCore;
  let s = C.defaultState(); s.pieces.push(C.newPiece('saw')); s.scenarios.push(C.newScenario('B'));
  s = C.normalizeState(s); const piece = s.pieces[1], supplier = s.scenarios[1];
  const pColor = C.colorFor(piece, 'piece'), sColor = C.colorFor(supplier, 'supplier');
  assert.notEqual(C.colorFor(s.pieces[0], 'piece'), pColor);
  s.pieces.splice(0, 1); s.scenarios.splice(0, 1); supplier.name = 'Nieuwe naam';
  s = C.decodeState(C.encodeState(s));
  assert.equal(C.colorFor(s.pieces[0], 'piece'), pColor); assert.equal(C.colorFor(s.scenarios[0], 'supplier'), sColor);
  C.ensureRates(s); Object.values(s.scenarios[0].rates).forEach(rate => { rate.price = 40; });
  const chart = a.context.QuoteCalculatorChart.build(s, C, a.context.GasketConfiguratorNesting);
  assert.equal(chart.series[0].color, sColor);
  const svg = a.context.QuoteCalculatorPreview.renderPiece(s.pieces[0], 0);
  assert(svg.includes('fill="' + pColor + '"'));
});

test('a copied calculation reopens with the selected supplier still in view', () => {
  const a = app(); a.click('add-scenario'); a.click('copy-link');
  const hash = '#' + a.context.copied.split('#')[1];
  const saved = a.context.QuoteCalculatorCore.decodeState(hash.slice(6));
  assert.equal(saved.selectedScenarioId, saved.scenarios[1].id);
  const reopened = app(hash);
  assert(reopened.root.innerHTML.includes('<option value="1" selected>Leverancier 2</option>'));
});

test('piece names mirror across price controls, overview, details and saved links, with safe labels', () => {
  const a = app();
  const name = 'Montageplaat "A" & <B>';
  a.input('pieces.0.name', name, null, 'text');
  const names = [...a.root.innerHTML.matchAll(/data-path="pieces\.0\.name"[^>]*value="([^"]*)"/g)];
  assert.equal(names.length, 3);
  names.forEach(match => assert.equal(match[1], 'Montageplaat &quot;A&quot; &amp; &lt;B&gt;'));
  assert(a.root.innerHTML.includes('aria-label="Vormvoorbeeld Montageplaat &quot;A&quot; &amp; &lt;B&gt;"'));
  assert(!a.root.innerHTML.includes('<B>'));
  a.click('add-piece');
  assert(a.root.innerHTML.includes('qcalc__sheetTable qcalc__pieceTable'));
  assert(a.root.innerHTML.includes('data-path="pieces.0.name"'));
  a.click('copy-link');
  const C = a.context.QuoteCalculatorCore, saved = C.decodeState(a.context.copied.split('#calc=')[1]);
  assert.equal(saved.pieces[0].name, name);
  delete saved.pieces[0].name;
  assert.equal(C.decodeState(C.encodeState(saved)).pieces[0].name, '');
});

test('material prices can be changed in closed supplier summaries and remain linked to each material group', () => {
  const C = app().context.QuoteCalculatorCore;
  const s = C.defaultState(); s.pieces[0].material = 'PE';
  s.pieces.push(Object.assign(C.newPiece('saw'), { material: 'PE', thickness: 20 }));
  C.ensureRates(s);
  const a = app('#calc=' + C.encodeState(s));
  a.rate('pe|10', 'price', 42.5); a.rate('pe|20', 'price', 85);
  const summary = a.root.innerHTML.match(new RegExp('data-detail="supplier-' + s.scenarios[0].id + '"[^>]*><summary[^>]*>(.*?)</summary>'))[1];
  assert(summary.includes('PE · 10 mm · €/m²')); assert(summary.includes('PE · 20 mm · €/m²'));
  assert(summary.includes('value="42.5"')); assert(summary.includes('value="85"'));
  assert.equal((a.root.innerHTML.match(/value="42.5" data-rate-scenario="0"/g) || []).length, 2);
  a.rate('pe|10', 'unit', 'sheet');
  assert.equal((a.root.innerHTML.match(/PE · 10 mm · €\/plaat/g) || []).length, 2);
  a.click('copy-link');
  const restored = C.decodeState(a.context.copied.split('#calc=')[1]);
  assert.equal(restored.scenarios[0].rates['pe|10'].price, 42.5);
  assert.equal(restored.scenarios[0].rates['pe|10'].unit, 'sheet');
  assert.equal(restored.scenarios[0].rates['pe|20'].price, 85);
});

test('cost composition scales all bars in euros while labels show each supplier’s own percentages', () => {
  const C = app().context.QuoteCalculatorCore;
  const s = C.defaultState(); s.materialMode = 'full_plate';
  Object.assign(s.pieces[0], { width: 100, height: 100, quantity: 2, holes: 2, holeDiameter: 8 });
  s.scenarios.push(C.newScenario('Tweede leverancier'));
  s.scenarios.forEach((scenario, index) => {
    Object.assign(scenario, { sheetWidth: 1000, sheetHeight: 1000, transport: 25, dutyPct: 10, other: 5 });
    scenario.processCosts = { saw: { mode: 'per_piece', value: 5, hourlyRate: 75 }, mill: { mode: 'per_piece', value: 0, hourlyRate: 75 } };
    scenario.holeCost = { mode: 'per_hole', value: 1.5, hourlyRate: 75, performedBy: index === 0 ? 'own' : 'supplier' };
  });
  C.ensureRates(s); s.scenarios.forEach((scenario, index) => Object.values(scenario.rates).forEach(rate => { rate.price = index === 0 ? 100 : 200; }));
  const a = app('#calc=' + C.encodeState(s)), html = a.root.innerHTML;
  assert(html.indexOf('Opbouw kostprijs') < html.indexOf('Leveranciers vergelijken'));
  assert(html.indexOf('Opbouw kostprijs') < html.indexOf('Kostprijs bij andere aantallen'));
  const rows = [...html.matchAll(/<article class="qcalc__costBreakdown">(.*?)<\/article>/g)];
  assert.equal(rows.length, 2);
  const euro = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
  assert(rows[0][1].includes(euro(159.5))); assert(rows[1][1].includes(euro(270.1)));
  assert(rows[0][1].includes('Eigen gatenwerk')); assert(!rows[1][1].includes('Eigen gatenwerk'));
  [100, 10, 6, 25, 13.5, 5].forEach(value => assert(rows[0][1].includes(euro(value))));
  rows.forEach((row, index) => {
    const sum = [...row[1].matchAll(/style="width:([\d.]+)%;background:/g)].reduce((sum, part) => sum + Number(part[1]), 0);
    const expectedWidth = (index === 0 ? 159.5 : 270.1) / 270.1 * 100;
    assert(Math.abs(sum - expectedWidth) < .00001);
    const percentages = [...row[1].matchAll(/ · ([\d,]+)%<\/strong>/g)].reduce((sum, part) => sum + Number(part[1].replace(',', '.')), 0);
    assert(Math.abs(percentages - 100) < .3, 'rounded labels describe each supplier’s own cost split');
    assert(row[1].includes('Transport')); assert(row[1].includes('Invoerrechten'));
  });
  const transportWidths = rows.map(row => Number(row[1].match(/width:([\d.]+)%;background:#ae650d/)[1]));
  assert.equal(transportWidths[0], transportWidths[1], 'equal euro amounts occupy equal widths');
  assert(html.includes('qcalc__sheetTable qcalc__supplierTable'));
  assert(html.includes('Witte cellen zijn aanpasbaar'));
  a.rate('materiaal|10', 'price', 0, 1);
  assert.equal((a.root.innerHTML.match(/<article class="qcalc__costBreakdown">/g) || []).length, 1);
  const remainingWidth = [...a.root.innerHTML.matchAll(/style="width:([\d.]+)%;background:/g)].reduce((sum, part) => sum + Number(part[1]), 0);
  assert(Math.abs(remainingWidth - 100) < .00001, 'incomplete quotes do not set the euro scale');
});

test('the cost card separates transport per order from its allocated unit cost as quantity changes', () => {
  const C = app().context.QuoteCalculatorCore;
  const s = C.defaultState(); s.materialMode = 'full_plate';
  Object.assign(s.pieces[0], { width: 100, height: 100, quantity: 5 });
  C.ensureRates(s); s.scenarios[0].rates['materiaal|10'].price = 40;
  s.scenarios[0].transport = 100;
  const a = app('#calc=' + C.encodeState(s));
  const euro = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
  function transportRow() { return a.root.innerHTML.match(/<table class="qcalc__costSummary">(.*?)<\/table>/)[1].match(/<th scope="row">Transport<\/th>(.*?)<\/tr>/)[1]; }
  assert(transportRow().includes('<td>' + euro(100) + '</td><td>' + euro(20) + '</td>'));
  a.input('pieces.0.quantity', 10);
  assert(transportRow().includes('<td>' + euro(100) + '</td><td>' + euro(10) + '</td>'));
  assert(a.root.innerHTML.includes('Stukkosten / st.<br>Materiaal + bewerking'));
  a.input('pieces.0.quantity', '');
  assert(transportRow().includes('<td>—</td>'));
  assert(!transportRow().includes('Infinity'));
});
