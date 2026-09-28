(function (global) {
  'use strict';

  var nextId = 1;
  var usedIds = new Set();
  var layoutCache = new Map();
  // ECB reference rates, foreign currency units per EUR. Saved quotes retain their own rate.
  var referenceExchangeRates = { date: '2026-09-25', TRY: 55.7975, CNY: 7.6551 };
  var palettes = {
    piece: ['#237c57', '#a16a06', '#366ab0', '#8950a7', '#b75420', '#157d86', '#a43a64', '#536b2e'],
    supplier: ['#2563eb', '#c2410c', '#7c3aed', '#0f766e', '#be185d', '#475569', '#8a5800', '#3f6212']
  };

  function nextColorIndex(records) {
    var index = 0;
    while (records.some(function (record) { return record.colorIndex === index; })) index += 1;
    return index;
  }

  function colorFor(record, kind) {
    var colors = palettes[kind] || palettes.piece;
    return colors[(Math.max(0, Math.floor(Number(record.colorIndex) || 0))) % colors.length];
  }

  function assignColors(records) {
    records.forEach(function (record) {
      if (!Number.isInteger(record.colorIndex) || record.colorIndex < 0) record.colorIndex = nextColorIndex(records);
    });
  }

  function id(prefix) {
    var value;
    do { nextId += 1; value = prefix + '-' + nextId; } while (usedIds.has(value));
    usedIds.add(value);
    return value;
  }

  function number(value, fallback) {
    if (value == null || value === '') return fallback || 0;
    var parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function positive(value) {
    return Math.max(0, number(value, 0));
  }

  function quoteStatus(value) {
    return value === 'extra' ? 'extra' : 'included';
  }

  function newPiece(process) {
    return {
      id: id('piece'),
      name: '',
      process: process === 'mill' ? 'mill' : 'saw',
      material: '',
      thickness: 10,
      quantity: 1,
      shape: process === 'saw' ? 'rect' : 'circle',
      width: 500,
      height: 250,
      cornerRadius: 0,
      outerDiameter: 250,
      innerDiameter: 0,
      innerWidth: 0,
      innerHeight: 0,
      opening: 'none',
      innerRadius: 0,
      holes: 0,
      holeDiameter: 0
    };
  }

  function quoteSetting(scenario, piece, operation) {
    var override = (scenario.pieceCosts || {})[piece.id] || {};
    var lineValue = operation === 'process' ? override.quoteProcessOverride : override.quoteHolesOverride;
    return quoteStatus(lineValue || (operation === 'process' ? scenario.quoteProcess : scenario.quoteHoles));
  }

  function newScenario(name, process) {
    return {
      id: id('scenario'),
      name: name || 'Leverancier',
      currency: 'EUR',
      exchangeRate: 1,
      exchangeRates: {},
      costSource: 'calculated',
      quotedTotal: 0,
      quotedUnitPrices: {},
      quoteProcess: 'included',
      quoteHoles: 'included',
      pieceCosts: {},
      rates: {},
      processCost: {
        mode: 'per_piece',
        value: process === 'saw' ? 0 : 0,
        hourlyRate: 75
      },
      holeCost: {
        mode: 'per_hole',
        value: 0,
        hourlyRate: 75,
        performedBy: 'supplier'
      },
      transport: 0,
      dutyPct: 0,
      other: 0
    };
  }

  function defaultState() {
    return {
      process: 'saw',
      materialMode: 'used_strip',
      sheetWidth: 2000,
      sheetHeight: 1000,
      edge: 0,
      gap: 3,
      marginPct: 40,
      pieces: [newPiece('saw')],
      scenarios: [newScenario('Leverancier 1', 'saw')]
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function groupKey(piece) {
    return (String(piece.material || '').trim().toLowerCase() || 'materiaal') + '|' + positive(piece.thickness);
  }

  function materialGroups(state) {
    var groups = [];
    var seen = {};
    (state.pieces || []).forEach(function (piece) {
      var key = groupKey(piece);
      if (!seen[key]) {
        seen[key] = {
          key: key,
          material: String(piece.material || '').trim() || 'Materiaal',
          thickness: positive(piece.thickness),
          pieces: []
        };
        groups.push(seen[key]);
      }
      seen[key].pieces.push(piece);
    });
    return groups;
  }

  function ensureRates(state) {
    var groups = materialGroups(state);
    (state.scenarios || []).forEach(function (scenario) {
      scenario.rates = scenario.rates || {};
      scenario.layoutChoices = scenario.layoutChoices || {};
      groups.forEach(function (group) {
        if (!scenario.rates[group.key]) {
          scenario.rates[group.key] = { unit: 'm2', price: 0 };
        }
      });
    });
    return groups;
  }

  function normalizeState(input) {
    var state = input && typeof input === 'object' ? clone(input) : defaultState();
    state.process = state.process === 'mill' ? 'mill' : 'saw';
    state.materialMode = ['full_plate', 'used_strip', 'compact_box'].indexOf(state.materialMode) >= 0
      ? state.materialMode
      : 'used_strip';
    state.sheetWidth = positive(state.sheetWidth) || 2000;
    state.sheetHeight = positive(state.sheetHeight) || 1000;
    state.edge = positive(state.edge);
    state.gap = positive(state.gap);
    state.marginPct = Math.min(95, positive(state.marginPct));
    state.pieces = Array.isArray(state.pieces) && state.pieces.length ? state.pieces : [newPiece(state.process)];
    state.scenarios = Array.isArray(state.scenarios) && state.scenarios.length
      ? state.scenarios
      : [newScenario('Leverancier 1', state.process)];

    state.pieces.concat(state.scenarios).forEach(function (record) { if (record.id) usedIds.add(record.id); });
    assignColors(state.pieces);
    assignColors(state.scenarios);
    state.pieces.forEach(function (piece) {
      piece.process = piece.process === 'mill' || piece.process === 'saw' ? piece.process : state.process;
      piece.id = piece.id || id('piece');
      piece.name = String(piece.name || '');
      piece.material = String(piece.material || '');
      piece.thickness = positive(piece.thickness);
      piece.quantity = piece.quantity == null ? 1 : positive(piece.quantity);
      piece.shape = ['rect', 'circle', 'manhole'].indexOf(piece.shape) >= 0 ? piece.shape : 'rect';
      piece.opening = piece.opening || (piece.innerDiameter > 0 ? 'circle' : (piece.innerWidth > 0 ? 'rect' : 'none'));
      piece.innerRadius = positive(piece.innerRadius);
      if (piece.process === 'saw') { piece.shape = 'rect'; piece.cornerRadius = 0; }
      if (piece.opening === 'none' || piece.process === 'saw') {
        piece.opening = 'none';
        piece.innerDiameter = 0; piece.innerWidth = 0; piece.innerHeight = 0;
      } else if (piece.opening === 'circle') {
        piece.innerWidth = 0; piece.innerHeight = 0;
      } else piece.innerDiameter = 0;
      ['width', 'height', 'cornerRadius', 'outerDiameter', 'innerDiameter', 'innerWidth', 'innerHeight', 'holeDiameter'].forEach(function (key) {
        piece[key] = positive(piece[key]);
      });
      piece.holes = positive(piece.holes);
    });

    state.scenarios.forEach(function (scenario, index) {
      scenario.id = scenario.id || id('scenario');
      scenario.name = String(scenario.name || ('Leverancier ' + (index + 1)));
      scenario.currency = ['EUR', 'TRY', 'CNY'].indexOf(scenario.currency) >= 0 ? scenario.currency : 'EUR';
      scenario.exchangeRate = scenario.currency === 'EUR' ? 1 : (scenario.exchangeRate == null ? referenceExchangeRates[scenario.currency] : positive(scenario.exchangeRate));
      var savedRates = scenario.exchangeRates || {};
      scenario.exchangeRates = { TRY: positive(savedRates.TRY), CNY: positive(savedRates.CNY) };
      if (scenario.currency !== 'EUR') scenario.exchangeRates[scenario.currency] = scenario.exchangeRate;
      scenario.sheetWidth = scenario.sheetWidth == null ? state.sheetWidth : positive(scenario.sheetWidth);
      scenario.sheetHeight = scenario.sheetHeight == null ? state.sheetHeight : positive(scenario.sheetHeight);
      scenario.rates = scenario.rates || {};
      scenario.processCost = scenario.processCost || { mode: 'per_piece', value: 0, hourlyRate: 75 };
      scenario.holeCost = scenario.holeCost || { mode: 'per_hole', value: 0, hourlyRate: 75, performedBy: 'supplier' };
      scenario.processCost.mode = scenario.processCost.mode === 'minutes' ? 'minutes' : 'per_piece';
      scenario.holeCost.mode = scenario.holeCost.mode === 'minutes' ? 'minutes' : 'per_hole';
      scenario.holeCost.performedBy = scenario.holeCost.performedBy === 'own' ? 'own' : 'supplier';
      scenario.processCost.value = positive(scenario.processCost.value);
      scenario.processCost.hourlyRate = positive(scenario.processCost.hourlyRate) || 75;
      scenario.processCosts = scenario.processCosts || {};
      ['saw', 'mill'].forEach(function (process) {
        if (!scenario.processCosts[process]) scenario.processCosts[process] = process === state.process
          ? clone(scenario.processCost) : { mode: 'per_piece', value: 0, hourlyRate: 75 };
      });
      scenario.holeCost.value = positive(scenario.holeCost.value);
      scenario.holeCost.hourlyRate = positive(scenario.holeCost.hourlyRate) || 75;
      scenario.transport = positive(scenario.transport);
      scenario.dutyPct = positive(scenario.dutyPct);
      scenario.other = positive(scenario.other);
      scenario.costSource = ['quote_total', 'quote_per_piece'].indexOf(scenario.costSource) >= 0 ? scenario.costSource : 'calculated';
      scenario.quotedTotal = positive(scenario.quotedTotal);
      scenario.quotedUnitPrices = scenario.quotedUnitPrices || {};
      scenario.quoteProcess = quoteStatus(scenario.quoteProcess);
      scenario.quoteHoles = quoteStatus(scenario.quoteHoles);
      scenario.pieceCosts = scenario.pieceCosts || {};
      state.pieces.forEach(function (piece) {
        scenario.quotedUnitPrices[piece.id] = positive(scenario.quotedUnitPrices[piece.id]);
        var override = scenario.pieceCosts[piece.id] || {};
        override.mode = override.mode === 'custom' ? 'custom' : 'default';
        override.quoteProcessOverride = ['included', 'extra'].indexOf(override.quoteProcessOverride) >= 0
          ? override.quoteProcessOverride : '';
        override.quoteHolesOverride = ['included', 'extra'].indexOf(override.quoteHolesOverride) >= 0
          ? override.quoteHolesOverride : '';
        if (override.mode === 'custom') {
          override.processCost = Object.assign({}, scenario.processCosts[piece.process], override.processCost);
          override.holeCost = Object.assign({}, scenario.holeCost, override.holeCost);
          override.processCost.mode = override.processCost.mode === 'minutes' ? 'minutes' : 'per_piece';
          override.holeCost.mode = override.holeCost.mode === 'minutes' ? 'minutes' : 'per_hole';
          override.holeCost.performedBy = override.holeCost.performedBy === 'own' ? 'own' : 'supplier';
          [override.processCost, override.holeCost].forEach(function (cost) {
            cost.value = positive(cost.value);
            cost.hourlyRate = positive(cost.hourlyRate);
          });
        }
        scenario.pieceCosts[piece.id] = override;
      });
    });

    ensureRates(state);
    return state;
  }

  function exchangeFactor(scenario) {
    return !scenario.currency || scenario.currency === 'EUR' ? 1 : (positive(scenario.exchangeRate) > 0 ? 1 / positive(scenario.exchangeRate) : 0);
  }

  function nestingItem(piece) {
    var shape = piece.shape;
    var outerW = shape === 'circle' ? positive(piece.outerDiameter) : positive(piece.width);
    var outerH = shape === 'circle' ? positive(piece.outerDiameter) : positive(piece.height);
    var radius = shape === 'circle'
      ? positive(piece.outerDiameter) / 2
      : (shape === 'manhole' ? Math.min(outerW, outerH) / 2 : Math.min(positive(piece.cornerRadius), outerW / 2, outerH / 2));

    return {
      shape: shape,
      qty: Math.max(1, Math.round(positive(piece.quantity))),
      od: shape === 'circle' ? positive(piece.outerDiameter) : Math.max(outerW, outerH),
      id: shape === 'circle' ? positive(piece.innerDiameter) : 0,
      outerW: outerW,
      outerH: outerH,
      outerRadius: radius,
      holes: positive(piece.holes),
      holeDia: positive(piece.holeDiameter)
    };
  }

  function plateBounds(plate, sheetW, sheetH, edge) {
    var placed = (plate && plate.placed) || [];
    if (!placed.length) return { x: 0, y: 0, width: 0, height: 0 };
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    placed.forEach(function (piece) {
      var halfW = positive(piece.halfW || piece.width / 2 || piece.r);
      var halfH = positive(piece.halfH || piece.height / 2 || piece.r);
      minX = Math.min(minX, piece.x - halfW);
      minY = Math.min(minY, piece.y - halfH);
      maxX = Math.max(maxX, piece.x + halfW);
      maxY = Math.max(maxY, piece.y + halfH);
    });
    return {
      x: Math.max(0, minX - edge),
      y: Math.max(0, minY - edge),
      width: Math.min(sheetW, Math.max(0, maxX - minX + edge * 2)),
      height: Math.min(sheetH, Math.max(0, maxY - minY + edge * 2))
    };
  }

  function chargedRect(plate, sheetW, sheetH, edge, mode) {
    var bounds = plateBounds(plate, sheetW, sheetH, edge);
    if (mode === 'full_plate') return { x: 0, y: 0, width: sheetW, height: sheetH };
    if (mode === 'compact_box') return bounds;
    return sheetW * bounds.height <= sheetH * bounds.width
      ? { x: 0, y: bounds.y, width: sheetW, height: bounds.height }
      : { x: bounds.x, y: 0, width: bounds.width, height: sheetH };
  }

  function chargedAreaForPacking(packing, sheetW, sheetH, edge, mode) {
    var area = 0;
    ((packing && packing.plates) || []).forEach(function (plate) {
      var rect = chargedRect(plate, sheetW, sheetH, edge, mode);
      area += rect.width * rect.height;
    });
    return area;
  }

  function bestPacking(group, state, Nesting) {
    if (!Nesting) throw new Error('Nestingmodule ontbreekt.');
    var items = group.pieces.map(nestingItem);
    var cacheKey = JSON.stringify([items, state.sheetWidth, state.sheetHeight, state.edge, state.gap, state.materialMode]);
    var candidates = layoutCache.get(cacheKey);
    if (!candidates) {
      candidates = [];
      [0, 1, 2].forEach(function (strategyIndex) {
        var options = { strategyIndex: strategyIndex, materialMode: 'full_plate' };
        var packing = items.length === 1
          ? Nesting.packSinglePattern(items[0], state.sheetWidth, state.sheetHeight, state.edge, state.gap, options)
          : Nesting.packMixedSmart(items, state.sheetWidth, state.sheetHeight, state.edge, state.gap, options);
        if (!packing.notFit || !packing.notFit.length) {
          candidates.push({
            packing: packing,
            sheetWidth: state.sheetWidth,
            sheetHeight: state.sheetHeight,
            areaMm2: chargedAreaForPacking(packing, state.sheetWidth, state.sheetHeight, state.edge, state.materialMode)
          });
        }

        var rotated = items.length === 1
          ? Nesting.packSinglePattern(items[0], state.sheetHeight, state.sheetWidth, state.edge, state.gap, options)
          : Nesting.packMixedSmart(items, state.sheetHeight, state.sheetWidth, state.edge, state.gap, options);
        if (!rotated.notFit || !rotated.notFit.length) {
          candidates.push({
            packing: rotated,
            sheetWidth: state.sheetHeight,
            sheetHeight: state.sheetWidth,
            rotatedSheet: true,
            areaMm2: chargedAreaForPacking(rotated, state.sheetHeight, state.sheetWidth, state.edge, state.materialMode)
          });
        }
      });
      candidates.sort(function (a, b) { return a.areaMm2 - b.areaMm2; });
      var seen = new Set();
      candidates = candidates.filter(function (candidate) {
        var signature = JSON.stringify([candidate.sheetWidth, candidate.sheetHeight, candidate.packing.plates.map(function (plate) {
          return plate.placed.map(function (p) { return [p.itemIndex, p.x, p.y, p.rotation || 0]; }).sort(function (a, b) {
            return a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];
          });
        })]);
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });
      if (layoutCache.size > 40) layoutCache.clear();
      layoutCache.set(cacheKey, candidates);
    }
    if (!candidates.length) return null;
    var choice = (state.layoutChoices || {})[group.key];
    var selectedIndex = choice && choice.key === cacheKey ? Math.max(0, Math.min(candidates.length - 1, Math.floor(positive(choice.index)))) : 0;
    return Object.assign({}, candidates[selectedIndex], {
      optionIndex: selectedIndex, optionCount: candidates.length, selectionKey: cacheKey,
      bestAreaMm2: candidates[0].areaMm2
    });
  }

  function costFromMode(setting, count) {
    setting = setting || {};
    if (setting.mode === 'minutes') {
      return count * positive(setting.value) / 60 * positive(setting.hourlyRate);
    }
    return count * positive(setting.value);
  }

  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function pieceCostSettings(scenario, piece) {
    var override = (scenario.pieceCosts || {})[piece.id] || {};
    return {
      processCost: Object.assign({}, scenario.processCosts[piece.process], override.mode === 'custom' ? override.processCost : null),
      holeCost: Object.assign({}, scenario.holeCost, override.mode === 'custom' ? override.holeCost : null)
    };
  }

  function calculate(state, Nesting) {
    state = normalizeState(state);
    var groups = ensureRates(state);
    var quantity = state.pieces.reduce(function (sum, piece) { return sum + positive(piece.quantity); }, 0);
    var holes = state.pieces.reduce(function (sum, piece) {
      return sum + positive(piece.quantity) * positive(piece.holes);
    }, 0);
    function groupLayouts(settings) {
      return groups.map(function (group) {
      var packed = !errors.length && settings.sheetWidth > 0 && settings.sheetHeight > 0 ? bestPacking(group, settings, Nesting) : null;
      return {
        key: group.key,
        material: group.material,
        thickness: group.thickness,
        quantity: group.pieces.reduce(function (sum, piece) { return sum + positive(piece.quantity); }, 0),
        areaMm2: packed ? packed.areaMm2 : 0,
        plateCount: packed && packed.packing && packed.packing.plates ? packed.packing.plates.length : 0,
        rotatedSheet: !!(packed && packed.rotatedSheet),
        layout: packed,
        pieces: group.pieces,
        pieceNumbers: group.pieces.map(function (piece) { return state.pieces.indexOf(piece) + 1; }),
        fits: !!packed
      };
      });
    }
    var errors = [];

    state.pieces.forEach(function (piece, index) {
      var w = piece.shape === 'circle' ? piece.outerDiameter : piece.width;
      var h = piece.shape === 'circle' ? piece.outerDiameter : piece.height;
      if (!(w > 0 && h > 0 && piece.thickness > 0)) errors.push('Stuk ' + (index + 1) + ': vul positieve buitenmaten en dikte in.');
      if (!Number.isInteger(piece.quantity) || piece.quantity < 1) errors.push('Stuk ' + (index + 1) + ': vul een geheel aantal van minimaal 1 in.');
      if (!Number.isInteger(piece.holes)) errors.push('Stuk ' + (index + 1) + ': het aantal gaten moet een geheel getal zijn.');
      if (piece.opening === 'circle' && !(piece.innerDiameter > 0 && piece.innerDiameter < Math.min(w, h))) {
        errors.push('Stuk ' + (index + 1) + ': het middengat moet kleiner zijn dan de buitenmaat.');
      }
      if (piece.opening === 'rect' && !(piece.innerWidth > 0 && piece.innerHeight > 0 && piece.innerWidth < w && piece.innerHeight < h)) {
        errors.push('Stuk ' + (index + 1) + ': de binnenmaten moeten positief en kleiner dan de buitenmaten zijn.');
      }
    });

    var scenarios = state.scenarios.map(function (scenario) {
      var toEuro = exchangeFactor(scenario);
      var quoted = scenario.costSource !== 'calculated';
      var settings = Object.assign({}, state, { sheetWidth: scenario.sheetWidth, sheetHeight: scenario.sheetHeight, layoutChoices: scenario.layoutChoices });
      var groupResults = groupLayouts(settings);
      var sheetAreaM2 = scenario.sheetWidth * scenario.sheetHeight / 1000000;
      var scenarioErrors = errors.length ? errors.slice() : (quoted ? [] : groupResults.filter(function (group) { return !group.fits; })).map(function (group) {
        return group.material + ' ' + group.thickness + ' mm past niet op de plaat van ' + scenario.name + '.';
      });
      var missingPrices = (quoted ? [] : groupResults.filter(function (group) { return !(Number(scenario.rates[group.key].price) > 0); })).map(function (group) {
        return group.material + ' ' + group.thickness + ' mm';
      });
      if (scenario.costSource === 'quote_total' && !(scenario.quotedTotal > 0)) missingPrices.push('offertetotaal');
      if (scenario.costSource === 'quote_per_piece') state.pieces.forEach(function (piece, index) {
        if (!(scenario.quotedUnitPrices[piece.id] > 0)) missingPrices.push('offerteprijs ' + (piece.name || 'stuk ' + (index + 1)));
      });
      if (!toEuro) scenarioErrors.push('Vul bij ' + scenario.name + ' een positieve wisselkoers in: 1 EUR = hoeveel ' + scenario.currency + '?');
      var directLines = state.pieces.map(function (piece) {
        var group = groupResults.find(function (g) { return g.key === groupKey(piece); });
        var rate = scenario.rates[group.key];
        var pricePerM2 = rate.unit === 'sheet' ? (sheetAreaM2 > 0 ? positive(rate.price) / sheetAreaM2 : 0) : positive(rate.price);
        function weight(p) { var item = nestingItem(p); return item.outerW * item.outerH * p.quantity; }
        var totalWeight = group.pieces.reduce(function (sum, p) { return sum + weight(p); }, 0);
        var material = !quoted && totalWeight > 0 ? group.areaMm2 / 1000000 * pricePerM2 * toEuro * weight(piece) / totalWeight : 0;
        var costs = pieceCostSettings(scenario, piece);
        var own = costs.holeCost.performedBy === 'own';
        var processIncluded = quoted && quoteSetting(scenario, piece, 'process') !== 'extra';
        var supplierHolesIncluded = quoted && quoteSetting(scenario, piece, 'holes') !== 'extra';
        var process = processIncluded ? 0 : costFromMode(costs.processCost, piece.quantity) * toEuro;
        var hole = supplierHolesIncluded && !own ? 0
          : costFromMode(costs.holeCost, piece.quantity * piece.holes) * (own ? 1 : toEuro);
        var quote = scenario.costSource === 'quote_total' ? (quantity > 0 ? scenario.quotedTotal * toEuro * piece.quantity / quantity : 0)
          : scenario.costSource === 'quote_per_piece' ? scenario.quotedUnitPrices[piece.id] * toEuro * piece.quantity : 0;
        return { material: material, process: process, hole: hole, ownHole: own ? hole : 0, quote: quote,
          direct: material + process + hole + quote, supplier: material + process + (own ? 0 : hole) + quote };
      });
      function sumDirect(key) { return directLines.reduce(function (sum, line) { return sum + line[key]; }, 0); }
      var materialCost = sumDirect('material');
      var processCost = sumDirect('process');
      var holeCost = sumDirect('hole');
      var ownHoleCost = sumDirect('ownHole');
      var quoteCost = sumDirect('quote');
      var goodsCost = sumDirect('supplier');
      var directTotal = sumDirect('direct');
      var transport = positive(scenario.transport) * toEuro;
      var duty = (goodsCost + transport) * positive(scenario.dutyPct) / 100;
      var other = positive(scenario.other) * toEuro;
      var landedCost = goodsCost + ownHoleCost + transport + duty + other;
      var pricing = scenario.pricing || { mode: 'marginPct', value: state.marginPct };
      var salePrice = pricing.mode === 'salePerPiece' ? positive(pricing.value) * quantity
        : pricing.mode === 'marginPerPiece' ? Math.max(0, landedCost + number(pricing.value, 0) * quantity)
        : pricing.mode === 'salePrice' ? positive(pricing.value)
        : pricing.mode === 'marginEuro' ? Math.max(0, landedCost + number(pricing.value, 0))
        : landedCost / (1 - Math.min(99.9, number(pricing.value, state.marginPct)) / 100);
      var actualMargin = salePrice > 0 ? (salePrice - landedCost) / salePrice * 100 : 0;
      var intendedSalePrice = salePrice;
      var lines = state.pieces.map(function (piece, index) {
        var line = directLines[index];
        var share = directTotal > 0 ? line.direct / directTotal : quantity > 0 ? piece.quantity / quantity : 0;
        var lineDuty = (line.supplier + transport * share) * positive(scenario.dutyPct) / 100;
        var cost = line.direct + (transport + other) * share + lineDuty;
        var sale = landedCost > 0 ? salePrice * cost / landedCost : salePrice * share;
        var lineIntent = (scenario.linePricing || {})[piece.id];
        if (lineIntent) {
          if (lineIntent.mode === 'salePerPiece') sale = positive(lineIntent.value) * piece.quantity;
          else if (lineIntent.mode === 'marginPerPiece') sale = Math.max(0, cost + number(lineIntent.value, 0) * piece.quantity);
          else if (lineIntent.mode === 'marginPct') sale = cost / (1 - Math.min(99.9, number(lineIntent.value, 0)) / 100);
        }
        var unitSale = piece.quantity > 0 ? roundMoney(sale / piece.quantity) : 0;
        sale = roundMoney(unitSale * piece.quantity);
        return { index: index + 1, quantity: piece.quantity, thickness: piece.thickness, material: piece.material,
          materialCost: line.material, workCost: line.process + line.hole, quoteCost: line.quote, cost: cost,
          salePerPiece: unitSale, salePrice: sale, marginEuro: sale - cost,
          marginPct: sale > 0 ? (sale - cost) / sale * 100 : 0 };
      });
      salePrice = roundMoney(lines.reduce(function (sum, line) { return sum + line.salePrice; }, 0));
      actualMargin = salePrice > 0 ? (salePrice - landedCost) / salePrice * 100 : 0;
      return {
        id: scenario.id,
        name: scenario.name,
        costSource: scenario.costSource,
        quoteCost: quoteCost,
        roundingDifference: salePrice - intendedSalePrice,
        groups: groupResults,
        errors: scenarioErrors,
        priceComplete: missingPrices.length === 0,
        missingPrices: missingPrices,
        sheetWidth: scenario.sheetWidth,
        sheetHeight: scenario.sheetHeight,
        materialCost: materialCost,
        processCost: processCost,
        holeCost: holeCost,
        ownHoleCost: ownHoleCost,
        transport: transport,
        duty: duty,
        other: other,
        landedCost: landedCost,
        costPerPiece: quantity > 0 ? landedCost / quantity : 0,
        salePrice: salePrice,
        marginEuro: salePrice - landedCost,
        marginPct: actualMargin,
        lines: lines
      };
    });

    return { state: state, groups: scenarios[0].groups, scenarios: scenarios, quantity: quantity, holes: holes, errors: errors };
  }

  function utf8ToBase64Url(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function base64UrlToUtf8(value) {
    var base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    var binary = atob(base64);
    var bytes = Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
    return new TextDecoder().decode(bytes);
  }

  function encodeState(state) {
    return utf8ToBase64Url(JSON.stringify(normalizeState(state)));
  }

  function decodeState(value) {
    return normalizeState(JSON.parse(base64UrlToUtf8(value)));
  }

  function parseReadableUrl(search) {
    var params = new URLSearchParams(search || '');
    if (!Array.from(params.keys()).length) return null;
    var state = defaultState();
    state.process = params.get('process') === 'mill' ? 'mill' : 'saw';
    state.materialMode = params.get('material_mode') || state.materialMode;
    state.sheetWidth = number(params.get('sheet_w'), state.sheetWidth);
    state.sheetHeight = number(params.get('sheet_h'), state.sheetHeight);
    state.marginPct = number(params.get('margin'), state.marginPct);
    state.gap = number(params.get('gap'), state.gap);
    state.pieces = [];
    state.scenarios = [];

    for (var i = 1; i <= 50; i++) {
      var prefix = 'piece' + i + '_';
      if (!params.has(prefix + 'quantity') && !params.has(prefix + 'width') && !params.has(prefix + 'outer_diameter')) break;
      var piece = newPiece(params.get(prefix + 'process') || state.process);
      piece.name = params.get(prefix + 'name') || '';
      piece.material = params.get(prefix + 'material') || '';
      piece.thickness = number(params.get(prefix + 'thickness'), 0);
      piece.quantity = number(params.get(prefix + 'quantity'), 1);
      piece.shape = params.get(prefix + 'shape') || (piece.process === 'saw' ? 'rect' : 'circle');
      piece.width = number(params.get(prefix + 'width'), 0);
      piece.height = number(params.get(prefix + 'height'), 0);
      piece.outerDiameter = number(params.get(prefix + 'outer_diameter'), 0);
      piece.innerDiameter = number(params.get(prefix + 'inner_diameter'), 0);
      piece.innerWidth = number(params.get(prefix + 'inner_width'), 0);
      piece.innerHeight = number(params.get(prefix + 'inner_height'), 0);
      piece.cornerRadius = number(params.get(prefix + 'corner_radius'), 0);
      piece.innerRadius = number(params.get(prefix + 'inner_radius'), 0);
      piece.opening = params.get(prefix + 'opening') || (piece.innerDiameter > 0 ? 'circle' : piece.innerWidth > 0 ? 'rect' : 'none');
      piece.holes = number(params.get(prefix + 'holes'), 0);
      piece.holeDiameter = number(params.get(prefix + 'hole_diameter'), 0);
      state.pieces.push(piece);
    }
    if (!state.pieces.length) state.pieces = [newPiece(state.process)];

    for (var s = 1; s <= 20; s++) {
      var sp = 'supplier' + s + '_';
      if (!Array.from(params.keys()).some(function (key) { return key.indexOf(sp) === 0; })) break;
      var scenario = newScenario(params.get(sp + 'name') || ('Leverancier ' + s), state.process);
      scenario.currency = (params.get(sp + 'currency') || 'EUR').toUpperCase();
      scenario.exchangeRate = params.has(sp + 'exchange_rate') ? number(params.get(sp + 'exchange_rate'), 0)
        : (scenario.currency === 'EUR' ? 1 : referenceExchangeRates[scenario.currency] || 0);
      scenario.sheetWidth = number(params.get(sp + 'sheet_w'), state.sheetWidth);
      scenario.sheetHeight = number(params.get(sp + 'sheet_h'), state.sheetHeight);
      scenario.processCost.mode = params.get(sp + 'process_mode') === 'minutes' ? 'minutes' : 'per_piece';
      scenario.processCost.value = number(params.get(sp + 'process_price'), 0);
      scenario.processCost.hourlyRate = number(params.get(sp + 'hourly_rate'), 75);
      scenario.quoteProcess = params.get(sp + 'quote_process') || 'included';
      scenario.quoteHoles = params.get(sp + 'quote_holes') || 'included';
      scenario.processCosts = {};
      ['saw', 'mill'].forEach(function (process) {
        if (params.has(sp + process + '_price')) scenario.processCosts[process] = {
          mode: params.get(sp + process + '_mode') === 'minutes' ? 'minutes' : 'per_piece',
          value: number(params.get(sp + process + '_price'), 0),
          hourlyRate: number(params.get(sp + process + '_hourly_rate'), 75)
        };
      });
      scenario.holeCost.mode = params.get(sp + 'hole_mode') === 'minutes' ? 'minutes' : 'per_hole';
      scenario.holeCost.value = number(params.get(sp + 'hole_price'), 0);
      scenario.holeCost.hourlyRate = number(params.get(sp + 'hole_hourly_rate'), 75);
      scenario.holeCost.performedBy = params.get(sp + 'holes_by') === 'own' ? 'own' : 'supplier';
      scenario.transport = number(params.get(sp + 'transport'), 0);
      scenario.dutyPct = number(params.get(sp + 'duty'), 0);
      scenario.other = number(params.get(sp + 'other'), 0);
      scenario.costSource = params.get(sp + 'cost_source') || 'calculated';
      scenario.quotedTotal = number(params.get(sp + 'quoted_total'), 0);
      state.pieces.forEach(function (piece, pieceIndex) {
        var pp = sp + 'piece' + (pieceIndex + 1) + '_';
        scenario.quotedUnitPrices[piece.id] = number(params.get(pp + 'quote_price'), 0);
        if (params.has(pp + 'process_price') || params.has(pp + 'hole_price') || params.has(pp + 'holes_by') ||
          params.has(pp + 'quote_process') || params.has(pp + 'quote_holes')) {
          var hasCustomRates = params.has(pp + 'process_price') || params.has(pp + 'hole_price') || params.has(pp + 'holes_by');
          var custom = { mode: hasCustomRates ? 'custom' : 'default' };
          if (params.has(pp + 'quote_process')) custom.quoteProcessOverride = params.get(pp + 'quote_process');
          if (params.has(pp + 'quote_holes')) custom.quoteHolesOverride = params.get(pp + 'quote_holes');
          if (params.has(pp + 'process_price')) custom.processCost = {
            mode: params.get(pp + 'process_mode') === 'minutes' ? 'minutes' : 'per_piece',
            value: number(params.get(pp + 'process_price'), 0), hourlyRate: number(params.get(pp + 'process_hourly_rate'), 75)
          };
          if (params.has(pp + 'hole_price') || params.has(pp + 'holes_by')) custom.holeCost = Object.assign({}, scenario.holeCost, {
            performedBy: params.get(pp + 'holes_by') || scenario.holeCost.performedBy,
            mode: params.get(pp + 'hole_mode') || scenario.holeCost.mode,
            value: params.has(pp + 'hole_price') ? number(params.get(pp + 'hole_price'), 0) : scenario.holeCost.value,
            hourlyRate: params.has(pp + 'hole_hourly_rate') ? number(params.get(pp + 'hole_hourly_rate'), 75) : scenario.holeCost.hourlyRate
          });
          scenario.pieceCosts[piece.id] = custom;
        }
      });
      state.scenarios.push(scenario);
    }
    if (!state.scenarios.length) state.scenarios = [newScenario('Leverancier 1', state.process)];
    state = normalizeState(state);
    var groups = ensureRates(state);
    state.scenarios.forEach(function (scenario, index) {
      var sp = 'supplier' + (index + 1) + '_';
      groups.forEach(function (group, groupIndex) {
        var numbered = sp + 'rate' + (groupIndex + 1) + '_';
        var simplePrice = params.get(sp + 'material_price');
        scenario.rates[group.key] = {
          unit: params.get(numbered + 'unit') || params.get(sp + 'material_unit') || 'm2',
          price: number(params.get(numbered + 'price') || simplePrice, 0)
        };
      });
    });
    return state;
  }

  global.QuoteCalculatorCore = {
    referenceExchangeRates: referenceExchangeRates,
    exchangeFactor: exchangeFactor,
    pieceCostSettings: pieceCostSettings,
    roundMoney: roundMoney,
    defaultState: defaultState,
    newPiece: newPiece,
    newScenario: newScenario,
    normalizeState: normalizeState,
    ensureRates: ensureRates,
    materialGroups: materialGroups,
    calculate: calculate,
    encodeState: encodeState,
    decodeState: decodeState,
    parseReadableUrl: parseReadableUrl,
    groupKey: groupKey,
    chargedRect: chargedRect,
    colorFor: colorFor,
    nextColorIndex: nextColorIndex
  };
})(window);
