window.GasketConfiguratorCore = (function () {
  'use strict';

  function number(value, fallback) {
    var parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampMarginPct(value) {
    return clamp(number(value, 0), -1000, 99.9);
  }

  function salePriceForMargin(cost, marginPct) {
    cost = Math.max(0, number(cost, 0));
    marginPct = clampMarginPct(marginPct);
    return cost / (1 - marginPct / 100);
  }

  function grossMarginPct(cost, salePrice) {
    cost = Math.max(0, number(cost, 0));
    salePrice = Math.max(0, number(salePrice, 0));
    if (!(salePrice > 0)) return 0;
    return ((salePrice - cost) / salePrice) * 100;
  }

  function resolveSalePrice(cost, configuredMarginPct, minimumOrder, intent) {
    cost = Math.max(0, number(cost, 0));
    minimumOrder = Math.max(0, number(minimumOrder, 0));

    if (intent && intent.mode === 'salePrice') {
      return Math.max(0, number(intent.value, cost));
    }

    if (intent && intent.mode === 'marginEuro') {
      return Math.max(0, cost + number(intent.value, 0));
    }

    if (intent && intent.mode === 'marginPct') {
      return salePriceForMargin(cost, intent.value);
    }

    return Math.max(salePriceForMargin(cost, configuredMarginPct), minimumOrder);
  }

  function allocateItemCosts(lines, placements, materialCost, sharedMinutes, hourRate) {
    lines = Array.isArray(lines) ? lines : [];
    placements = Array.isArray(placements) ? placements : [];
    materialCost = Math.max(0, number(materialCost, 0));
    sharedMinutes = Math.max(0, number(sharedMinutes, 0));
    hourRate = Math.max(0, number(hourRate, 0));

    var topLevelCounts = lines.map(function () { return 0; });

    placements.forEach(function (piece) {
      var itemIndex = Math.floor(number(piece && piece.itemIndex, -1));
      if (itemIndex < 0 || itemIndex >= topLevelCounts.length) return;
      if (!piece.placedInHole) topLevelCounts[itemIndex]++;
    });

    var hasPlacementData = placements.length > 0;
    var materialWeights = lines.map(function (line, index) {
      var count = hasPlacementData
        ? topLevelCounts[index]
        : Math.max(0, number(line.qty, 0));
      return Math.max(0, number(line.outerArea, 0)) * count;
    });
    var materialWeightTotal = materialWeights.reduce(function (sum, weight) {
      return sum + weight;
    }, 0);

    if (!(materialWeightTotal > 0)) {
      materialWeights = lines.map(function (line) {
        return Math.max(0, number(line.qty, 0));
      });
      materialWeightTotal = materialWeights.reduce(function (sum, weight) {
        return sum + weight;
      }, 0);
    }

    var sharedWeights = lines.map(function (line) {
      return Math.max(0, number(line.directMinutes, 0));
    });
    var sharedWeightTotal = sharedWeights.reduce(function (sum, weight) {
      return sum + weight;
    }, 0);

    if (!(sharedWeightTotal > 0)) {
      sharedWeights = lines.map(function (line) {
        return Math.max(0, number(line.qty, 0));
      });
      sharedWeightTotal = sharedWeights.reduce(function (sum, weight) {
        return sum + weight;
      }, 0);
    }

    return lines.map(function (line, index) {
      var allocatedMaterial = materialWeightTotal > 0
        ? materialCost * materialWeights[index] / materialWeightTotal
        : 0;
      var allocatedSharedMinutes = sharedWeightTotal > 0
        ? sharedMinutes * sharedWeights[index] / sharedWeightTotal
        : 0;
      var directMinutes = Math.max(0, number(line.directMinutes, 0));

      return {
        materialCost: allocatedMaterial,
        sharedMinutes: allocatedSharedMinutes,
        laborCost: ((directMinutes + allocatedSharedMinutes) / 60) * hourRate
      };
    });
  }

  function roundedRectEntities(width, height, radius) {
    width = Math.max(0, number(width, 0));
    height = Math.max(0, number(height, 0));
    radius = clamp(number(radius, 0), 0, Math.min(width, height) / 2);

    if (!(width > 0) || !(height > 0)) return [];

    var halfW = width / 2;
    var halfH = height / 2;
    var entities = [];

    function pushLine(x1, y1, x2, y2) {
      if (Math.abs(x2 - x1) < 0.000001 && Math.abs(y2 - y1) < 0.000001) return;
      entities.push({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2 });
    }

    if (!(radius > 0)) {
      pushLine(-halfW, halfH, halfW, halfH);
      pushLine(halfW, halfH, halfW, -halfH);
      pushLine(halfW, -halfH, -halfW, -halfH);
      pushLine(-halfW, -halfH, -halfW, halfH);
      return entities;
    }

    pushLine(-halfW + radius, halfH, halfW - radius, halfH);
    pushLine(halfW, halfH - radius, halfW, -halfH + radius);
    pushLine(halfW - radius, -halfH, -halfW + radius, -halfH);
    pushLine(-halfW, -halfH + radius, -halfW, halfH - radius);

    entities.push({ type: 'arc', cx: halfW - radius, cy: halfH - radius, r: radius, startAngle: 0, endAngle: 90 });
    entities.push({ type: 'arc', cx: -halfW + radius, cy: halfH - radius, r: radius, startAngle: 90, endAngle: 180 });
    entities.push({ type: 'arc', cx: -halfW + radius, cy: -halfH + radius, r: radius, startAngle: 180, endAngle: 270 });
    entities.push({ type: 'arc', cx: halfW - radius, cy: -halfH + radius, r: radius, startAngle: 270, endAngle: 360 });

    return entities;
  }

  return {
    clampMarginPct: clampMarginPct,
    salePriceForMargin: salePriceForMargin,
    grossMarginPct: grossMarginPct,
    resolveSalePrice: resolveSalePrice,
    allocateItemCosts: allocateItemCosts,
    roundedRectEntities: roundedRectEntities
  };
})();
