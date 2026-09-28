window.GasketConfiguratorDrawing = (function () {
  var COLORS = [
    { fill: 'rgba(18,140,76,.78)', stroke: 'rgba(18,100,56,.95)', name: 'Groen' },
    { fill: 'rgba(232,185,35,.82)', stroke: 'rgba(156,118,0,.95)', name: 'Geel' },
    { fill: 'rgba(52,116,212,.76)', stroke: 'rgba(25,76,155,.95)', name: 'Blauw' },
    { fill: 'rgba(150,84,196,.76)', stroke: 'rgba(103,48,150,.95)', name: 'Paars' },
    { fill: 'rgba(230,116,44,.78)', stroke: 'rgba(165,71,18,.95)', name: 'Oranje' },
    { fill: 'rgba(30,160,150,.76)', stroke: 'rgba(10,100,92,.95)', name: 'Turquoise' }
  ];

  function getColor(index) {
    return COLORS[(Math.max(1, index) - 1) % COLORS.length];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c];
    });
  }

  function fmt(n, d) {
    if (n == null || !isFinite(n)) n = 0;

    return n.toLocaleString('nl-NL', {
      minimumFractionDigits: d || 0,
      maximumFractionDigits: d || 0
    });
  }

  function drawRingHTML(p, cx, cy, scale, ghost) {
    var c = ghost
      ? { fill: 'rgba(0,0,0,.13)', stroke: 'rgba(0,0,0,.24)' }
      : getColor(p.item.index);

    var item = p.item || {};
    var shape = p.shape || item.shape || 'circle';
    var w = (p.width || item.outerW || p.od) * scale;
    var h = (p.height || item.outerH || p.od) * scale;
    var ro = p.r * scale;
    var ri = (p.id / 2) * scale;
    var outerRadius = Math.max(0, Number(item.outerRadius || 0)) * scale;
    var innerRadius = Math.max(0, Number(item.innerRadius || 0)) * scale;
    var innerShape = item.innerShape || 'circle';
    var innerW = (item.innerW || item.innerDia || item.id || 0) * scale;
    var innerH = (item.innerH || item.innerDia || item.id || 0) * scale;
    var isRotated = Number(p.rotation || 0) % 180 !== 0;
    var html = '';

    if (isRotated && shape !== 'circle') {
      var originalInnerW = innerW;
      innerW = innerH;
      innerH = originalInnerW;
    }

    if (shape === 'circle') {
      html +=
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        ro +
        '" fill="' +
        c.fill +
        '" stroke="' +
        c.stroke +
        '" stroke-width="1" />';
    } else {
      html +=
        '<rect x="' +
        (cx - w / 2) +
        '" y="' +
        (cy - h / 2) +
        '" width="' +
        w +
        '" height="' +
        h +
        '" rx="' +
        outerRadius +
        '" fill="' +
        c.fill +
        '" stroke="' +
        c.stroke +
        '" stroke-width="1" />';
    }

    if (shape === 'circle' && item.hasCenterHole !== false && ri > 0) {
      html +=
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        ri +
        '" fill="#fff" stroke="' +
        c.stroke +
        '" stroke-width="1" />';
    }

    if (shape !== 'circle' && item.hasCenterHole !== false) {
      if (innerShape !== 'circle' && innerW > 0 && innerH > 0) {
        html +=
          '<rect x="' +
          (cx - innerW / 2) +
          '" y="' +
          (cy - innerH / 2) +
          '" width="' +
          innerW +
          '" height="' +
          innerH +
          '" rx="' +
          innerRadius +
          '" fill="#fff" stroke="' +
          c.stroke +
          '" stroke-width="1" />';
      } else if (innerW > 0) {
        html +=
          '<circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          (innerW / 2) +
          '" fill="#fff" stroke="' +
          c.stroke +
          '" stroke-width="1" />';
      }
    }

    var holeCenters = item.holeCenters || [];
    var rotationRad = isRotated ? Math.PI / 2 : 0;

    holeCenters.forEach(function (hole) {
      var hx = hole.x;
      var hy = hole.y;

      if (rotationRad) {
        var rotatedX = -hy;
        hy = hx;
        hx = rotatedX;
      }

      html +=
        '<circle cx="' +
        (cx + hx * scale) +
        '" cy="' +
        (cy + hy * scale) +
        '" r="' +
        (hole.r * scale) +
        '" fill="#fff" stroke="' +
        c.stroke +
        '" stroke-width=".8" />';
    });

    if (p.placedInHole) {
      if (shape === 'circle') {
        html +=
          '<circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          (ro + 4) +
          '" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-dasharray="5 5" />';
      } else {
        html +=
          '<rect x="' +
          (cx - w / 2 - 4) +
          '" y="' +
          (cy - h / 2 - 4) +
          '" width="' +
          (w + 8) +
          '" height="' +
          (h + 8) +
          '" rx="' +
          (outerRadius + 4) +
          '" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-dasharray="5 5" />';
      }
    }

    return html;
  }

  function drawWasteRectsHTML(analysis, ox, oy, scale) {
    var html = '';

    if (!analysis || !analysis.wasteRects || !analysis.wasteRects.length) {
      return html;
    }

    analysis.wasteRects.forEach(function (r) {
      if (!(r.width > 0) || !(r.height > 0)) return;

      html +=
        '<rect x="' +
        (ox + r.x * scale) +
        '" y="' +
        (oy + r.y * scale) +
        '" width="' +
        r.width * scale +
        '" height="' +
        r.height * scale +
        '" fill="rgba(220,35,35,.16)" stroke="rgba(190,0,0,.72)" stroke-width="2" stroke-dasharray="8 5" />';
    });

    return html;
  }

  function drawRowLinesHTML(analysis, ox, oy, scale) {
    var html = '';

    if (!analysis || !analysis.rowLines || !analysis.rowLines.length) {
      return html;
    }

    analysis.rowLines.forEach(function (ln) {
      html +=
        '<line x1="' +
        (ox + ln.x1 * scale) +
        '" y1="' +
        (oy + ln.y1 * scale) +
        '" x2="' +
        (ox + ln.x2 * scale) +
        '" y2="' +
        (oy + ln.y2 * scale) +
        '" stroke="rgba(0,0,0,.32)" stroke-width="1.5" stroke-dasharray="6 6" />';
    });

    return html;
  }

  function drawBlueStripHTML(strip, ox, oy, scale) {
    if (!strip || !(strip.areaMm2 > 0)) return '';

    return (
      '<rect x="' +
      (ox + strip.minX * scale) +
      '" y="' +
      (oy + strip.minY * scale) +
      '" width="' +
      strip.width * scale +
      '" height="' +
      strip.height * scale +
      '" fill="rgba(40,100,255,.08)" stroke="rgba(40,100,255,.65)" stroke-width="2" stroke-dasharray="7 7" />'
    );
  }

  function getPlateAnalysis(plate, W, H, edge, nestingApi) {
    if (plate && plate.analysis) return plate.analysis;

    if (nestingApi && typeof nestingApi.analyzePlate === 'function') {
      return nestingApi.analyzePlate(plate ? plate.placed : [], W, H, edge, 0);
    }

    return {
      strip: nestingApi && typeof nestingApi.usedStripFromPlaced === 'function'
        ? nestingApi.usedStripFromPlaced(plate ? plate.placed : [], W, H, edge)
        : null,
      wasteRects: [],
      rowLines: []
    };
  }

  function drawPlateBlock(svgWidth, blockHeight, W, H, plate, title, yOffset, showGhosts, edge, nestingApi) {
    var PAD = 55;
    var scale = Math.min((svgWidth - PAD * 2) / W, (blockHeight - PAD * 2 - 70) / H);
    var pw = W * scale;
    var ph = H * scale;
    var ox = (svgWidth - pw) / 2;
    var oy = yOffset + 62;
    var analysis = getPlateAnalysis(plate, W, H, edge, nestingApi);
    var strip = analysis && analysis.strip ? analysis.strip : null;
    var html = '';

    html +=
      '<text x="' +
      ox +
      '" y="' +
      (yOffset + 28) +
      '" font-size="19" font-weight="700" fill="rgba(0,0,0,.78)">' +
      esc(title) +
      '</text>';

    html +=
      '<text x="' +
      ox +
      '" y="' +
      (yOffset + 50) +
      '" font-size="13" fill="rgba(0,0,0,.58)">Plaat ' +
      fmt(W, 0) +
      ' × ' +
      fmt(H, 0) +
      ' mm • rood = waarschijnlijk onbruikbare reststukken</text>';

    html +=
      '<rect x="' +
      ox +
      '" y="' +
      oy +
      '" width="' +
      pw +
      '" height="' +
      ph +
      '" fill="#fafafa" stroke="rgba(0,0,0,.38)" stroke-width="2" />';

    // Eerst blauw, daarna rood erbovenop, daarna lijnen en pakkingen.
    html += drawBlueStripHTML(strip, ox, oy, scale);
    html += drawWasteRectsHTML(analysis, ox, oy, scale);
    html += drawRowLinesHTML(analysis, ox, oy, scale);

    if (showGhosts && plate.ghostPositions && plate.placed[0]) {
      var ghostBase = plate.placed[0];

      plate.ghostPositions.slice(0, 900).forEach(function (gp) {
        var g = Object.assign({}, ghostBase, {
          x: gp.x,
          y: gp.y
        });

        html += drawRingHTML(g, ox + g.x * scale, oy + g.y * scale, scale, true);
      });
    }

    plate.placed.forEach(function (p) {
      html += drawRingHTML(p, ox + p.x * scale, oy + p.y * scale, scale, false);
    });

    return html;
  }

  function drawLegend(items, y, showGhosts) {
    var html = '';
    var x = 55;

    items.forEach(function (it) {
      var c = getColor(it.index);
      var shape = it.shape || 'circle';

      if (shape === 'circle') {
        html +=
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="8" fill="' +
          c.fill +
          '" stroke="' +
          c.stroke +
          '" stroke-width="1" />';
      } else if (shape === 'manhole') {
        html +=
          '<rect x="' +
          (x - 13) +
          '" y="' +
          (y - 7) +
          '" width="26" height="14" rx="7" fill="' +
          c.fill +
          '" stroke="' +
          c.stroke +
          '" stroke-width="1" />';
      } else {
        html +=
          '<rect x="' +
          (x - 9) +
          '" y="' +
          (y - 9) +
          '" width="18" height="18" rx="3" fill="' +
          c.fill +
          '" stroke="' +
          c.stroke +
          '" stroke-width="1" />';
      }

      html +=
        '<text x="' +
        (x + 15) +
        '" y="' +
        (y + 5) +
        '" font-size="14" fill="rgba(0,0,0,.65)">Pakking ' +
        it.index +
        '</text>';

      x += 118;
    });

    if (showGhosts) {
      html +=
        '<circle cx="' +
        x +
        '" cy="' +
        y +
        '" r="8" fill="rgba(0,0,0,.13)" stroke="rgba(0,0,0,.24)" stroke-width="1" />';

      html +=
        '<text x="' +
        (x + 15) +
        '" y="' +
        (y + 5) +
        '" font-size="14" fill="rgba(0,0,0,.65)">Vrije positie</text>';

      x += 142;
    }

    html +=
      '<rect x="' +
      x +
      '" y="' +
      (y - 9) +
      '" width="18" height="18" fill="rgba(40,100,255,.08)" stroke="rgba(40,100,255,.65)" stroke-width="2" stroke-dasharray="7 7" />';

    html +=
      '<text x="' +
      (x + 27) +
      '" y="' +
      (y + 5) +
      '" font-size="14" fill="rgba(0,0,0,.65)">Blauw = gebruikte strook</text>';

    x += 230;

    html +=
      '<rect x="' +
      x +
      '" y="' +
      (y - 9) +
      '" width="18" height="18" fill="rgba(220,35,35,.16)" stroke="rgba(190,0,0,.72)" stroke-width="2" stroke-dasharray="8 5" />';

    html +=
      '<text x="' +
      (x + 27) +
      '" y="' +
      (y + 5) +
      '" font-size="14" fill="rgba(0,0,0,.65)">Rood = onbruikbare rest</text>';

    return html;
  }

  function drawNest(nestSvg, W, H, packing, items, edge, nestingApi, options) {
    if (!nestSvg || !packing || !packing.plates || !packing.plates.length) return;

    options = options || {};

    var plates = packing.plates.filter(function (pl) {
      return pl.placed && pl.placed.length;
    });

    if (!plates.length) return;

    var svgWidth = 1000;
    var blockHeight = 720;
    var plateIndex = Math.max(0, Math.min(plates.length - 1, Math.floor(Number(options.plateIndex || 0))));
    var plate = plates[plateIndex];
    var height = blockHeight + 72;

    nestSvg.setAttribute('viewBox', '0 0 ' + svgWidth + ' ' + height);

    var html =
      '<rect x="0" y="0" width="' +
      svgWidth +
      '" height="' +
      height +
      '" fill="#fff" />';

    html += drawPlateBlock(
      svgWidth,
      blockHeight,
      W,
      H,
      plate,
      plates.length > 1 ? 'Plaat ' + (plateIndex + 1) + ' van ' + plates.length : 'Plaatindeling',
      0,
      false,
      edge,
      nestingApi
    );

    html += drawLegend(items, height - 30, false);

    nestSvg.innerHTML = html;
  }

  return {
    COLORS: COLORS,
    getColor: getColor,
    drawNest: drawNest
  };
})();
