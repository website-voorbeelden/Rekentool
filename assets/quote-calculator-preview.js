(function () {
  'use strict';
  var colors = ['#237c57', '#c29319', '#487ec0', '#9664b7', '#c96e33', '#238d93'];
  function pieceColor(piece, number) {
    return window.QuoteCalculatorCore ? window.QuoteCalculatorCore.colorFor(piece, 'piece') : colors[(number - 1) % colors.length];
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rect(x, y, w, h, radius, fill) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="' + radius + '" fill="' + fill + '"/>';
  }
  function circle(x, y, radius, fill) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" fill="' + fill + '"/>';
  }
  function roundedRectDistance(x, y, w, h, radius) {
    radius = Math.max(0, Math.min(radius || 0, w / 2, h / 2));
    var dx = Math.abs(x) - w / 2 + radius;
    var dy = Math.abs(y) - h / 2 + radius;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
  }
  function extraHolePositions(piece) {
    var count = Math.min(Math.max(0, Math.floor(piece.holes || 0)), 200);
    var r = Math.max(0, piece.holeDiameter / 2 || 0);
    var w = piece.width, h = piece.height;
    if (piece.shape === 'circle') {
      return Array.from({ length: count }, function (_, i) {
        var angle = 2 * Math.PI * i / piece.holes - Math.PI / 2;
        var radius = (piece.outerDiameter + piece.innerDiameter) / 4;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      });
    }
    if (!count || !(w > 0 && h > 0)) return [];
    var outerRadius = piece.shape === 'manhole' ? Math.min(w, h) / 2 : piece.cornerRadius;
    function inMaterial(point) {
      if (roundedRectDistance(point.x, point.y, w, h, outerRadius) > -r + 1e-7) return false;
      if (piece.opening === 'circle' && piece.innerDiameter > 0) {
        return Math.hypot(point.x, point.y) >= piece.innerDiameter / 2 + r - 1e-7;
      }
      if (piece.opening === 'rect' && piece.innerWidth > 0 && piece.innerHeight > 0) {
        var innerRadius = piece.shape === 'manhole' ? Math.min(piece.innerWidth, piece.innerHeight) / 2 : piece.innerRadius;
        return roundedRectDistance(point.x, point.y, piece.innerWidth, piece.innerHeight, innerRadius) >= r - 1e-7;
      }
      return true;
    }
    function grid(columns, rows, amount, inset) {
      var spanX = w - 2 * Math.max(r, w * inset);
      var spanY = h - 2 * Math.max(r, h * inset);
      if (spanX < 0 || spanY < 0 || (columns > 1 && spanX / (columns - 1) < 2 * r) ||
          (rows > 1 && spanY / (rows - 1) < 2 * r)) return [];
      var points = [];
      for (var row = 0; row < rows; row++) {
        var rowCount = Math.min(columns, Math.ceil(amount / rows) - (row >= amount % rows && amount % rows ? 1 : 0));
        for (var col = 0; col < rowCount; col++) {
          points.push({ x: columns === 1 ? 0 : (col - (rowCount - 1) / 2) * spanX / (columns - 1),
            y: rows === 1 ? 0 : (row / (rows - 1) - .5) * spanY });
        }
      }
      return points;
    }
    var columns = Math.max(1, Math.min(count, Math.ceil(Math.sqrt(count * w / h))));
    var rows = Math.ceil(count / columns);
    var regular = grid(columns, rows, count, .15);
    if (regular.length === count && regular.every(inMaterial)) return regular;
    // Openings and rounded edges may remove grid positions. Try denser, complete grids
    // and keep evenly spread material positions rather than drawing holes in empty space.
    var best = regular.filter(inMaterial);
    if (!best.length && inMaterial({ x: 0, y: 0 })) best = [{ x: 0, y: 0 }];
    for (var step = 0; step < 24; step++) {
      var scale = 1 + step * .12;
      var cols = Math.max(1, Math.min(60, Math.ceil(Math.sqrt(count * w / h) * scale)));
      var lines = Math.max(1, Math.min(60, Math.ceil(Math.sqrt(count * h / w) * scale)));
      var candidate = grid(cols, lines, cols * lines, .04).filter(inMaterial);
      if (candidate.length >= count) {
        return Array.from({ length: count }, function (_, i) { return candidate[Math.floor(i * candidate.length / count)]; });
      }
      if (candidate.length > best.length) best = candidate;
    }
    return best;
  }
  function pieceSvg(placed, piece, number, maskId) {
    var round = piece.shape === 'circle';
    var w = round ? piece.outerDiameter : piece.width;
    var h = round ? piece.outerDiameter : piece.height;
    var radius = piece.shape === 'manhole' ? Math.min(w, h) / 2 : Math.min(piece.cornerRadius, w / 2, h / 2);
    var outer = round ? circle(0, 0, w / 2, 'white') : rect(-w / 2, -h / 2, w, h, radius, 'white');
    var holes = '';
    if (round && piece.innerDiameter > 0) holes += circle(0, 0, piece.innerDiameter / 2, 'black');
    if (!round && piece.opening === 'circle' && piece.innerDiameter > 0) holes += circle(0, 0, piece.innerDiameter / 2, 'black');
    if (!round && piece.opening === 'rect' && piece.innerWidth > 0 && piece.innerHeight > 0) {
      holes += rect(-piece.innerWidth / 2, -piece.innerHeight / 2, piece.innerWidth, piece.innerHeight,
        piece.shape === 'manhole' ? Math.min(piece.innerWidth, piece.innerHeight) / 2 : (piece.innerRadius || 0), 'black');
    }
    // Hole positions are illustrative; only count and diameter are specified in the calculator.
    var holeRadius = piece.holeDiameter / 2;
    extraHolePositions(piece).forEach(function (point) { holes += circle(point.x, point.y, holeRadius, 'black'); });
    var color = pieceColor(piece, number);
    return '<g transform="translate(' + placed.x + ' ' + placed.y + ') rotate(' + (placed.rotation || 0) + ')">' +
      '<defs><mask id="' + maskId + '" maskUnits="userSpaceOnUse" x="' + (-w / 2) + '" y="' + (-h / 2) +
      '" width="' + w + '" height="' + h + '">' + outer + holes + '</mask></defs>' +
      '<g mask="url(#' + maskId + ')">' + rect(-w / 2, -h / 2, w, h, 0, color) + '</g></g>';
  }
  function renderGroup(group, groupIndex, state, page, scenario) {
    if (!group.layout) return '<article class="qcalc__plateGroup"><h3>' + esc(group.material) + ' · ' + group.thickness +
      ' mm</h3><p>Geen passende plaatindeling voor deze maten.</p></article>';
    var layout = group.layout;
    var plates = layout.packing.plates;
    page = Math.max(0, Math.min(page || 0, plates.length - 1));
    var plate = plates[page];
    var W = layout.sheetWidth;
    var H = layout.sheetHeight;
    var rate = scenario.rates[group.key] || { price: 0, unit: 'm2' };
    var perM2 = rate.unit === 'sheet' ? Number(rate.price) / (scenario.sheetWidth * scenario.sheetHeight / 1000000) : Number(rate.price);
    perM2 *= window.QuoteCalculatorCore.exchangeFactor(scenario);
    if (scenario.costSource !== 'calculated') perM2 = 0;
    var extraCost = (layout.areaMm2 - layout.bestAreaMm2) / 1000000 * perM2;
    function money(value) { return value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }); }
    var pad = Math.max(W, H) * 0.055;
    var charged = window.QuoteCalculatorCore.chargedRect(plate, W, H, state.edge, state.materialMode);
    var modes = { full_plate: 'Volledige plaat', used_strip: 'Gebruikte plaatstrook', compact_box: 'Compact gebruikt vlak' };
    var svg = rect(0, 0, W, H, 0, '#f0f1f0') +
      '<rect x="' + charged.x + '" y="' + charged.y + '" width="' + charged.width + '" height="' + charged.height +
      '" fill="#ddeafe" stroke="#3b76c5" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="7 5"/>';
    plate.placed.forEach(function (placed, index) {
      svg += pieceSvg(placed, group.pieces[placed.itemIndex], group.pieceNumbers[placed.itemIndex], 'q-mask-' + groupIndex + '-' + index);
    });
    svg += '<rect width="' + W + '" height="' + H + '" fill="none" stroke="#66756b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      '<g fill="#52635a" font-family="sans-serif" font-size="' + pad * 0.38 + '"><text x="' + W / 2 + '" y="' + (-pad * 0.3) +
      '" text-anchor="middle">' + W + ' mm</text><text transform="translate(' + (-pad * 0.35) + ' ' + H / 2 + ') rotate(-90)" text-anchor="middle">' + H + ' mm</text></g>';
    var legend = group.pieces.map(function (piece, index) {
      var n = group.pieceNumbers[index];
      return '<span><i style="background:' + pieceColor(piece, n) + '"></i>' + esc(String(piece.name || '').trim() || 'Stuk ' + n) + ' · ' + piece.quantity + ' st.</span>';
    }).join('');
    return '<article class="qcalc__plateGroup"><header><h3>' + esc(group.material) + ' · ' + group.thickness + ' mm</h3>' +
      '<div class="qcalc__plateNav"><button type="button" class="qcalc__button" data-plate-group="' + groupIndex + '" data-plate-page="' + (page - 1) +
      '"' + (page === 0 ? ' disabled' : '') + ' aria-label="Vorige plaat">←</button><span>Plaat ' + (page + 1) + ' van ' + plates.length +
      '</span><button type="button" class="qcalc__button" data-plate-group="' + groupIndex + '" data-plate-page="' + (page + 1) +
      '"' + (page === plates.length - 1 ? ' disabled' : '') + ' aria-label="Volgende plaat">→</button></div></header>' +
      '<div class="qcalc__layoutControls"><button type="button" class="qcalc__button qcalc__button--secondary" data-layout-next="' + groupIndex + '"' +
      (layout.optionCount < 2 ? ' disabled' : '') + '>Opnieuw indelen</button>' +
      (layout.optionIndex > 0 ? '<button type="button" class="qcalc__textBtn" data-layout-best="' + groupIndex + '">Voordeligste indeling</button>' : '') +
      '<span>Indeling ' + (layout.optionIndex + 1) + ' van ' + layout.optionCount + ' · ' + group.plateCount + ' platen · ' +
      (layout.areaMm2 / 1000000).toLocaleString('nl-NL', { maximumFractionDigits: 3 }) + ' m²' +
      (perM2 > 0 ? ' · materiaal ' + money(layout.areaMm2 / 1000000 * perM2) : '') +
      (extraCost > .005 ? ' · ' + money(extraCost) + ' meer materiaal dan de voordeligste indeling' : '') + '</span></div>' +
      '<svg class="qcalc__plateSvg" role="img" aria-label="Plaatindeling ' + esc(group.material) + ' ' + group.thickness + ' mm, plaat ' + (page + 1) +
      '" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (W + 2 * pad) + ' ' + (H + 2 * pad) + '">' + svg + '</svg>' +
      '<div class="qcalc__plateLegend">' + legend + '<span><i class="qcalc__chargedKey"></i>Blauw: ' + (scenario.costSource === 'calculated' ? 'meegerekend materiaal' : 'geselecteerd materiaalvlak') + '</span>' +
      '<span><i style="background:#f0f1f0"></i>Grijs: ' + (scenario.costSource === 'calculated' ? 'niet meegerekend' : 'resterend plaatvlak') + '</span></div>' +
      (scenario.costSource !== 'calculated' ? '<p class="qcalc__hint">Deze indeling is illustratief. De ingevoerde offerteprijs verandert niet door de plaatindeling.</p>' : '') +
      '<p>' + modes[state.materialMode] + ' · ' + (charged.width * charged.height / 1000000).toLocaleString('nl-NL', { maximumFractionDigits: 3 }) +
      ' m² op deze plaat · ' + plate.placed.length + ' stukken</p></article>';
  }
  window.QuoteCalculatorPreview = {
    renderPiece: function (piece, index) {
      var w = piece.shape === 'circle' ? piece.outerDiameter : piece.width;
      var h = piece.shape === 'circle' ? piece.outerDiameter : piece.height;
      if (!(w > 0 && h > 0)) return '<p>Vul de buitenmaten in voor een voorbeeld.</p>';
      var pad = Math.max(w, h) * .16;
      var visibleHoles = extraHolePositions(piece).length;
      var holeCaption = visibleHoles < piece.holes ? visibleHoles + ' van ' + piece.holes + ' gaten zichtbaar · posities schematisch' : 'Vormvoorbeeld · gaten schematisch';
      return '<figure class="qcalc__pieceFigure"><svg role="img" aria-label="Vormvoorbeeld ' + esc(String(piece.name || '').trim() || 'stuk ' + (index + 1)) + '" viewBox="' +
        (-w / 2 - pad) + ' ' + (-h / 2 - pad) + ' ' + (w + 2 * pad) + ' ' + (h + 2 * pad) + '">' +
        pieceSvg({ x: 0, y: 0 }, piece, index + 1, 'piece-preview-' + index) +
        '<text text-anchor="middle" x="0" y="' + (h / 2 + pad * .75) + '" font-size="' + pad * .4 + '" fill="#52635a">' +
        (piece.shape === 'circle' ? 'Ø ' + w : w + ' × ' + h) + ' mm</text></svg><figcaption>' + holeCaption + '</figcaption></figure>';
    },
    render: function (calculation, pages) {
      return '<div id="plaatpreview"><p class="qcalc__plateIntro">De gebruikte indeling en het meegerekende materiaalvlak. Gatposities zijn schematisch.</p>' +
        calculation.groups.map(function (group, index) { return renderGroup(group, index, calculation.state, pages[index], calculation.state.scenarios[calculation.selectedScenario || 0]); }).join('') + '</div>';
    }
  };
})();
