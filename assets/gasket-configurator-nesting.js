window.GasketConfiguratorNesting = (function () {
  function num(v, fallback) {
    var n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }

  function dist(a, x, y) {
    var dx = x - a.x;
    var dy = y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function isCirclePiece(piece) {
    return (piece && (piece.shape || 'circle')) === 'circle';
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function pieceCornerRadius(piece) {
    if (!piece) return 0;
    if (isCirclePiece(piece)) return Math.min(piece.halfW, piece.halfH);

    return clamp(
      num(piece.cornerRadius, 0),
      0,
      Math.min(piece.halfW, piece.halfH)
    );
  }

  function piecesOverlap(a, ax, ay, b, bx, by, gap) {
    var eps = 0.001;
    gap = Math.max(0, gap || 0);
    var radiusA = pieceCornerRadius(a);
    var radiusB = pieceCornerRadius(b);
    var coreHalfWA = Math.max(0, a.halfW - radiusA);
    var coreHalfHA = Math.max(0, a.halfH - radiusA);
    var coreHalfWB = Math.max(0, b.halfW - radiusB);
    var coreHalfHB = Math.max(0, b.halfH - radiusB);
    var separationX = Math.abs(ax - bx) - (coreHalfWA + coreHalfWB);
    var separationY = Math.abs(ay - by) - (coreHalfHA + coreHalfHB);

    if (separationX < -eps && separationY < -eps) return true;

    var outsideX = Math.max(0, separationX);
    var outsideY = Math.max(0, separationY);
    var coreDistance = Math.sqrt(outsideX * outsideX + outsideY * outsideY);

    return coreDistance < radiusA + radiusB + gap - eps;
  }

  function orientedPiece(piece, rotation) {
    var rotated = rotation === 90;
    var copy = {};

    Object.keys(piece).forEach(function (key) {
      copy[key] = piece[key];
    });

    copy.rotation = rotated ? 90 : 0;
    copy.width = rotated ? piece.height : piece.width;
    copy.height = rotated ? piece.width : piece.height;
    copy.halfW = copy.width / 2;
    copy.halfH = copy.height / 2;

    return copy;
  }

  function orientationVariants(piece) {
    var variants = [orientedPiece(piece, 0)];

    if (!isCirclePiece(piece) && Math.abs(piece.width - piece.height) > 0.001) {
      variants.push(orientedPiece(piece, 90));
    }

    return variants;
  }

  function normalizeOptions(options) {
    options = options || {};

    var materialMode = options.materialMode || options.remainderMode || 'full_plate';

    if (materialMode === 'charge') materialMode = 'full_plate';
    if (materialMode === 'discard') materialMode = 'used_strip';

    return {
      materialMode: materialMode,
      wasteThresholdPct: Math.max(0, num(options.wasteThresholdPct, 30)),
      forceBottomRemainderWaste: materialMode === 'used_strip',
      markBottomRemainder: options.markBottomRemainder !== false,
      strategyIndex: Math.max(0, Math.floor(num(options.strategyIndex, 0))) % 3,
      fastThreshold: Math.max(80, Math.floor(num(options.fastThreshold, 220))),
      candidateLimit: Math.max(80, Math.floor(num(options.candidateLimit, 420)))
    };
  }

  function interleavePieceTypes(pieces) {
    var groups = [];
    var groupByItem = {};

    pieces.forEach(function (piece) {
      var key = String(piece.itemIndex);
      var group = groupByItem[key];

      if (!group) {
        group = { pieces: [], cursor: 0 };
        groupByItem[key] = group;
        groups.push(group);
      }

      group.pieces.push(piece);
    });

    if (groups.length < 2) return pieces;

    var mixed = [];
    var remaining = pieces.length;
    var cursor = 0;

    while (remaining > 0) {
      var group = groups[cursor % groups.length];

      if (group.cursor < group.pieces.length) {
        mixed.push(group.pieces[group.cursor]);
        group.cursor++;
        remaining--;
      }

      cursor++;
    }

    return mixed;
  }

  function expandPieces(items, strategyIndex, candidateLimit) {
    var pieces = [];

    items.forEach(function (it, itemIndex) {
      var qty = Math.max(0, Math.floor(num(it.qty, 0)));
      var od = num(it.od, 0);
      var id = num(it.id, 0);
      var width = num(it.outerW, od);
      var height = num(it.outerH, od);
      var cornerRadius = (it.shape || 'circle') === 'circle'
        ? od / 2
        : clamp(num(it.outerRadius, 0), 0, Math.min(width, height) / 2);

      for (var i = 0; i < qty; i++) {
        pieces.push({
          item: it,
          itemIndex: itemIndex,
          shape: it.shape || 'circle',
          od: od,
          r: od / 2,
          width: width,
          height: height,
          halfW: width / 2,
          halfH: height / 2,
          cornerRadius: cornerRadius,
          rotation: 0,
          id: id,
          innerR: (it.shape || 'circle') === 'circle' ? id / 2 : 0,
          pcd: num(it.pcd, 0),
          holes: Math.max(0, Math.floor(num(it.holes, 0))),
          holeDia: num(it.holeDia, 0),
          x: 0,
          y: 0,
          placedInHole: false
        });
      }
    });

    pieces.sort(function (a, b) {
      var aMax = Math.max(a.width, a.height);
      var bMax = Math.max(b.width, b.height);
      var aArea = a.width * a.height;
      var bArea = b.width * b.height;

      if (strategyIndex === 1) {
        if (bArea !== aArea) return bArea - aArea;
        if (b.height !== a.height) return b.height - a.height;
      } else if (strategyIndex === 2) {
        if (b.width !== a.width) return b.width - a.width;
        if (bArea !== aArea) return bArea - aArea;
      } else {
        if (bMax !== aMax) return bMax - aMax;
        if (bArea !== aArea) return bArea - aArea;
      }

      return a.itemIndex - b.itemIndex;
    });

    if (strategyIndex === 0) {
      pieces = interleavePieceTypes(pieces);
    }

    pieces.forEach(function (piece) {
      piece.searchLimit = candidateLimit;
    });

    return pieces;
  }

  function createPlate() {
    return { placed: [] };
  }

  function pieceFitsPlate(piece, W, H, edge) {
    if (!piece || !(piece.width > 0) || !(piece.height > 0)) return false;

    return (
      piece.width + edge * 2 <= W + 0.001 &&
      piece.height + edge * 2 <= H + 0.001
    );
  }

  function pieceFitsAnyOrientation(piece, W, H, edge) {
    return orientationVariants(piece).some(function (variant) {
      return pieceFitsPlate(variant, W, H, edge);
    });
  }

  function isInsideHostHole(host, piece, x, y, gap) {
    if (!host || !(host.innerR > 0)) return false;
    if (!isCirclePiece(host) || !isCirclePiece(piece)) return false;
    return dist(host, x, y) + piece.r + gap <= host.innerR + 0.001;
  }

  function findHostHole(plate, piece, x, y, gap) {
    for (var i = 0; i < plate.placed.length; i++) {
      var host = plate.placed[i];
      if (isInsideHostHole(host, piece, x, y, gap)) return host;
    }

    return null;
  }

  function canPlaceAt(plate, piece, x, y, W, H, edge, gap) {
    var eps = 0.001;

    if (!pieceFitsPlate(piece, W, H, edge)) return false;

    if (x - piece.halfW < edge - eps) return false;
    if (x + piece.halfW > W - edge + eps) return false;
    if (y - piece.halfH < edge - eps) return false;
    if (y + piece.halfH > H - edge + eps) return false;

    var hostHole = findHostHole(plate, piece, x, y, gap);

    for (var i = 0; i < plate.placed.length; i++) {
      var other = plate.placed[i];

      if (hostHole === other) continue;

      if (piecesOverlap(other, other.x, other.y, piece, x, y, gap)) {
        return false;
      }
    }

    return true;
  }

  function pushCandidate(out, seen, x, y, score, inHole) {
    var key = Math.round(x * 10) + ':' + Math.round(y * 10);
    if (seen[key]) return;

    seen[key] = true;

    out.push({
      x: x,
      y: y,
      score: score,
      inHole: !!inHole
    });
  }

  function candidatePositions(plate, piece, W, H, edge, gap) {
    var out = [];
    var seen = {};

    var minX = edge + piece.halfW;
    var maxX = W - edge - piece.halfW;
    var minY = edge + piece.halfH;
    var maxY = H - edge - piece.halfH;

    if (minX > maxX || minY > maxY) return out;

    plate.placed.forEach(function (host) {
      if (!isCirclePiece(host) || !isCirclePiece(piece)) return;
      if (!(host.innerR > 0)) return;
      if (piece.r + gap > host.innerR + 0.001) return;

      pushCandidate(out, seen, host.x, host.y, -1000000000 + host.y * W + host.x, true);

      var ring = host.innerR - piece.r - gap;

      if (ring > 0.001) {
        for (var i = 0; i < 8; i++) {
          var a = Math.PI * 2 * i / 8;

          pushCandidate(
            out,
            seen,
            host.x + Math.cos(a) * ring,
            host.y + Math.sin(a) * ring,
            -900000000 + host.y * W + host.x,
            true
          );
        }
      }
    });

    plate.placed.forEach(function (other) {
      if (isCirclePiece(other) && isCirclePiece(piece)) {
        var touch = other.r + piece.r + gap;
        var angles = [
          0,
          Math.PI / 6,
          Math.PI / 4,
          Math.PI / 3,
          Math.PI / 2,
          2 * Math.PI / 3,
          3 * Math.PI / 4,
          5 * Math.PI / 6,
          Math.PI,
          7 * Math.PI / 6,
          5 * Math.PI / 4,
          4 * Math.PI / 3,
          3 * Math.PI / 2,
          5 * Math.PI / 3,
          7 * Math.PI / 4,
          11 * Math.PI / 6
        ];

        for (var i = 0; i < angles.length; i++) {
          var a = angles[i];

          pushCandidate(
            out,
            seen,
            other.x + Math.cos(a) * touch,
            other.y + Math.sin(a) * touch,
            other.y * W + other.x,
            false
          );
        }

        return;
      }

      var dx = other.halfW + piece.halfW + gap;
      var dy = other.halfH + piece.halfH + gap;
      var touchPoints = [
        { x: other.x + dx, y: other.y },
        { x: other.x - dx, y: other.y },
        { x: other.x, y: other.y + dy },
        { x: other.x, y: other.y - dy },
        { x: other.x + dx, y: other.y + dy },
        { x: other.x - dx, y: other.y + dy },
        { x: other.x + dx, y: other.y - dy },
        { x: other.x - dx, y: other.y - dy }
      ];

      touchPoints.forEach(function (p) {
        pushCandidate(out, seen, p.x, p.y, p.y * W + p.x, false);
      });
    });

    var stepX = piece.width + gap;
    var stepY = piece.height + gap;
    if (stepX <= 0) stepX = piece.width;
    if (stepY <= 0) stepY = piece.height;

    for (var y1 = minY; y1 <= maxY + 0.001; y1 += stepY) {
      for (var x1 = minX; x1 <= maxX + 0.001; x1 += stepX) {
        pushCandidate(out, seen, x1, y1, y1 * W + x1, false);
      }
    }

    var staggerStepX = piece.width + gap;
    var staggerStepY = (piece.height + gap) * 0.8660254038;

    if (staggerStepX > 0 && staggerStepY > 0) {
      var row = 0;

      for (var y2 = minY; y2 <= maxY + 0.001; y2 += staggerStepY) {
        var offset = row % 2 ? staggerStepX / 2 : 0;

        for (var x2 = minX + offset; x2 <= maxX + 0.001; x2 += staggerStepX) {
          pushCandidate(out, seen, x2, y2, y2 * W + x2 - 1000, false);
        }

        row++;
      }
    }

    pushCandidate(out, seen, minX, minY, minY * W + minX, false);
    pushCandidate(out, seen, maxX, minY, minY * W + maxX, false);
    pushCandidate(out, seen, minX, maxY, maxY * W + minX, false);
    pushCandidate(out, seen, maxX, maxY, maxY * W + maxX, false);

    out.sort(function (a, b) {
      if (a.inHole !== b.inHole) return a.inHole ? -1 : 1;
      if (a.score !== b.score) return a.score - b.score;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    return out;
  }

  function boundsAfterPlace(plate, piece, x, y) {
    var minX = x - piece.halfW;
    var minY = y - piece.halfH;
    var maxX = x + piece.halfW;
    var maxY = y + piece.halfH;

    plate.placed.forEach(function (p) {
      minX = Math.min(minX, p.x - p.halfW);
      minY = Math.min(minY, p.y - p.halfH);
      maxX = Math.max(maxX, p.x + p.halfW);
      maxY = Math.max(maxY, p.y + p.halfH);
    });

    return {
      width: maxX - minX,
      height: maxY - minY,
      area: Math.max(0, maxX - minX) * Math.max(0, maxY - minY)
    };
  }

  function findBestPlacementOnPlate(plate, piece, W, H, edge, gap) {
    var best = null;
    var variants = orientationVariants(piece);

    for (var vi = 0; vi < variants.length; vi++) {
      var variant = variants[vi];
      var candidates = candidatePositions(plate, variant, W, H, edge, gap);
      var validCandidates = 0;

      for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];

        if (!canPlaceAt(plate, variant, c.x, c.y, W, H, edge, gap)) continue;

        validCandidates++;

        var inHole = !!findHostHole(plate, variant, c.x, c.y, gap);
        var b = boundsAfterPlace(plate, variant, c.x, c.y);

        var score =
          b.area +
          b.height * W * 0.25 +
          c.y * W * 0.01 +
          c.x * 0.01;

        if (inHole) score -= W * H * 10;

        if (!best || score < best.score) {
          best = {
            x: c.x,
            y: c.y,
            score: score,
            inHole: inHole,
            piece: variant,
            rotation: variant.rotation || 0
          };
        }

        if (validCandidates >= Math.max(80, num(piece.searchLimit, 420))) break;
      }
    }

    return best;
  }

  function clonePieceAt(piece, x, y, inHole) {
    return {
      item: piece.item,
      itemIndex: piece.itemIndex,
      shape: piece.shape,
      od: piece.od,
      r: piece.r,
      width: piece.width,
      height: piece.height,
      halfW: piece.halfW,
      halfH: piece.halfH,
      cornerRadius: piece.cornerRadius,
      rotation: piece.rotation || 0,
      id: piece.id,
      innerR: piece.innerR,
      pcd: piece.pcd,
      holes: piece.holes,
      holeDia: piece.holeDia,
      x: x,
      y: y,
      placedInHole: !!inHole
    };
  }

  function usedStripFromPlaced(placed, W, H, edge) {
    if (!placed || !placed.length) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
        areaMm2: 0
      };
    }

    var minY = Infinity;
    var maxY = -Infinity;

    placed.forEach(function (p) {
      var halfH = Number(p.halfH || p.height / 2 || p.r || p.od / 2 || 0);

      minY = Math.min(minY, p.y - halfH - edge);
      maxY = Math.max(maxY, p.y + halfH + edge);
    });

    minY = Math.max(0, minY);
    maxY = Math.min(H, maxY);

    return {
      minX: 0,
      minY: minY,
      maxX: W,
      maxY: maxY,
      width: W,
      height: Math.max(0, maxY - minY),
      areaMm2: W * Math.max(0, maxY - minY)
    };
  }

  function makeRowsFromPlaced(placed, gap) {
    var rows = [];

    placed.forEach(function (p) {
      var halfH = Number(p.halfH || p.height / 2 || p.r || p.od / 2 || 0);
      var top = p.y - halfH;
      var bottom = p.y + halfH;
      var center = p.y;

      var bestRow = null;
      var bestDistance = Infinity;

      for (var i = 0; i < rows.length; i++) {
        var d = Math.abs(rows[i].center - center);

        if (d < bestDistance && d <= Math.max(10, halfH + gap)) {
          bestRow = rows[i];
          bestDistance = d;
        }
      }

      if (!bestRow) {
        bestRow = {
          center: center,
          minY: top,
          maxY: bottom,
          pieces: []
        };

        rows.push(bestRow);
      }

      bestRow.pieces.push(p);
      bestRow.minY = Math.min(bestRow.minY, top);
      bestRow.maxY = Math.max(bestRow.maxY, bottom);

      bestRow.center =
        bestRow.pieces.reduce(function (sum, piece) {
          return sum + piece.y;
        }, 0) / bestRow.pieces.length;
    });

    rows.sort(function (a, b) {
      return a.minY - b.minY;
    });

    return rows;
  }

  function analyzePlate(placed, W, H, edge, gap, options) {
    var opts = normalizeOptions(options);
    var strip = usedStripFromPlaced(placed, W, H, edge);
    var rows = makeRowsFromPlaced(placed || [], gap || 0);
    var wasteRects = [];
    var rowLines = [];

    if (!placed || !placed.length) {
      return {
        strip: strip,
        rows: [],
        wasteRects: [],
        rowLines: [],
        bottomRemainder: {
          x: 0,
          y: 0,
          width: W,
          height: H,
          areaMm2: W * H,
          isWaste: false,
          isCharged: false
        }
      };
    }

    rows.forEach(function (row) {
      var y1 = Math.max(0, row.minY - edge);
      var y2 = Math.min(H, row.maxY + edge);

      rowLines.push({
        x1: 0,
        y1: y1,
        x2: W,
        y2: y1,
        type: 'row-top'
      });

      rowLines.push({
        x1: 0,
        y1: y2,
        x2: W,
        y2: y2,
        type: 'row-bottom'
      });
    });

    var bottomRemainderHeight = Math.max(0, H - strip.maxY);
    var thresholdHeight = H * (opts.wasteThresholdPct / 100);

    var shouldMarkBottomRemainder =
      opts.markBottomRemainder &&
      bottomRemainderHeight > 0.001 &&
      (
        opts.forceBottomRemainderWaste ||
        bottomRemainderHeight <= thresholdHeight
      );

    var bottomRemainder = {
      x: 0,
      y: strip.maxY,
      width: W,
      height: bottomRemainderHeight,
      areaMm2: W * bottomRemainderHeight,
      isWaste: shouldMarkBottomRemainder,
      isCharged: opts.materialMode === 'full_plate'
    };

    if (shouldMarkBottomRemainder) {
      wasteRects.push({
        x: 0,
        y: strip.maxY,
        width: W,
        height: bottomRemainderHeight,
        areaMm2: W * bottomRemainderHeight,
        reason: opts.forceBottomRemainderWaste
          ? 'bottom-remainder-discarded-by-setting'
          : 'bottom-remainder-under-threshold',
        isBottomRemainder: true,
        isCharged: opts.materialMode === 'full_plate',
        materialMode: opts.materialMode
      });

      rowLines.push({
        x1: 0,
        y1: strip.maxY,
        x2: W,
        y2: strip.maxY,
        type: 'bottom-remainder-start'
      });
    }

    return {
      strip: strip,
      rows: rows,
      wasteRects: wasteRects,
      rowLines: rowLines,
      bottomRemainder: bottomRemainder
    };
  }

  function packMixedRowsFromPieces(pieces, W, H, edge, gap, options) {
    var plates = [];
    var notFit = [];

    function variantsFor(piece) {
      var variants = orientationVariants(piece);
      if (options.strategyIndex === 1) variants.reverse();
      return variants;
    }

    pieces.forEach(function (piece) {
      if (!pieceFitsAnyOrientation(piece, W, H, edge)) {
        notFit.push(piece);
        return;
      }

      var placed = false;

      for (var pi = 0; pi < plates.length && !placed; pi++) {
        var plate = plates[pi];
        var variants = variantsFor(piece);

        for (var ri = 0; ri < plate.rows.length && !placed; ri++) {
          var row = plate.rows[ri];

          for (var vi = 0; vi < variants.length; vi++) {
            var variant = variants[vi];
            if (variant.height > row.height + 0.001) continue;
            if (row.nextX + variant.width > W - edge + 0.001) continue;

            plate.placed.push(clonePieceAt(
              variant,
              row.nextX + variant.halfW,
              row.y + row.height / 2,
              false
            ));
            row.nextX += variant.width + gap;
            placed = true;
            break;
          }
        }

        if (placed) break;

        var nextY = plate.rows.length
          ? plate.rows[plate.rows.length - 1].y + plate.rows[plate.rows.length - 1].height + gap
          : edge;

        for (var nvi = 0; nvi < variants.length; nvi++) {
          var nextVariant = variants[nvi];
          if (nextY + nextVariant.height > H - edge + 0.001) continue;

          plate.rows.push({ y: nextY, height: nextVariant.height, nextX: edge + nextVariant.width + gap });
          plate.placed.push(clonePieceAt(
            nextVariant,
            edge + nextVariant.halfW,
            nextY + nextVariant.halfH,
            false
          ));
          placed = true;
          break;
        }
      }

      if (placed) return;

      var newPlate = { placed: [], rows: [] };
      var newVariants = variantsFor(piece);
      var first = null;

      for (var fvi = 0; fvi < newVariants.length; fvi++) {
        if (pieceFitsPlate(newVariants[fvi], W, H, edge)) {
          first = newVariants[fvi];
          break;
        }
      }

      if (!first) {
        notFit.push(piece);
        return;
      }

      newPlate.rows.push({ y: edge, height: first.height, nextX: edge + first.width + gap });
      newPlate.placed.push(clonePieceAt(first, edge + first.halfW, edge + first.halfH, false));
      plates.push(newPlate);
    });

    plates.forEach(function (plate) {
      delete plate.rows;
      plate.analysis = analyzePlate(plate.placed, W, H, edge, gap, options);
      plate.wasteRects = plate.analysis.wasteRects;
      plate.rowLines = plate.analysis.rowLines;
    });

    return {
      mode: 'mixed',
      strategy: 'fast-row-' + (options.strategyIndex + 1),
      plates: plates,
      notFit: notFit,
      totalPieces: pieces.length,
      usedPlateCount: plates.length,
      fastMode: true
    };
  }

  function packMixedSmart(items, W, H, edge, gap, options) {
    W = num(W, 0);
    H = num(H, 0);
    edge = Math.max(0, num(edge, 0));
    gap = Math.max(0, num(gap, 0));

    var opts = normalizeOptions(options);
    var pieces = expandPieces(items, opts.strategyIndex, opts.candidateLimit);
    var plates = [];
    var notFit = [];

    if (pieces.length > opts.fastThreshold) {
      return packMixedRowsFromPieces(pieces, W, H, edge, gap, opts);
    }

    pieces.forEach(function (piece) {
      if (!pieceFitsAnyOrientation(piece, W, H, edge)) {
        notFit.push(piece);
        return;
      }

      var best = null;

      for (var pi = 0; pi < plates.length; pi++) {
        var placement = findBestPlacementOnPlate(plates[pi], piece, W, H, edge, gap);

        if (!placement) continue;

        var score = placement.score + pi * W * H * 0.001;

        if (!best || score < best.score) {
          best = {
            plateIndex: pi,
            placement: placement,
            score: score
          };
        }
      }

      if (best) {
        plates[best.plateIndex].placed.push(
          clonePieceAt(best.placement.piece, best.placement.x, best.placement.y, best.placement.inHole)
        );

        return;
      }

      var newPlate = createPlate();
      var newPlacement = findBestPlacementOnPlate(newPlate, piece, W, H, edge, gap);

      if (!newPlacement) {
        notFit.push(piece);
        return;
      }

      newPlate.placed.push(clonePieceAt(newPlacement.piece, newPlacement.x, newPlacement.y, false));
      plates.push(newPlate);
    });

    plates.forEach(function (plate) {
      plate.analysis = analyzePlate(plate.placed, W, H, edge, gap, opts);
      plate.wasteRects = plate.analysis.wasteRects;
      plate.rowLines = plate.analysis.rowLines;
    });

    return {
      mode: 'mixed',
      strategy: 'shape-aware-' + (opts.strategyIndex + 1),
      plates: plates,
      notFit: notFit,
      totalPieces: pieces.length,
      usedPlateCount: plates.filter(function (pl) {
        return pl.placed && pl.placed.length;
      }).length
    };
  }

  function makeGrid(width, height, W, H, edge, gap) {
    var out = [];
    var halfW = width / 2;
    var halfH = height / 2;
    var stepX = width + gap;
    var stepY = height + gap;

    var minX = edge + halfW;
    var maxX = W - edge - halfW;
    var minY = edge + halfH;
    var maxY = H - edge - halfH;

    if (stepX <= 0 || stepY <= 0) return out;
    if (minX > maxX || minY > maxY) return out;

    for (var y = minY; y <= maxY + 0.001; y += stepY) {
      for (var x = minX; x <= maxX + 0.001; x += stepX) {
        out.push({ x: x, y: y });
      }
    }

    return out;
  }

  function makeStaggered(width, height, W, H, edge, gap) {
    var out = [];
    var halfW = width / 2;
    var halfH = height / 2;
    var stepX = width + gap;
    var stepY = (height + gap) * 0.8660254038;

    var minX = edge + halfW;
    var maxX = W - edge - halfW;
    var minY = edge + halfH;
    var maxY = H - edge - halfH;

    if (stepX <= 0 || stepY <= 0) return out;
    if (minX > maxX || minY > maxY) return out;

    var row = 0;

    for (var y = minY; y <= maxY + 0.001; y += stepY) {
      var offset = row % 2 ? stepX / 2 : 0;

      for (var x = minX + offset; x <= maxX + 0.001; x += stepX) {
        out.push({ x: x, y: y });
      }

      row++;
    }

    return out;
  }

  function packSinglePattern(item, W, H, edge, gap, options) {
    W = num(W, 0);
    H = num(H, 0);
    edge = Math.max(0, num(edge, 0));
    gap = Math.max(0, num(gap, 0));

    var qty = Math.max(0, Math.floor(num(item.qty, 0)));
    var od = num(item.od, 0);
    var width = num(item.outerW, od);
    var height = num(item.outerH, od);
    var shape = item.shape || 'circle';
    var cornerRadius = shape === 'circle'
      ? od / 2
      : clamp(num(item.outerRadius, 0), 0, Math.min(width, height) / 2);

    var opts = normalizeOptions(options);
    var grid = makeGrid(width, height, W, H, edge, gap);
    var rotatedGrid = shape !== 'circle' && Math.abs(width - height) > 0.001
      ? makeGrid(height, width, W, H, edge, gap)
      : [];
    var staggered = shape === 'circle'
      ? makeStaggered(width, height, W, H, edge, gap)
      : [];
    var patterns = [
      { positions: grid, name: 'Rasterpatroon', rotation: 0 },
      { positions: rotatedGrid, name: 'Gedraaid rasterpatroon', rotation: 90 },
      { positions: staggered, name: 'Versprongen patroon', rotation: 0 }
    ].filter(function (pattern) { return pattern.positions.length > 0; });

    if (shape !== 'circle' && Math.abs(width - height) > 0.001 && qty > 0) {
      var probeItem = {};
      Object.keys(item).forEach(function (key) { probeItem[key] = item[key]; });
      probeItem.qty = qty;

      var mixedProbe = packMixedSmart([probeItem], W, H, edge, gap, opts);
      var mixedPlate = mixedProbe.plates && mixedProbe.plates.length
        ? mixedProbe.plates[0]
        : null;
      var mixedPositions = mixedPlate
        ? mixedPlate.placed.map(function (piece) {
          return { x: piece.x, y: piece.y, rotation: piece.rotation || 0 };
        })
        : [];

      if (mixedPositions.length) {
        patterns.push({
          positions: mixedPositions,
          name: 'Gemengd gedraaid patroon',
          rotation: 'mixed'
        });
      }
    }

    patterns.sort(function (a, b) { return b.positions.length - a.positions.length; });

    var selectedPattern = patterns.length
      ? patterns[Math.min(opts.strategyIndex, patterns.length - 1)]
      : { positions: [], name: 'Rasterpatroon', rotation: 0 };
    var positions = selectedPattern.positions;
    var layoutName = selectedPattern.name;
    var rotation = selectedPattern.rotation;

    var perPlate = positions.length;

    if (!(width > 0) || !(height > 0) || perPlate <= 0) {
      return {
        mode: 'single',
        strategy: 'single-smart-pattern',
        plates: [],
        notFit: [{ item: item }],
        totalPieces: qty,
        usedPlateCount: 0,
        perPlate: 0,
        layout: {
          name: layoutName,
          positions: [],
          gridCount: grid.length,
          staggeredCount: staggered.length
        }
      };
    }

    var platesNeeded = Math.ceil(qty / perPlate);
    var plates = [];

    for (var pi = 0; pi < platesNeeded; pi++) {
      var remaining = qty - pi * perPlate;
      var usedCount = Math.min(perPlate, remaining);
      var placed = [];

      for (var i = 0; i < usedCount; i++) {
        var pos = positions[i];
        var pieceRotation = rotation === 'mixed' ? (pos.rotation || 0) : rotation;
        var placedWidth = pieceRotation === 90 ? height : width;
        var placedHeight = pieceRotation === 90 ? width : height;

        placed.push({
          item: item,
          itemIndex: 0,
          shape: shape,
          od: od,
          r: od / 2,
          width: placedWidth,
          height: placedHeight,
          halfW: placedWidth / 2,
          halfH: placedHeight / 2,
          cornerRadius: cornerRadius,
          rotation: pieceRotation,
          id: num(item.id, 0),
          innerR: (item.shape || 'circle') === 'circle' ? num(item.id, 0) / 2 : 0,
          pcd: num(item.pcd, 0),
          holes: Math.max(0, Math.floor(num(item.holes, 0))),
          holeDia: num(item.holeDia, 0),
          x: pos.x,
          y: pos.y,
          placedInHole: false
        });
      }

      var plate = {
        placed: placed,
        ghostPositions: [],
        usedCount: usedCount
      };

      plate.analysis = analyzePlate(plate.placed, W, H, edge, gap, opts);
      plate.wasteRects = plate.analysis.wasteRects;
      plate.rowLines = plate.analysis.rowLines;

      plates.push(plate);
    }

    return {
      mode: 'single',
      strategy: 'single-smart-pattern-bottom-remainder-aware',
      plates: plates,
      notFit: [],
      totalPieces: qty,
      usedPlateCount: plates.length,
      perPlate: perPlate,
      layout: {
        name: layoutName,
        positions: positions,
        gridCount: grid.length,
        staggeredCount: staggered.length,
        rotatedCount: rotatedGrid.length,
        rotation: rotation
      }
    };
  }

  function totalMaterialArea(packing, W, H, edge, options) {
    var opts = normalizeOptions(options);

    if (!packing || !packing.plates) {
      return {
        fullPlates: 0,
        chargedPlates: 0,
        areaMm2: 0,
        chargedAreaMm2: 0,
        discardedAreaMm2: 0,
        materialMode: opts.materialMode,
        lastStrip: usedStripFromPlaced([], W, H, edge),
        wasteRects: [],
        rowLines: []
      };
    }

    var usedPlates = packing.plates.filter(function (pl) {
      return pl.placed && pl.placed.length;
    });

    var chargedAreaMm2 = 0;
    var discardedAreaMm2 = 0;
    var allWasteRects = [];
    var allRowLines = [];
    var plateAreaMm2 = Math.max(0, W * H);

    usedPlates.forEach(function (plate) {
      var plateMaterialMode = plate.remainderDiscarded === true
        ? 'used_strip'
        : (plate.remainderDiscarded === false ? 'full_plate' : opts.materialMode);
      var plateOptions = {
        materialMode: plateMaterialMode,
        wasteThresholdPct: opts.wasteThresholdPct,
        markBottomRemainder: true
      };
      var analysis = analyzePlate(plate.placed, W, H, edge, 0, plateOptions);

      plate.analysis = analysis;
      plate.wasteRects = analysis.wasteRects;
      plate.rowLines = analysis.rowLines;

      if (plateMaterialMode === 'used_strip') {
        chargedAreaMm2 += analysis.strip.areaMm2;
        discardedAreaMm2 += Math.max(0, W * H - analysis.strip.areaMm2);
      } else {
        chargedAreaMm2 += W * H;
      }

      allWasteRects = allWasteRects.concat(analysis.wasteRects || []);
      allRowLines = allRowLines.concat(analysis.rowLines || []);
    });

    var lastPlate = usedPlates.length ? usedPlates[usedPlates.length - 1] : null;

    var lastAnalysis = lastPlate && lastPlate.analysis
      ? lastPlate.analysis
      : analyzePlate(lastPlate ? lastPlate.placed : [], W, H, edge, 0, opts);

    return {
      fullPlates: usedPlates.length,
      chargedPlates: plateAreaMm2 > 0 ? chargedAreaMm2 / plateAreaMm2 : 0,
      areaMm2: chargedAreaMm2,
      chargedAreaMm2: chargedAreaMm2,
      discardedAreaMm2: discardedAreaMm2,
      materialMode: opts.materialMode,
      lastStrip: lastAnalysis.strip,
      bottomRemainder: lastAnalysis.bottomRemainder,
      wasteRects: allWasteRects,
      rowLines: allRowLines
    };
  }

  return {
    packSinglePattern: packSinglePattern,
    packMixedSmart: packMixedSmart,
    usedStripFromPlaced: usedStripFromPlaced,
    totalMaterialArea: totalMaterialArea,
    analyzePlate: analyzePlate,
    piecesOverlap: piecesOverlap
  };
})();
