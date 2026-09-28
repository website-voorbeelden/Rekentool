(function (global) {
  'use strict';

  var MAX_QUANTITY = 2000;
  var COLORS = ['#2563eb', '#c2410c', '#7c3aed', '#0f766e', '#be185d', '#475569'];

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function gcd(a, b) {
    while (b) { var remainder = a % b; a = b; b = remainder; }
    return a;
  }

  function samples(current, maximum) {
    var counts = [];
    function add(value) {
      var count = Math.max(1, Math.min(maximum, Math.round(value)));
      if (counts.indexOf(count) < 0) counts.push(count);
    }
    [0.25, 0.5, 0.75, 1, 1.5, 2, 3].forEach(function (factor) { add(current * factor); });
    var target = Math.min(7, maximum);
    while (counts.length < target) {
      counts.sort(function (a, b) { return a - b; });
      var largestGap = 1, midpoint = null;
      for (var i = 1; i < counts.length; i += 1) {
        var gap = counts[i] - counts[i - 1];
        if (gap > largestGap) { largestGap = gap; midpoint = Math.floor((counts[i] + counts[i - 1]) / 2); }
      }
      if (midpoint != null) add(midpoint);
      else if (counts[counts.length - 1] < maximum) add(counts[counts.length - 1] + 1);
      else if (counts[0] > 1) add(counts[0] - 1);
      else break;
    }
    return counts.sort(function (a, b) { return a - b; });
  }

  function completeRates(scenario, groups) {
    return groups.every(function (group) {
      var price = Number(String(((scenario.rates || {})[group.key] || {}).price || 0).replace(',', '.'));
      return Number.isFinite(price) && price > 0;
    });
  }

  function build(input, Core, Nesting) {
    var state = Core.normalizeState(input);
    var quantities = state.pieces.map(function (piece) { return piece.quantity; });
    if (quantities.some(function (quantity) { return !Number.isSafeInteger(quantity) || quantity < 1; })) {
      return { status: 'unavailable', reason: 'Vul voor ieder stuk een geheel aantal van minimaal 1 in.' };
    }
    var currentQuantity = quantities.reduce(function (sum, value) { return sum + value; }, 0);
    var mixed = quantities.length > 1;
    var model = {
      status: 'unavailable', reason: '', currentQuantity: currentQuantity,
      mixed: mixed, maxQuantity: MAX_QUANTITY, series: [], omitted: [], sampleQuantities: [],
      xLabel: 'Aantal stukken', yLabel: mixed ? 'Gemiddelde kostprijs per stuk (€)' : 'Kostprijs per stuk (€)'
    };
    if (!Number.isSafeInteger(currentQuantity) || currentQuantity > MAX_QUANTITY) {
      model.reason = 'De hoeveelheidsgrafiek is beschikbaar voor aanvragen tot ' + MAX_QUANTITY.toLocaleString('nl-NL') + ' stukken. Je huidige aanvraag bevat ' + currentQuantity.toLocaleString('nl-NL') + ' stukken.';
      return model;
    }
    var currentBundles = quantities.reduce(gcd);
    var bundleQuantities = quantities.map(function (quantity) { return quantity / currentBundles; });
    var bundleQuantity = currentQuantity / currentBundles;
    var maximumBundles = Math.floor(MAX_QUANTITY / bundleQuantity);
    var bundleCounts = samples(currentBundles, maximumBundles);
    model.bundleQuantity = bundleQuantity;
    model.ratio = bundleQuantities.join(' : ');
    model.sampleQuantities = bundleCounts.map(function (count) { return count * bundleQuantity; });
    model.rangeLimited = maximumBundles < Math.max(7, currentBundles * 3);
    if (bundleCounts.length < 2) {
      model.reason = 'Voor deze aantalsverhouding past maar één meetpunt binnen de grens van ' + MAX_QUANTITY.toLocaleString('nl-NL') + ' stukken. Een hoeveelheidsgrafiek zou daardoor geen vergelijking geven.';
      return model;
    }
    var groups = Core.materialGroups(state);
    var completeScenarios = state.scenarios.filter(function (scenario) {
      if (Core.exchangeFactor && !Core.exchangeFactor(scenario)) {
        model.omitted.push({ id: scenario.id, name: scenario.name, reason: 'wisselkoers ontbreekt' });
        return false;
      }
      if (scenario.costSource === 'quote_total') {
        model.omitted.push({ id: scenario.id, name: scenario.name, reason: 'een totaalofferte geldt alleen voor het ingevulde aantal' });
        return false;
      }
      if (scenario.costSource === 'quote_per_piece') {
        if (state.pieces.every(function (piece) { return scenario.quotedUnitPrices[piece.id] > 0; })) return true;
        model.omitted.push({ id: scenario.id, name: scenario.name, reason: 'offerteprijs ontbreekt' });
        return false;
      }
      if (completeRates(scenario, groups)) return true;
      model.omitted.push({ id: scenario.id, name: scenario.name, reason: 'materiaalprijs ontbreekt' });
      return false;
    });
    if (!completeScenarios.length) {
      model.reason = 'Voor andere aantallen zijn materiaalprijzen of offerteprijzen per stuk nodig, met een geldige wisselkoers. Een totaalofferte geldt alleen voor het ingevulde aantal.';
      return model;
    }
    state.scenarios = completeScenarios;
    var byId = {};
    state.scenarios.forEach(function (scenario, index) {
      byId[scenario.id] = { id: scenario.id, name: scenario.name, color: Core.colorFor ? Core.colorFor(scenario, 'supplier') : COLORS[index % COLORS.length], points: [] };
    });
    bundleCounts.forEach(function (count) {
      var sample = JSON.parse(JSON.stringify(state));
      sample.pieces.forEach(function (piece, index) { piece.quantity = bundleQuantities[index] * count; });
      // The current point matches the quote; other quantities get a fresh layout.
      if (count !== currentBundles) sample.scenarios.forEach(function (scenario) { scenario.layoutChoices = {}; });
      var result = Core.calculate(sample, Nesting);
      result.scenarios.forEach(function (scenario) {
        var series = byId[scenario.id];
        if (!series) return;
        if ((scenario.errors || []).length || scenario.priceComplete === false || !Number.isFinite(scenario.costPerPiece)) {
          series.invalid = scenario.priceComplete === false ? 'prijs ontbreekt' : 'geen geldige berekening';
        } else series.points.push({ quantity: result.quantity, costPerPiece: scenario.costPerPiece });
      });
    });
    state.scenarios.forEach(function (scenario) {
      var series = byId[scenario.id];
      if (series.invalid || series.points.length !== bundleCounts.length) {
        model.omitted.push({ id: series.id, name: series.name, reason: series.invalid || 'berekening niet beschikbaar' });
      } else model.series.push(series);
    });
    if (!model.series.length) {
      model.reason = 'Er is nog geen leverancier met volledige materiaalprijzen en een passende plaatindeling.';
      return model;
    }
    model.status = 'ready';
    return model;
  }

  function niceMaximum(value) {
    if (!(value > 0)) return 1;
    var step = value / 4;
    var power = Math.pow(10, Math.floor(Math.log10(step)));
    var roundedStep = Math.ceil(step / power) * power;
    return Math.ceil(value / roundedStep) * roundedStep;
  }

  function render(model) {
    if (!model || model.status !== 'ready') return '<p class="qcalc__hint">' + escape(model && model.reason || 'De grafiek is nog niet beschikbaar.') + '</p>';
    var width = 760, height = 330;
    var left = 78, right = 25, top = 32, bottom = 66;
    var plotWidth = width - left - right, plotHeight = height - top - bottom;
    var minX = model.sampleQuantities[0], maxX = model.sampleQuantities[model.sampleQuantities.length - 1];
    var maxCost = 0;
    model.series.forEach(function (series) { series.points.forEach(function (point) { maxCost = Math.max(maxCost, point.costPerPiece); }); });
    var maxY = niceMaximum(maxCost);
    function x(value) { return left + (value - minX) / (maxX - minX) * plotWidth; }
    function y(value) { return top + plotHeight - value / maxY * plotHeight; }
    function number(value) { return value.toLocaleString('nl-NL', { maximumFractionDigits: 0 }); }
    function euro(value) { return value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }); }
    function coord(value) { return value.toFixed(2); }
    var svg = '<svg class="qcalc__lineChart" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="' + escape(model.yLabel + ' bij verschillende aantallen') + '" xmlns="http://www.w3.org/2000/svg">';
    svg += '<title>' + escape(model.yLabel + ' bij verschillende aantallen') + '</title><desc>Elke lijn is een leverancier. De stippen zijn afzonderlijk berekende aantallen; tussenliggende aantallen kunnen afwijken. De stippellijn geeft het huidige aantal aan.</desc>';
    for (var tick = 0; tick <= 4; tick += 1) {
      var value = maxY * tick / 4, py = y(value);
      svg += '<line x1="' + left + '" x2="' + (width - right) + '" y1="' + coord(py) + '" y2="' + coord(py) + '" stroke="#e2e8f0" />';
      svg += '<text x="' + (left - 10) + '" y="' + coord(py + 4) + '" text-anchor="end" fill="#475569" font-size="12">' + escape(euro(value)) + '</text>';
    }
    model.sampleQuantities.forEach(function (quantity) {
      svg += '<text x="' + coord(x(quantity)) + '" y="' + (height - bottom + 23) + '" text-anchor="middle" fill="#475569" font-size="12">' + number(quantity) + '</text>';
    });
    var currentX = x(model.currentQuantity);
    svg += '<line x1="' + coord(currentX) + '" x2="' + coord(currentX) + '" y1="' + top + '" y2="' + (height - bottom) + '" stroke="#64748b" stroke-dasharray="4 5" />';
    svg += '<text x="' + coord(currentX) + '" y="19" text-anchor="' + (currentX > width - 120 ? 'end' : currentX < 140 ? 'start' : 'middle') + '" fill="#475569" font-size="12">Nu: ' + number(model.currentQuantity) + '</text>';
    model.series.forEach(function (series) {
      var path = series.points.map(function (point, index) { return (index ? 'L' : 'M') + coord(x(point.quantity)) + ',' + coord(y(point.costPerPiece)); }).join(' ');
      svg += '<path d="' + path + '" fill="none" stroke="' + series.color + '" stroke-width="2.5" stroke-linejoin="round" />';
      series.points.forEach(function (point) {
        var label = series.name + ': ' + number(point.quantity) + ' stukken, ' + euro(point.costPerPiece) + ' per stuk';
        svg += '<circle cx="' + coord(x(point.quantity)) + '" cy="' + coord(y(point.costPerPiece)) + '" r="4" fill="' + series.color + '" stroke="white" stroke-width="1.5" tabindex="0" role="img" aria-label="' + escape(label) + '"><title>' + escape(label) + '</title></circle>';
      });
    });
    svg += '<text x="' + left + '" y="19" fill="#475569" font-size="12">€/stuk</text><text x="' + (left + plotWidth / 2) + '" y="' + (height - 15) + '" text-anchor="middle" fill="#475569" font-size="13">Aantal stukken</text></svg>';
    var legend = '<div class="qcalc__chartLegend">' + model.series.map(function (series) {
      return '<span><i aria-hidden="true" style="background:' + series.color + '"></i>' + escape(series.name) + '</span>';
    }).join('') + '</div>';
    var note = 'Berekend voor ' + number(minX) + '–' + number(maxX) + ' stukken. De lijnen verbinden meetpunten; tussenliggende aantallen kunnen afwijken. Tarieven blijven gelijk, zonder staffelkorting. Transport en overige vaste kosten blijven per aanvraag gelijk. Het huidige aantal gebruikt jouw gekozen indeling; andere aantallen worden automatisch ingedeeld.';
    if (model.mixed) note += ' Gemiddelde kostprijs over alle stukken; de aantalsverhouding ' + model.ratio + ' blijft gelijk (bundels van ' + number(model.bundleQuantity) + ' stukken).';
    if (model.rangeLimited) note += ' Het bereik is begrensd op maximaal ' + number(model.maxQuantity) + ' stukken per meetpunt.';
    var omitted = model.omitted.length ? '<p class="qcalc__hint">Niet getoond: ' + model.omitted.map(function (supplier) { return escape(supplier.name + ' (' + supplier.reason + ')'); }).join(', ') + '.</p>' : '';
    return '<div class="qcalc__chartWrap">' + legend + svg + '<details class="qcalc__chartExplanation"><summary>Hoe wordt de grafiek berekend?</summary><p class="qcalc__hint">' + escape(note) + '</p></details>' + omitted + '</div>';
  }

  global.QuoteCalculatorChart = { build: build, render: render };
})(typeof window === 'undefined' ? self : window);
