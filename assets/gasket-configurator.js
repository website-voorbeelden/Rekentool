(function () {
  'use strict';

  var mainScriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : '';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(initAll);

  document.addEventListener('shopify:section:load', function (event) {
    if (!event || !event.target) return;

    var roots = event.target.querySelectorAll
      ? event.target.querySelectorAll('.gcfg')
      : [];

    Array.prototype.slice.call(roots).forEach(initRoot);
  });

  function initAll() {
    Array.prototype.slice.call(document.querySelectorAll('.gcfg')).forEach(initRoot);
  }

  function initRoot(root) {
    if (!root || root.__gcfgInit) return;

    var Core = window.GasketConfiguratorCore;
    var Nesting = window.GasketConfiguratorNesting;
    var Drawing = window.GasketConfiguratorDrawing;

    if (!Core || !Nesting || !Drawing) {
      var retryCount = root.__gcfgRetryCount || 0;

      if (retryCount < 20) {
        root.__gcfgRetryCount = retryCount + 1;

        window.setTimeout(function () {
          initRoot(root);
        }, 50);

        return;
      }

      console.error('Gasket configurator: core/nesting/drawing assets ontbreken of laden te laat.');
      return;
    }

    root.__gcfgRetryCount = 0;
    root.__gcfgInit = true;

    function $(selector) {
      return root.querySelector(selector);
    }

    function $all(selector) {
      return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    function bySuffix(suffix) {
      return root.querySelector('[id$="' + suffix + '"]');
    }

    var I18N = {
      choose_shape: 'Kies eerst een vorm. Daarna verschijnen de juiste maatvelden.',
      invalid: 'Vul geldige maten in. De binnenmaat moet kleiner zijn dan de buitenmaat en de pakkingbreedte moet overal passen.',
      no_items: 'Voeg minimaal één geldige pakkingregel toe.',
      no_fit: 'Eén of meer pakkingen passen niet op de ingestelde plaat.',
      calc_error: 'De nesting kon niet worden afgerond. Verlaag het aantal of probeer opnieuw in te delen.',
      bolt_partial: 'Om het boutpatroon te tonen, vul PCD + gat Ø + aantal gaten in.',
      bolt_no_fit: 'Een of meer gaten passen niet volledig in het pakkingmateriaal.',
      export_invalid: 'Vul eerst een geldige live pakking in. De binnenmaat moet kleiner zijn dan de buitenmaat.',
      export_bolt_partial: 'Voor export van boutgaten: vul PCD + gat Ø + aantal gaten volledig in.',
      export_bolt_no_fit: 'Boutpatroon past niet binnen de ring. Export is gestopt.'
    };

    var els = {
      variant: bySuffix('-variant'),
      variantDebug: bySuffix('-variant-debug'),

      itemsWrap: bySuffix('-items'),
      itemTpl: bySuffix('-item-template'),
      addItemBtn: bySuffix('-add-item'),

      plateW: bySuffix('-plateW'),
      plateH: bySuffix('-plateH'),
      edge: bySuffix('-edge'),
      gap: bySuffix('-gap'),

      platePrice: bySuffix('-platePrice'),
      hourRate: bySuffix('-hourRate'),
      cutSpeed: bySuffix('-cutSpeed'),
      setupMin: bySuffix('-setupMin'),
      kerf: bySuffix('-kerf'),
      pierceSec: bySuffix('-pierceSec'),

      holeMethod: bySuffix('-holeMethod'),
      punchSec: bySuffix('-punchSec'),
      plateLoadMin: bySuffix('-plateLoadMin'),
      plateUnloadMin: bySuffix('-plateUnloadMin'),
      moveSec: bySuffix('-moveSec'),
      finishSec: bySuffix('-finishSec'),

      marginPct: bySuffix('-marginPct'),
      minOrder: bySuffix('-minOrder'),
      remainderMode: bySuffix('-remainderMode'),

      calcBox: bySuffix('-calcBox'),
      priceResult: bySuffix('-priceResult'),
      nestSvg: bySuffix('-nestSvg'),
      busy: bySuffix('-busy'),
      warnBox: bySuffix('-warn'),
      svgWarn: bySuffix('-svgWarn'),

      nestRetry: bySuffix('-nestRetry'),
      nestPrev: bySuffix('-nestPrev'),
      nestNext: bySuffix('-nestNext'),
      nestIndicator: bySuffix('-nestIndicator'),
      nestStrategy: bySuffix('-nestStrategy'),
      plateRemainder: bySuffix('-plateRemainder'),
      plateRemainderText: bySuffix('-plateRemainderText'),

      dxfBtn: bySuffix('-download-dxf'),
      svgBtn: bySuffix('-download-svg'),

      previewSvg: $('.gcfg__svg')
    };

    if (!els.previewSvg || !els.itemsWrap || !els.itemTpl) return;

    if (els.dxfBtn) els.dxfBtn.textContent = 'Download DXF live pakking';
    if (els.svgBtn) els.svgBtn.textContent = 'Download SVG live pakking';

    var drawingEls = {
      ringFill: els.previewSvg.querySelector('.ringFill'),
      ringOD: els.previewSvg.querySelector('.ringOD'),
      ringID: els.previewSvg.querySelector('.ringID'),
      holesG: els.previewSvg.querySelector('.holes'),
      pcdCircle: els.previewSvg.querySelector('.pcdCircle'),
      ringOuterPath: els.previewSvg.querySelector('.ringOuterPath'),
      ringInnerPath: els.previewSvg.querySelector('.ringInnerPath'),

      odExtL: els.previewSvg.querySelector('.od-ext-l'),
      odExtR: els.previewSvg.querySelector('.od-ext-r'),
      odLine: els.previewSvg.querySelector('.od-line'),
      odText: els.previewSvg.querySelector('.od-text'),

      idExtL: els.previewSvg.querySelector('.id-ext-l'),
      idExtR: els.previewSvg.querySelector('.id-ext-r'),
      idLine: els.previewSvg.querySelector('.id-line'),
      idText: els.previewSvg.querySelector('.id-text'),

      pcdExtL: els.previewSvg.querySelector('.pcd-ext-l'),
      pcdExtR: els.previewSvg.querySelector('.pcd-ext-r'),
      pcdLine: els.previewSvg.querySelector('.pcd-line'),
      pcdText: els.previewSvg.querySelector('.pcd-text'),

      thkGroup: els.previewSvg.querySelector('.thk'),
      thkLeft: els.previewSvg.querySelector('.thk-left'),
      thkRight: els.previewSvg.querySelector('.thk-right'),
      thkTop: els.previewSvg.querySelector('.thk-top'),
      thkBot: els.previewSvg.querySelector('.thk-bot'),
      thkIdTop: els.previewSvg.querySelector('.thk-id-top'),
      thkIdBot: els.previewSvg.querySelector('.thk-id-bot'),
      thkDim: els.previewSvg.querySelector('.thk-dim'),
      thkText: els.previewSvg.querySelector('.thk-text')
    };

    var activeItem = null;
    var renderFrame = null;
    var autoCalcTimer = null;
    var calculationSequence = 0;
    var nestingAttempt = 0;
    var currentPlateIndex = 0;
    var plateRemainderOverrides = {};
    var lastCalculationData = null;
    var nestTouchStartX = null;
    var pricingIntent = null;
    var activeNestingJob = null;

    function findAssetUrl(filename) {
      var scripts = Array.prototype.slice.call(document.querySelectorAll('script[src]'));

      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (src.indexOf(filename) !== -1) return src;
      }

      if (!mainScriptUrl || !window.URL) return '';

      try {
        return new window.URL(filename, mainScriptUrl).href;
      } catch (error) {
        return '';
      }
    }

    function updateStaticCopy() {
      var replacements = {
        'Pakkingregels': 'Vorm & maten',
        'Voeg één of meerdere pakkingen toe.': 'Kies eerst de vorm; daarna vul je de bijbehorende maten in.',
        'Vul de pakkingregels en kosten in. Klik daarna op prijs berekenen.': 'Kies materiaal, vorm en maten. Het resultaat wordt automatisch bijgewerkt.'
      };

      function walk(node) {
        if (!node) return;

        if (node.nodeType === 3) {
          Object.keys(replacements).forEach(function (from) {
            if (node.nodeValue.indexOf(from) !== -1) {
              node.nodeValue = node.nodeValue.split(from).join(replacements[from]);
            }
          });

          return;
        }

        Array.prototype.slice.call(node.childNodes || []).forEach(walk);
      }

      walk(root);
    }

    function warn(el, msg) {
      if (el) el.textContent = msg || '';
    }

    function extractNumber(value) {
      if (value == null) return null;

      var text = String(value).trim().replace(',', '.');
      var match = text.match(/-?\d+(\.\d+)?/);

      return match ? Number(match[0]) : null;
    }

    function val(el) {
      var n = extractNumber(el && el.value);
      return n == null ? 0 : n;
    }

    function fmt(n, decimals) {
      if (n == null || !isFinite(n)) n = 0;

      return n.toLocaleString('nl-NL', {
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0
      });
    }

    function money(n) {
      if (n == null || !isFinite(n)) n = 0;

      return '€ ' + n.toLocaleString('nl-NL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function px(n) {
      return Math.round(n) + 0.5;
    }

    function num(n, decimals) {
      if (n == null || !isFinite(n)) n = 0;

      var d = decimals == null ? 4 : decimals;

      return Number(n).toFixed(d).replace(/\.?0+$/, '');
    }

    function escXml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        }[char];
      });
    }

    function safeFilePart(value) {
      return String(value == null ? '' : value)
        .toLowerCase()
        .replace(',', '.')
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    function setA(el, attr, value) {
      if (el) el.setAttribute(attr, String(value));
    }

    function clamp(n, min, max) {
      n = Number(n);
      if (!isFinite(n)) n = 0;

      return Math.min(max, Math.max(min, n));
    }

    function clampRadius(w, h, r, fallback) {
      var max = Math.max(0, Math.min(w || 0, h || 0) / 2);

      if (!(r > 0) && fallback != null) r = fallback;

      return clamp(r || 0, 0, max);
    }

    function circleArea(d) {
      var r = Math.max(0, d || 0) / 2;

      return Math.PI * r * r;
    }

    function circlePerimeter(d) {
      return Math.PI * Math.max(0, d || 0);
    }

    function roundedRectArea(w, h, r) {
      w = Math.max(0, w || 0);
      h = Math.max(0, h || 0);
      r = clampRadius(w, h, r);

      return (w * h) - ((4 - Math.PI) * r * r);
    }

    function roundedRectPerimeter(w, h, r) {
      w = Math.max(0, w || 0);
      h = Math.max(0, h || 0);
      r = clampRadius(w, h, r);

      return 2 * (w + h - 4 * r) + (2 * Math.PI * r);
    }

    function circlePath(cx, cy, r, scale) {
      r = Math.max(0, r || 0) * (scale || 1);

      return (
        'M ' + num(cx + r, 3) + ' ' + num(cy, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 1 0 ' + num(cx - r, 3) + ' ' + num(cy, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 1 0 ' + num(cx + r, 3) + ' ' + num(cy, 3)
      );
    }

    function roundedRectPath(cx, cy, w, h, r, scale) {
      scale = scale || 1;
      w = Math.max(0, w || 0) * scale;
      h = Math.max(0, h || 0) * scale;
      r = clampRadius(w, h, (r || 0) * scale);

      var x = cx - w / 2;
      var y = cy - h / 2;
      var x2 = x + w;
      var y2 = y + h;

      if (r <= 0) {
        return (
          'M ' + num(x, 3) + ' ' + num(y, 3) +
          ' H ' + num(x2, 3) +
          ' V ' + num(y2, 3) +
          ' H ' + num(x, 3) +
          ' Z'
        );
      }

      return (
        'M ' + num(x + r, 3) + ' ' + num(y, 3) +
        ' H ' + num(x2 - r, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 0 1 ' + num(x2, 3) + ' ' + num(y + r, 3) +
        ' V ' + num(y2 - r, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 0 1 ' + num(x2 - r, 3) + ' ' + num(y2, 3) +
        ' H ' + num(x + r, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 0 1 ' + num(x, 3) + ' ' + num(y2 - r, 3) +
        ' V ' + num(y + r, 3) +
        ' A ' + num(r, 3) + ' ' + num(r, 3) + ' 0 0 1 ' + num(x + r, 3) + ' ' + num(y, 3) +
        ' Z'
      );
    }

    function shapeLabel(shape) {
      if (shape === 'rect') return 'Vierkant/rechthoek';
      if (shape === 'manhole') return 'Mangat';

      return 'Rond';
    }

    function itemLabel(it) {
      if (!it) return 'Pakking';
      if (it.shape === 'rect') {
        return 'Rechthoek ' + fmt(it.outerW, 1) + ' x ' + fmt(it.outerH, 1) + (it.hasCenterHole ? '' : ' massief');
      }
      if (it.shape === 'manhole') {
        return 'Mangat Ø ' + fmt(it.manholeDia, 1) + ' + ' +
          fmt(it.straightLength, 1) + ' mm recht • pakkingbreedte ' +
          (it.hasCenterHole ? fmt(it.ringWidth, 1) + ' mm' : 'massief');
      }

      return 'Rond OD ' + fmt(it.od, 1) + (it.hasCenterHole ? ' / ID ' + fmt(it.id, 1) : ' massief');
    }

    function innerLabel(it) {
      if (!it) return '';
      if (!it.hasCenterHole) return 'geen middengat';
      if (it.innerShape === 'manhole') {
        return 'binnen mangat ' + fmt(it.innerW, 1) + ' x ' + fmt(it.innerH, 1);
      }
      if (it.innerShape === 'rect') {
        return 'binnen ' + fmt(it.innerW, 1) + ' x ' + fmt(it.innerH, 1) + ' r' + fmt(it.innerRadius, 1);
      }

      return 'binnen Ø ' + fmt(it.innerDia, 1);
    }

    function outerPathForItem(it, cx, cy, scale) {
      if (it.shape === 'circle') return circlePath(cx, cy, it.od / 2, scale);

      return roundedRectPath(cx, cy, it.outerW, it.outerH, it.outerRadius, scale);
    }

    function innerPathForItem(it, cx, cy, scale) {
      if (!it.hasCenterHole) return '';

      if (it.innerShape === 'rect' || it.innerShape === 'manhole') {
        return roundedRectPath(cx, cy, it.innerW, it.innerH, it.innerRadius, scale);
      }

      return circlePath(cx, cy, it.innerDia / 2, scale);
    }

    function hideLine(el) {
      if (!el) return;

      el.style.display = 'none';
      el.setAttribute('x1', '0');
      el.setAttribute('y1', '0');
      el.setAttribute('x2', '0');
      el.setAttribute('y2', '0');
    }

    function hideText(el) {
      if (!el) return;

      el.style.display = 'none';
      el.textContent = '';
      el.setAttribute('x', '0');
      el.setAttribute('y', '0');
    }

    function getVariantData() {
      var json = root.querySelector('script[data-gasket-variants]');

      try {
        var data = JSON.parse((json && json.textContent) || '[]');
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('Gasket configurator: variant JSON kon niet gelezen worden.', error);
        return [];
      }
    }

    var VARIANTS = getVariantData();

    function findVariant(id) {
      id = String(id || '');

      for (var i = 0; i < VARIANTS.length; i++) {
        if (String(VARIANTS[i].id) === id) return VARIANTS[i];
      }

      return VARIANTS[0] || null;
    }

    function applyVariant() {
      var variant = findVariant(els.variant && els.variant.value);
      if (!variant) return;

      if (els.platePrice) els.platePrice.value = Number(variant.platePrice || 0);
      if (els.cutSpeed) els.cutSpeed.value = Number(variant.cutSpeed || 0);

      if (els.variantDebug) {
        els.variantDebug.textContent =
          'Gelezen uit custom metafields: plaatprijs ' +
          money(variant.platePrice || 0) +
          ' • snijsnelheid ' +
          fmt(variant.cutSpeed || 0, 0) +
          ' mm/min';
      }
    }

    function fieldBlock(label, field, type, attrs) {
      attrs = attrs || '';

      return (
        '<div>' +
          '<label class="gcfg__label">' + label + '</label>' +
          '<input class="gcfg__input" data-field="' + field + '" type="' + (type || 'text') + '" ' + attrs + '>' +
        '</div>'
      );
    }

    function stepDecimals(step) {
      var text = String(step || '1');
      var dot = text.indexOf('.');

      return dot === -1 ? 0 : text.length - dot - 1;
    }

    function adjustNumericInput(input, direction) {
      var step = extractNumber(input.getAttribute('step'));
      var min = extractNumber(input.getAttribute('min'));
      var max = extractNumber(input.getAttribute('max'));
      var current = extractNumber(input.value);

      if (!(step > 0)) {
        step = input.getAttribute('inputmode') === 'decimal' ? 0.1 : 1;
      }

      if (current == null) current = min == null ? 0 : min;

      var next = current + step * direction;
      if (min != null) next = Math.max(min, next);
      if (max != null) next = Math.min(max, next);

      var value = next.toFixed(stepDecimals(step));
      if (input.type !== 'number') value = value.replace('.', ',');
      input.value = value;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }

    function enhanceNumericInputs(scope) {
      if (!scope || !scope.querySelectorAll) return;

      Array.prototype.slice.call(scope.querySelectorAll('input.gcfg__input')).forEach(function (input) {
        var numeric = input.type === 'number' || input.getAttribute('inputmode') === 'decimal';
        if (!numeric || input.__gcfgStepper) return;

        var host = input.parentElement;
        if (!host) return;

        var labelScope = host.closest ? (host.closest('.gcfg__metric') || host) : host;
        var label = labelScope.querySelector('.gcfg__label, .gcfg__metricLabel, span');
        var labelText = label ? String(label.textContent || '').trim() : 'waarde';
        var wrapper = document.createElement('div');
        var controls = document.createElement('div');
        var up = document.createElement('button');
        var down = document.createElement('button');

        wrapper.className = 'gcfg__number';
        controls.className = 'gcfg__stepper';

        up.type = 'button';
        up.className = 'gcfg__stepperBtn';
        up.setAttribute('aria-label', labelText + ' verhogen');
        up.setAttribute('title', 'Verhogen');
        up.innerHTML = '&#9650;';

        down.type = 'button';
        down.className = 'gcfg__stepperBtn';
        down.setAttribute('aria-label', labelText + ' verlagen');
        down.setAttribute('title', 'Verlagen');
        down.innerHTML = '&#9660;';

        host.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        controls.appendChild(up);
        controls.appendChild(down);
        wrapper.appendChild(controls);

        up.addEventListener('click', function () {
          adjustNumericInput(input, 1);
        });

        down.addEventListener('click', function () {
          adjustNumericInput(input, -1);
        });

        input.__gcfgStepper = true;
      });
    }

    function shapeControlsHtml() {
      return (
        '<div class="gcfg__shapeBlock" data-shape-controls>' +
          '<input type="hidden" data-field="shape" value="">' +
          '<input type="hidden" data-field="holePattern" value="">' +

          '<div data-shape-step>' +
            '<div class="gcfg__stageLabel"><span>1</span><strong>Kies de vorm</strong></div>' +
            '<div class="gcfg__shapePicker" role="radiogroup" aria-label="Vorm">' +
              shapeTileHtml('circle', 'Rond', '<circle cx="32" cy="32" r="21"></circle>') +
              shapeTileHtml('rect', 'Vierkant', '<rect x="11" y="14" width="42" height="36" rx="5"></rect>') +
              shapeTileHtml('manhole', 'Mangat', '<path d="M22 15h20a17 17 0 0 1 0 34H22a17 17 0 0 1 0-34Z"></path>') +
            '</div>' +
          '</div>' +

          '<div data-config-step hidden>' +
            '<div class="gcfg__selectedShape">' +
              '<button type="button" class="gcfg__iconBtn" data-change-shape aria-label="Andere vorm kiezen" title="Andere vorm kiezen">←</button>' +
              '<span><small>Gekozen vorm</small><strong data-selected-shape-label></strong></span>' +
            '</div>' +

            '<div class="gcfg__patternHeader">' +
              '<div class="gcfg__stageLabel"><span>2</span><strong>Voeg eventueel gaten toe</strong></div>' +
              '<button type="button" class="gcfg__textBtn" data-clear-pattern hidden>Gaten verwijderen</button>' +
            '</div>' +
            '<div class="gcfg__patternPicker" role="radiogroup" aria-label="Gatenpatroon">' +
              patternTileHtml('center', 'Middengat', 'circle', '<circle cx="32" cy="32" r="21"></circle><circle cx="32" cy="32" r="9"></circle>') +
              patternTileHtml('bolt-circle', 'Midden + boutcirkel', 'circle', '<circle cx="32" cy="32" r="21"></circle><circle cx="32" cy="32" r="8"></circle><circle cx="32" cy="13" r="2.5" class="gcfg__iconDot"></circle><circle cx="51" cy="32" r="2.5" class="gcfg__iconDot"></circle><circle cx="32" cy="51" r="2.5" class="gcfg__iconDot"></circle><circle cx="13" cy="32" r="2.5" class="gcfg__iconDot"></circle>') +
              patternTileHtml('center', 'Middengat', 'rect', '<rect x="9" y="13" width="46" height="38" rx="5"></rect><rect x="21" y="23" width="22" height="18" rx="3"></rect>') +
              patternTileHtml('corners', 'Midden + hoekgaten', 'rect', '<rect x="8" y="12" width="48" height="40" rx="5"></rect><rect x="21" y="23" width="22" height="18" rx="3"></rect><circle cx="15" cy="19" r="2.5" class="gcfg__iconDot"></circle><circle cx="49" cy="19" r="2.5" class="gcfg__iconDot"></circle><circle cx="49" cy="45" r="2.5" class="gcfg__iconDot"></circle><circle cx="15" cy="45" r="2.5" class="gcfg__iconDot"></circle>') +
              patternTileHtml('perimeter', 'Midden + rondom', 'rect', '<rect x="7" y="11" width="50" height="42" rx="5"></rect><rect x="21" y="23" width="22" height="18" rx="3"></rect><circle cx="14" cy="17" r="2" class="gcfg__iconDot"></circle><circle cx="32" cy="16" r="2" class="gcfg__iconDot"></circle><circle cx="50" cy="17" r="2" class="gcfg__iconDot"></circle><circle cx="51" cy="32" r="2" class="gcfg__iconDot"></circle><circle cx="50" cy="47" r="2" class="gcfg__iconDot"></circle><circle cx="32" cy="48" r="2" class="gcfg__iconDot"></circle><circle cx="14" cy="47" r="2" class="gcfg__iconDot"></circle><circle cx="13" cy="32" r="2" class="gcfg__iconDot"></circle>') +
              patternTileHtml('center', 'Middengat', 'manhole', '<path d="M22 14h20a18 18 0 0 1 0 36H22a18 18 0 0 1 0-36Z"></path><path d="M25 24h14a8 8 0 0 1 0 16H25a8 8 0 0 1 0-16Z"></path>') +
              patternTileHtml('corners', 'Midden + 4 gaten', 'manhole', '<path d="M22 13h20a19 19 0 0 1 0 38H22a19 19 0 0 1 0-38Z"></path><path d="M25 24h14a8 8 0 0 1 0 16H25a8 8 0 0 1 0-16Z"></path><circle cx="17" cy="22" r="2.5" class="gcfg__iconDot"></circle><circle cx="47" cy="22" r="2.5" class="gcfg__iconDot"></circle><circle cx="47" cy="42" r="2.5" class="gcfg__iconDot"></circle><circle cx="17" cy="42" r="2.5" class="gcfg__iconDot"></circle>') +
              patternTileHtml('perimeter', 'Midden + rondom', 'manhole', '<path d="M21 12h22a20 20 0 0 1 0 40H21a20 20 0 0 1 0-40Z"></path><path d="M25 24h14a8 8 0 0 1 0 16H25a8 8 0 0 1 0-16Z"></path><circle cx="14" cy="20" r="2" class="gcfg__iconDot"></circle><circle cx="26" cy="16" r="2" class="gcfg__iconDot"></circle><circle cx="38" cy="16" r="2" class="gcfg__iconDot"></circle><circle cx="50" cy="20" r="2" class="gcfg__iconDot"></circle><circle cx="54" cy="32" r="2" class="gcfg__iconDot"></circle><circle cx="50" cy="44" r="2" class="gcfg__iconDot"></circle><circle cx="38" cy="48" r="2" class="gcfg__iconDot"></circle><circle cx="26" cy="48" r="2" class="gcfg__iconDot"></circle><circle cx="14" cy="44" r="2" class="gcfg__iconDot"></circle><circle cx="10" cy="32" r="2" class="gcfg__iconDot"></circle>') +
            '</div>' +

            '<div class="gcfg__shapePrompt" data-pattern-prompt>Geen gaten geselecteerd; deze vorm wordt massief uitgevoerd.</div>' +

            '<div class="gcfg__measurements" data-requires-pattern>' +
              '<div class="gcfg__stageLabel"><span>3</span><strong>Vul de maten in</strong></div>' +

              '<div class="gcfg__row" data-show-for="circle">' +
                fieldBlock('Buitendiameter (OD) mm *', 'od', 'text', 'inputmode="decimal" value="160"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="circle" data-pattern-show-for="center bolt-circle">' +
                fieldBlock('Binnendiameter (ID) mm *', 'id', 'text', 'inputmode="decimal" value="90"') +
              '</div>' +
              '<div class="gcfg__row gcfg__row--2" data-show-for="circle" data-pattern-show-for="bolt-circle">' +
                fieldBlock('Boutsteek (PCD) mm', 'pcd', 'text', 'inputmode="decimal" placeholder="automatisch in het midden"') +
                fieldBlock('Aantal gaten', 'holes', 'number', 'min="1" step="1" value="8"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="circle" data-pattern-show-for="bolt-circle">' +
                fieldBlock('Gatdiameter Ø mm', 'holeDia', 'text', 'inputmode="decimal" value="12"') +
              '</div>' +

              '<div class="gcfg__row gcfg__row--2" data-show-for="rect">' +
                fieldBlock('Totale buitenlengte mm *', 'outerW', 'text', 'inputmode="decimal" value="400"') +
                fieldBlock('Totale buitenbreedte mm *', 'outerH', 'text', 'inputmode="decimal" value="200"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="rect">' +
                fieldBlock('Buitenradius mm', 'outerRadius', 'text', 'inputmode="decimal" value="8"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="rect" data-pattern-show-for="center corners perimeter">' +
                '<label class="gcfg__label">Vorm van het middengat *</label>' +
                '<select class="gcfg__input" data-field="innerShape"><option value="rect">Vierkant / rechthoekig</option><option value="circle">Rond</option></select>' +
              '</div>' +
              '<div class="gcfg__row" data-show-for="rect" data-pattern-show-for="center corners perimeter" data-inner-show-for="circle">' +
                fieldBlock('Binnen Ø mm *', 'innerDia', 'text', 'inputmode="decimal" value="90"') +
              '</div>' +
              '<div class="gcfg__row gcfg__row--2" data-show-for="rect" data-pattern-show-for="center corners perimeter" data-inner-show-for="rect">' +
                fieldBlock('Binnenlengte mm *', 'innerW', 'text', 'inputmode="decimal" value="240"') +
                fieldBlock('Binnenhoogte mm *', 'innerH', 'text', 'inputmode="decimal" value="90"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="rect" data-pattern-show-for="center corners perimeter" data-inner-show-for="rect">' +
                fieldBlock('Binnenradius mm', 'innerRadius', 'text', 'inputmode="decimal" value="8"') +
              '</div>' +

              '<div class="gcfg__row gcfg__row--2" data-show-for="manhole">' +
                fieldBlock('Diameter ronde delen mm *', 'manholeDia', 'text', 'inputmode="decimal" value="200"') +
                fieldBlock('Lengte recht tussenstuk mm *', 'straightLength', 'text', 'inputmode="decimal" value="200"') +
              '</div>' +
              '<div class="gcfg__row" data-show-for="manhole" data-pattern-show-for="center corners perimeter">' +
                fieldBlock('Pakkingbreedte rondom mm *', 'ringWidth', 'text', 'inputmode="decimal" value="25"') +
              '</div>' +
              '<div class="gcfg__derived" data-show-for="manhole" data-manhole-derived></div>' +

              '<div class="gcfg__row gcfg__row--2" data-pattern-show-for="corners perimeter">' +
                fieldBlock('Afstand tot buitenrand mm', 'edgeOffset', 'text', 'inputmode="decimal" placeholder="automatisch in het midden"') +
                fieldBlock('Gatdiameter Ø mm', 'holeDia', 'text', 'inputmode="decimal" value="12"') +
              '</div>' +
              '<div class="gcfg__row gcfg__row--2" data-pattern-show-for="perimeter">' +
                fieldBlock('Aantal gaten', 'holes', 'number', 'min="1" step="1" value="10"') +
                fieldBlock('Afstand tussen gaten mm', 'holeSpacing', 'text', 'inputmode="decimal" placeholder="automatisch gelijk verdeeld"') +
              '</div>' +
              '<div class="gcfg__row" data-pattern-show-for="perimeter">' +
                fieldBlock('Positie eerste gat vanaf boven mm', 'startOffset', 'text', 'inputmode="decimal" value="0"') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }

    function shapeTileHtml(value, label, icon) {
      return (
        '<button type="button" class="gcfg__shapeTile" data-shape-choice="' + value + '" role="radio" aria-checked="false">' +
          '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + icon + '</svg>' +
          '<span>' + label + '</span>' +
        '</button>'
      );
    }

    function patternTileHtml(value, label, shapes, icon) {
      return (
        '<button type="button" class="gcfg__patternTile" data-pattern-choice="' + value + '" data-pattern-for="' + shapes + '" role="radio" aria-checked="false">' +
          '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + icon + '</svg>' +
          '<span>' + label + '</span>' +
        '</button>'
      );
    }

    function closestFieldWrap(input) {
      return input && input.parentElement ? input.parentElement : null;
    }

    function prepareItemShapeUI(item) {
      if (!item || item.__gcfgShapeReady) return;

      var qty = item.querySelector('[data-field="qty"]');
      var qtyRow = qty && qty.closest ? qty.closest('.gcfg__row') : null;

      if (qtyRow) {
        qtyRow.insertAdjacentHTML('beforebegin', shapeControlsHtml());
        qtyRow.setAttribute('data-requires-pattern', 'true');
      }

      item.__gcfgShapeReady = true;
      syncShapeUI(item);
    }

    function syncShapeUI(item) {
      var f = itemFields(item);
      var shape = f.shape && f.shape.value ? f.shape.value : '';
      var pattern = f.holePattern && f.holePattern.value ? f.holePattern.value : '';
      var innerShape = f.innerShape && f.innerShape.value ? f.innerShape.value : 'circle';

      item.setAttribute('data-shape', shape);
      item.setAttribute('data-hole-pattern', pattern);
      item.setAttribute('data-inner-shape', innerShape);
      item.classList.toggle('has-shape', !!shape);
      item.classList.toggle('has-pattern', !!pattern);

      var shapeStep = item.querySelector('[data-shape-step]');
      var configStep = item.querySelector('[data-config-step]');
      if (shapeStep) shapeStep.hidden = !!shape;
      if (configStep) configStep.hidden = !shape;

      Array.prototype.slice.call(item.querySelectorAll('[data-selected-shape-label]')).forEach(function (el) {
        el.textContent = shapeLabel(shape);
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-shape-choice]')).forEach(function (btn) {
        var active = btn.getAttribute('data-shape-choice') === shape;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-pattern-choice]')).forEach(function (btn) {
        var allowed = String(btn.getAttribute('data-pattern-for') || '').split(/\s+/).indexOf(shape) !== -1;
        var active = allowed && btn.getAttribute('data-pattern-choice') === pattern;
        btn.hidden = !allowed;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-show-for]')).forEach(function (el) {
        var allowed = String(el.getAttribute('data-show-for') || '').split(/\s+/);
        el.hidden = allowed.indexOf(shape) === -1;
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-inner-show-for]')).forEach(function (el) {
        var allowed = String(el.getAttribute('data-inner-show-for') || '').split(/\s+/);
        var patternAllowed = String(el.getAttribute('data-pattern-show-for') || '').split(/\s+/);
        el.hidden = allowed.indexOf(innerShape) === -1 || shape !== 'rect' || patternAllowed.indexOf(pattern) === -1;
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-pattern-show-for]')).forEach(function (el) {
        if (el.hasAttribute('data-inner-show-for')) return;
        var allowed = String(el.getAttribute('data-pattern-show-for') || '').split(/\s+/);
        var shapeAllowed = !el.hasAttribute('data-show-for') || String(el.getAttribute('data-show-for') || '').split(/\s+/).indexOf(shape) !== -1;
        el.hidden = !shapeAllowed || allowed.indexOf(pattern) === -1;
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-requires-pattern]')).forEach(function (el) {
        el.hidden = !shape;
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-pattern-prompt]')).forEach(function (el) {
        el.hidden = !!pattern;
      });

      Array.prototype.slice.call(item.querySelectorAll('[data-clear-pattern]')).forEach(function (el) {
        el.hidden = !pattern;
      });

      var manholeDerived = item.querySelector('[data-manhole-derived]');

      if (manholeDerived && shape === 'manhole') {
        var manholeDia = val(f.manholeDia);
        var straightLength = val(f.straightLength);
        var ringWidth = val(f.ringWidth);
        var outerW = manholeDia + straightLength;
        var outerH = manholeDia;
        var innerH = manholeDia - ringWidth * 2;
        var innerW = innerH + straightLength;

        if (!pattern && manholeDia > 0 && straightLength > 0) {
          manholeDerived.textContent = 'Totale buitenmaat: ' + fmt(outerW, 1) + ' x ' + fmt(outerH, 1) + ' mm.';
          manholeDerived.classList.remove('is-invalid');
        } else if (manholeDia > 0 && straightLength > 0 && ringWidth > 0 && innerH > 0) {
          manholeDerived.textContent =
            'Totale buitenmaat: ' + fmt(outerW, 1) + ' x ' + fmt(outerH, 1) +
            ' mm • binnenmaat: ' + fmt(innerW, 1) + ' x ' + fmt(innerH, 1) + ' mm.';
          manholeDerived.classList.remove('is-invalid');
        } else {
          manholeDerived.textContent =
            'Vul diameter, recht tussenstuk en pakkingbreedte in; de totale maten worden automatisch berekend.';
          manholeDerived.classList.toggle('is-invalid', ringWidth > 0 && innerH <= 0);
        }
      }
    }

    function itemFields(item) {
      function field(name) {
        var fields = Array.prototype.slice.call(item.querySelectorAll('[data-field="' + name + '"]'));
        if (!fields.length) return null;

        for (var i = 0; i < fields.length; i++) {
          if (!fields[i].closest('[hidden]')) return fields[i];
        }

        return fields[0];
      }

      return {
        shape: field('shape'),
        holePattern: field('holePattern'),
        od: field('od'),
        id: field('id'),
        outerW: field('outerW'),
        outerH: field('outerH'),
        outerRadius: field('outerRadius'),
        innerShape: field('innerShape'),
        innerDia: field('innerDia'),
        innerW: field('innerW'),
        innerH: field('innerH'),
        innerRadius: field('innerRadius'),
        manholeDia: field('manholeDia'),
        straightLength: field('straightLength'),
        ringWidth: field('ringWidth'),
        pcd: field('pcd'),
        holes: field('holes'),
        holeDia: field('holeDia'),
        edgeOffset: field('edgeOffset'),
        holeSpacing: field('holeSpacing'),
        startOffset: field('startOffset'),
        h: field('h'),
        qty: field('qty')
      };
    }

    function patternHasCenterHole(pattern) {
      return pattern === 'center' || pattern === 'bolt-circle' || pattern === 'corners' || pattern === 'perimeter';
    }

    function patternHasExtraHoles(pattern) {
      return pattern === 'bolt-circle' || pattern === 'corners' || pattern === 'perimeter';
    }

    function pointInsideRoundedRect(x, y, width, height, radius) {
      if (!(width > 0) || !(height > 0)) return false;

      radius = clampRadius(width, height, radius);
      var qx = Math.abs(x) - width / 2 + radius;
      var qy = Math.abs(y) - height / 2 + radius;
      var outsideX = Math.max(qx, 0);
      var outsideY = Math.max(qy, 0);
      var signedDistance = Math.sqrt(outsideX * outsideX + outsideY * outsideY) + Math.min(Math.max(qx, qy), 0) - radius;

      return signedDistance <= 0.001;
    }

    function pointAlongClosedPath(points, distance) {
      if (!points || points.length < 2) return { x: 0, y: 0 };

      var segments = [];
      var total = 0;

      for (var i = 0; i < points.length; i++) {
        var a = points[i];
        var b = points[(i + 1) % points.length];
        var length = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
        if (!(length > 0)) continue;
        segments.push({ a: a, b: b, start: total, length: length });
        total += length;
      }

      if (!(total > 0)) return { x: 0, y: 0 };
      distance = ((distance % total) + total) % total;

      for (var s = 0; s < segments.length; s++) {
        var segment = segments[s];
        if (distance > segment.start + segment.length && s < segments.length - 1) continue;
        var t = Math.max(0, Math.min(1, (distance - segment.start) / segment.length));
        return {
          x: segment.a.x + (segment.b.x - segment.a.x) * t,
          y: segment.a.y + (segment.b.y - segment.a.y) * t
        };
      }

      return points[0];
    }

    function defaultHoleEdgeOffset(it) {
      if (!it.hasCenterHole) return Math.max(it.holeDia / 2 + 2, Math.min(it.outerW, it.outerH) * 0.12);
      if (it.shape === 'circle') return Math.max(it.holeDia / 2 + 2, (it.od - it.id) / 4);
      if (it.shape === 'manhole') return Math.max(it.holeDia / 2 + 2, it.ringWidth / 2);

      var horizontalBand = (it.outerW - it.innerW) / 2;
      var verticalBand = (it.outerH - it.innerH) / 2;
      return Math.max(it.holeDia / 2 + 2, Math.min(horizontalBand, verticalBand) / 2);
    }

    function buildHoleCenters(it) {
      var centers = [];
      if (!patternHasExtraHoles(it.holePattern) || !(it.holeDia > 0)) return centers;

      if (it.holePattern === 'bolt-circle') {
        var count = Math.max(1, it.requestedHoleCount);
        var rp = it.pcd / 2;
        var start = it.startAngle * Math.PI / 180;

        for (var c = 0; c < count; c++) {
          var angle = start + Math.PI * 2 * c / count;
          centers.push({ x: rp * Math.cos(angle), y: rp * Math.sin(angle), r: it.holeDia / 2 });
        }

        return centers;
      }

      var offset = it.edgeOffset;
      var pathW = Math.max(0, it.outerW - offset * 2);
      var pathH = Math.max(0, it.outerH - offset * 2);
      var pathRadius = clampRadius(pathW, pathH, Math.max(0, it.outerRadius - offset));

      if (it.holePattern === 'corners') {
        var hw = pathW / 2;
        var hh = pathH / 2;
        var diagonal = pathRadius > 0 ? pathRadius * (1 - Math.SQRT1_2) : 0;
        var x = Math.max(0, hw - diagonal);
        var y = Math.max(0, hh - diagonal);

        return [
          { x: -x, y: -y, r: it.holeDia / 2 },
          { x: x, y: -y, r: it.holeDia / 2 },
          { x: x, y: y, r: it.holeDia / 2 },
          { x: -x, y: y, r: it.holeDia / 2 }
        ];
      }

      var points = roundedRectPoints(pathW, pathH, pathRadius, 12);
      var halfPathW = pathW / 2;
      var halfPathH = pathH / 2;

      if (pathRadius > 0) {
        points.unshift({ x: 0, y: -halfPathH });
      } else {
        points = [
          { x: 0, y: -halfPathH },
          { x: halfPathW, y: -halfPathH },
          { x: halfPathW, y: halfPathH },
          { x: -halfPathW, y: halfPathH },
          { x: -halfPathW, y: -halfPathH }
        ];
      }

      var requested = Math.max(1, it.requestedHoleCount);
      var perimeter = roundedRectPerimeter(pathW, pathH, pathRadius);
      var spacing = it.holeSpacing > 0 ? it.holeSpacing : perimeter / requested;

      for (var h = 0; h < requested; h++) {
        var point = pointAlongClosedPath(points, it.startOffset + h * spacing);
        centers.push({ x: point.x, y: point.y, r: it.holeDia / 2 });
      }

      return centers;
    }

    function holeFitsMaterial(it, hole) {
      var rh = hole.r;
      var distance = Math.sqrt(hole.x * hole.x + hole.y * hole.y);
      var fitsOuter = it.shape === 'circle'
        ? distance + rh < it.od / 2 - 0.001
        : pointInsideRoundedRect(hole.x, hole.y, it.outerW - rh * 2, it.outerH - rh * 2, Math.max(0, it.outerRadius - rh));

      if (!fitsOuter) return false;
      if (!it.hasCenterHole) return true;

      if (it.innerShape === 'circle') return distance - rh > it.innerDia / 2 + 0.001;

      return !pointInsideRoundedRect(hole.x, hole.y, it.innerW + rh * 2, it.innerH + rh * 2, it.innerRadius + rh);
    }

    function readItem(item, index) {
      var f = itemFields(item);
      var shape = f.shape && f.shape.value ? f.shape.value : '';
      var holePattern = f.holePattern && f.holePattern.value ? f.holePattern.value : 'solid';

      if (!shape) return null;

      var hasCenterHole = patternHasCenterHole(holePattern);

      var innerShape = shape === 'circle'
        ? 'circle'
        : (shape === 'manhole'
          ? 'manhole'
          : (f.innerShape && f.innerShape.value ? f.innerShape.value : 'circle'));
      var od = val(f.od);
      var id = val(f.id);
      var manholeDia = val(f.manholeDia);
      var straightLength = val(f.straightLength);
      var outerW = shape === 'circle'
        ? od
        : (shape === 'manhole' ? manholeDia + straightLength : val(f.outerW));
      var outerH = shape === 'circle'
        ? od
        : (shape === 'manhole' ? manholeDia : val(f.outerH));
      var innerDia = shape === 'circle' || innerShape === 'circle' ? (shape === 'circle' ? id : val(f.innerDia)) : 0;
      var innerW = innerShape === 'rect' || innerShape === 'manhole' ? val(f.innerW) : innerDia;
      var innerH = innerShape === 'rect' || innerShape === 'manhole' ? val(f.innerH) : innerDia;
      var outerRadius = val(f.outerRadius);
      var innerRadius = val(f.innerRadius);
      var ringWidth = val(f.ringWidth);
      var pcd = val(f.pcd);
      var requestedHoleCount = Math.max(0, Math.round(val(f.holes)));
      var holeDia = patternHasExtraHoles(holePattern) ? val(f.holeDia) : 0;
      var edgeOffset = extractNumber(f.edgeOffset && f.edgeOffset.value);
      var holeSpacing = val(f.holeSpacing);
      var startOffset = val(f.startOffset);
      var h = val(f.h);
      var qty = Math.max(0, Math.round(val(f.qty)));

      if (!(qty > 0)) return null;

      if (shape === 'circle') {
        outerRadius = od / 2;
        innerRadius = hasCenterHole ? id / 2 : 0;

        if (!(od > 0)) return null;
        if (hasCenterHole && (!(id > 0) || id >= od)) return null;
        if (!hasCenterHole) {
          id = 0;
          innerDia = 0;
          innerW = 0;
          innerH = 0;
        }
      } else {
        if (!(outerW > 0) || !(outerH > 0)) return null;

        outerRadius = shape === 'manhole'
          ? Math.min(outerW, outerH) / 2
          : clampRadius(outerW, outerH, outerRadius);

        if (shape === 'manhole') {
          if (!(manholeDia > 0) || !(straightLength > 0)) return null;
          if (hasCenterHole) {
            if (!(ringWidth > 0) || ringWidth * 2 >= manholeDia) return null;
            innerH = manholeDia - ringWidth * 2;
            innerW = innerH + straightLength;
            innerDia = Math.max(innerW, innerH);
            innerRadius = innerH / 2;
          } else {
            innerW = 0;
            innerH = 0;
            innerDia = 0;
            innerRadius = 0;
          }
        } else if (!hasCenterHole) {
          innerW = 0;
          innerH = 0;
          innerDia = 0;
          innerRadius = 0;
        } else if (innerShape === 'circle') {
          if (!(innerDia > 0) || innerDia >= Math.min(outerW, outerH)) return null;
          innerW = innerDia;
          innerH = innerDia;
          innerRadius = innerDia / 2;
        } else {
          if (!(innerW > 0) || !(innerH > 0) || innerW >= outerW || innerH >= outerH) return null;
          innerRadius = clampRadius(innerW, innerH, innerRadius);
        }

        od = Math.max(outerW, outerH);
        id = innerShape === 'circle' ? innerDia : Math.max(innerW, innerH);
      }

      var result = {
        index: index + 1,
        shape: shape,
        holePattern: holePattern,
        hasCenterHole: hasCenterHole,
        innerShape: innerShape,
        od: od,
        id: id,
        outerW: outerW,
        outerH: outerH,
        outerRadius: outerRadius,
        innerDia: innerDia,
        innerW: innerW,
        innerH: innerH,
        innerRadius: innerRadius,
        manholeDia: manholeDia,
        straightLength: straightLength,
        ringWidth: ringWidth,
        pcd: pcd,
        holes: 0,
        requestedHoleCount: holePattern === 'corners' ? 4 : requestedHoleCount,
        holeDia: holeDia,
        startAngle: -90,
        edgeOffset: edgeOffset == null ? 0 : edgeOffset,
        holeSpacing: holeSpacing,
        startOffset: startOffset,
        h: h,
        qty: qty
      };

      if (holePattern === 'bolt-circle' && !(result.pcd > 0)) {
        result.pcd = (result.od + result.id) / 2;
      }

      if ((holePattern === 'corners' || holePattern === 'perimeter') && !(result.edgeOffset > 0)) {
        result.edgeOffset = defaultHoleEdgeOffset(result);
      }

      result.holeCenters = buildHoleCenters(result);
      result.holes = result.holeCenters.length;

      if (patternHasExtraHoles(holePattern)) {
        if (!(holeDia > 0) || !(result.requestedHoleCount > 0) || !result.holeCenters.length) return null;
        if (result.holeCenters.some(function (hole) { return !holeFitsMaterial(result, hole); })) return null;
      }

      return result;
    }

    function readItems() {
      var out = [];

      $all('[data-gasket-item]').forEach(function (item, index) {
        var data = readItem(item, index);
        if (data) out.push(data);
      });

      return out;
    }

    function validateBoltPattern(it, target, messages) {
      var message = '';

      if (patternHasExtraHoles(it.holePattern)) {
        if (!(it.holeDia > 0) || !it.holeCenters || !it.holeCenters.length) {
          message = messages.partial;
        } else if (it.holeCenters.some(function (hole) { return !holeFitsMaterial(it, hole); })) {
          message = messages.noFit;
        }
      }

      if (message) {
        warn(target, message);
        return false;
      }

      return true;
    }

    function readActiveItemForExport() {
      warn(els.svgWarn, '');

      if (!activeItem) activeItem = $all('[data-gasket-item]')[0] || null;

      if (!activeItem) {
        warn(els.svgWarn, I18N.export_invalid);
        return null;
      }

      var items = $all('[data-gasket-item]');
      var index = Math.max(0, items.indexOf(activeItem));
      var item = readItem(activeItem, index);

      if (!item) {
        warn(els.svgWarn, I18N.export_invalid);
        return null;
      }

      if (!validateBoltPattern(item, els.svgWarn, {
        partial: I18N.export_bolt_partial,
        noFit: I18N.export_bolt_no_fit
      })) {
        return null;
      }

      item.qty = 1;

      return item;
    }

    function updateItemTitles() {
      var items = $all('[data-gasket-item]');

      items.forEach(function (item, index) {
        var title = item.querySelector('.gcfg__itemTitle');
        var color = Drawing.getColor(index + 1);
        var remove = item.querySelector('[data-remove]');

        if (title) title.textContent = 'Pakking ' + (index + 1) + ' — ' + color.name;

        item.classList.toggle('is-active', item === activeItem);

        if (remove) remove.style.display = items.length > 1 ? '' : 'none';
      });
    }

    function applyDefaultsToItem(item, defaults) {
      if (!defaults) return;

      var f = itemFields(item);

      if (defaults.shape != null && f.shape) f.shape.value = defaults.shape;
      if (defaults.holePattern != null && f.holePattern) f.holePattern.value = defaults.holePattern;
      if (defaults.od != null && f.od) f.od.value = defaults.od;
      if (defaults.id != null && f.id) f.id.value = defaults.id;
      if (defaults.outerW != null && f.outerW) f.outerW.value = defaults.outerW;
      if (defaults.outerH != null && f.outerH) f.outerH.value = defaults.outerH;
      if (defaults.outerRadius != null && f.outerRadius) f.outerRadius.value = defaults.outerRadius;
      if (defaults.innerShape != null && f.innerShape) f.innerShape.value = defaults.innerShape;
      if (defaults.innerDia != null && f.innerDia) f.innerDia.value = defaults.innerDia;
      if (defaults.innerW != null && f.innerW) f.innerW.value = defaults.innerW;
      if (defaults.innerH != null && f.innerH) f.innerH.value = defaults.innerH;
      if (defaults.innerRadius != null && f.innerRadius) f.innerRadius.value = defaults.innerRadius;
      if (defaults.manholeDia != null && f.manholeDia) f.manholeDia.value = defaults.manholeDia;
      if (defaults.straightLength != null && f.straightLength) f.straightLength.value = defaults.straightLength;
      if (defaults.ringWidth != null && f.ringWidth) f.ringWidth.value = defaults.ringWidth;
      if (defaults.pcd != null && f.pcd) f.pcd.value = defaults.pcd;
      if (defaults.holes != null && f.holes) f.holes.value = defaults.holes;
      if (defaults.holeDia != null && f.holeDia) f.holeDia.value = defaults.holeDia;
      if (defaults.edgeOffset != null && f.edgeOffset) f.edgeOffset.value = defaults.edgeOffset;
      if (defaults.holeSpacing != null && f.holeSpacing) f.holeSpacing.value = defaults.holeSpacing;
      if (defaults.startOffset != null && f.startOffset) f.startOffset.value = defaults.startOffset;
      if (defaults.h != null && f.h) f.h.value = defaults.h;
      if (defaults.qty != null) f.qty.value = defaults.qty;
    }

    function addItem(defaults) {
      var node = els.itemTpl.content.firstElementChild.cloneNode(true);

      els.itemsWrap.appendChild(node);
      prepareItemShapeUI(node);
      applyDefaultsToItem(node, defaults);
      syncShapeUI(node);
      enhanceNumericInputs(node);

      var removeBtn = node.querySelector('[data-remove]');

      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          if ($all('[data-gasket-item]').length <= 1) return;

          if (activeItem === node) activeItem = null;

          node.remove();

          if (!activeItem) activeItem = $all('[data-gasket-item]')[0] || null;

          updateItemTitles();
          renderActivePreview();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      }

      node.querySelectorAll('[data-shape-choice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var f = itemFields(node);
          var nextShape = btn.getAttribute('data-shape-choice') || 'circle';
          if (f.holePattern && (!f.shape || f.shape.value !== nextShape)) f.holePattern.value = '';
          if (f.shape) f.shape.value = nextShape;
          activeItem = node;
          syncShapeUI(node);
          updateItemTitles();
          scheduleRender();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      });

      node.querySelectorAll('[data-pattern-choice]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var f = itemFields(node);
          var nextPattern = btn.getAttribute('data-pattern-choice') || 'center';
          if (f.holePattern) f.holePattern.value = f.holePattern.value === nextPattern ? '' : nextPattern;
          activeItem = node;
          syncShapeUI(node);
          updateItemTitles();
          scheduleRender();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      });

      var clearPatternBtn = node.querySelector('[data-clear-pattern]');
      if (clearPatternBtn) {
        clearPatternBtn.addEventListener('click', function () {
          var f = itemFields(node);
          if (f.holePattern) f.holePattern.value = '';
          activeItem = node;
          syncShapeUI(node);
          updateItemTitles();
          scheduleRender();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      }

      var changeShapeBtn = node.querySelector('[data-change-shape]');
      if (changeShapeBtn) {
        changeShapeBtn.addEventListener('click', function () {
          var f = itemFields(node);
          if (f.shape) f.shape.value = '';
          if (f.holePattern) f.holePattern.value = '';
          activeItem = node;
          syncShapeUI(node);
          updateItemTitles();
          renderActivePreview();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      }

      node.querySelectorAll('input, select').forEach(function (input) {
        input.addEventListener('input', function () {
          if (activeItem !== node) {
            activeItem = node;
            updateItemTitles();
          }
          syncShapeUI(node);
          scheduleRender();
        }, { passive: true });

        input.addEventListener('change', function () {
          if (activeItem !== node) {
            activeItem = node;
            updateItemTitles();
          }
          syncShapeUI(node);
          scheduleRender();
        }, { passive: true });
      });

      if (!activeItem) activeItem = node;

      updateItemTitles();
      renderActivePreview();
    }

    function resetDrawing() {
      warn(els.svgWarn, '');

      if (drawingEls.holesG) drawingEls.holesG.innerHTML = '';
      if (drawingEls.ringFill) drawingEls.ringFill.setAttribute('d', '');
      if (drawingEls.ringOuterPath) drawingEls.ringOuterPath.setAttribute('d', '');
      if (drawingEls.ringInnerPath) drawingEls.ringInnerPath.setAttribute('d', '');

      setA(drawingEls.ringOD, 'r', 0);
      setA(drawingEls.ringID, 'r', 0);
      setA(drawingEls.pcdCircle, 'r', 0);

      if (drawingEls.pcdCircle) drawingEls.pcdCircle.style.display = 'none';

      [
        drawingEls.odExtL,
        drawingEls.odExtR,
        drawingEls.odLine,
        drawingEls.idExtL,
        drawingEls.idExtR,
        drawingEls.idLine,
        drawingEls.pcdExtL,
        drawingEls.pcdExtR,
        drawingEls.pcdLine
      ].forEach(hideLine);

      [
        drawingEls.odText,
        drawingEls.idText,
        drawingEls.pcdText
      ].forEach(hideText);

      if (drawingEls.thkGroup) drawingEls.thkGroup.style.display = 'none';
    }

    function renderActivePreview() {
      resetDrawing();

      if (!activeItem) return;

      var items = $all('[data-gasket-item]');
      var itemIndex = Math.max(0, items.indexOf(activeItem));
      var it = readItem(activeItem, itemIndex);
      var thickness = it && it.h > 0 ? it.h : null;

      if (!it) {
        var shapeField = activeItem.querySelector('[data-field="shape"]');
        warn(els.svgWarn, shapeField && !shapeField.value
          ? I18N.choose_shape
          : I18N.invalid);
        return;
      }

      var cx = 320;
      var cy = 255;
      var maxPreview = 280;
      var scale = maxPreview / Math.max(it.outerW, it.outerH);
      var outerW = it.outerW * scale;
      var outerH = it.outerH * scale;
      var innerW = it.innerW * scale;
      var innerH = it.innerH * scale;
      var rOuter = Math.max(outerW, outerH) / 2;
      var rInner = Math.max(innerW, innerH) / 2;

      var outerPath = outerPathForItem(it, cx, cy, scale);
      var innerPath = innerPathForItem(it, cx, cy, scale);
      var d = outerPath + (innerPath ? ' ' + innerPath : '');

      if (drawingEls.ringFill) drawingEls.ringFill.setAttribute('d', d);

      if (it.shape === 'circle') {
        setA(drawingEls.ringOD, 'cx', cx);
        setA(drawingEls.ringOD, 'cy', cy);
        setA(drawingEls.ringOD, 'r', outerW / 2);

        setA(drawingEls.ringID, 'cx', cx);
        setA(drawingEls.ringID, 'cy', cy);
        setA(drawingEls.ringID, 'r', it.hasCenterHole && it.innerShape === 'circle' ? innerW / 2 : 0);
      } else {
        if (drawingEls.ringOuterPath) drawingEls.ringOuterPath.setAttribute('d', outerPath);
        if (drawingEls.ringInnerPath) drawingEls.ringInnerPath.setAttribute('d', innerPath || '');
      }

      var outerDimensionLabel = it.shape === 'circle'
        ? 'Ø ' + fmt(it.outerW, 1) + ' mm'
        : fmt(it.outerW, 1) + ' x ' + fmt(it.outerH, 1) + ' mm';
      var innerDimensionLabel = it.innerShape === 'circle'
        ? 'Ø ' + fmt(it.innerW, 1) + ' mm'
        : fmt(it.innerW, 1) + ' x ' + fmt(it.innerH, 1) + ' mm';

      drawDiameterDimension(drawingEls.odExtL, drawingEls.odExtR, drawingEls.odLine, drawingEls.odText, cx - outerW / 2, cx + outerW / 2, cy, 62, outerDimensionLabel, cx, -10);
      if (it.hasCenterHole) {
        drawDiameterDimension(drawingEls.idExtL, drawingEls.idExtR, drawingEls.idLine, drawingEls.idText, cx - innerW / 2, cx + innerW / 2, cy, 96, innerDimensionLabel, cx, -10);
      }

      drawBoltPattern({
        cx: cx,
        cy: cy,
        rOuter: Math.min(outerW, outerH) / 2,
        rInner: it.innerShape === 'circle' ? innerW / 2 : Math.max(innerW, innerH) / 2,
        scale: scale,
        pcd: it.pcd,
        holeDia: it.holeDia,
        holeCount: it.holes,
        holeCenters: it.holeCenters || [],
        showPcd: it.holePattern === 'bolt-circle'
      });

      drawThickness({
        cx: cx,
        cy: cy,
        rOuter: rOuter,
        rInner: rInner,
        thickness: thickness
      });
    }

    function drawDiameterDimension(extL, extR, line, text, xL, xR, cy, yDim, label, textX, textYOffset) {
      setA(extL, 'x1', px(xL));
      setA(extL, 'x2', px(xL));
      setA(extL, 'y1', px(yDim));
      setA(extL, 'y2', px(cy));
      if (extL) extL.style.display = '';

      setA(extR, 'x1', px(xR));
      setA(extR, 'x2', px(xR));
      setA(extR, 'y1', px(yDim));
      setA(extR, 'y2', px(cy));
      if (extR) extR.style.display = '';

      setA(line, 'x1', px(xL));
      setA(line, 'x2', px(xR));
      setA(line, 'y1', px(yDim));
      setA(line, 'y2', px(yDim));
      if (line) line.style.display = '';

      setA(text, 'x', textX);
      setA(text, 'y', yDim + textYOffset);
      if (text) {
        text.style.display = '';
        text.textContent = label;
      }
    }

    function drawBoltPattern(cfg) {
      var centers = cfg.holeCenters || [];
      if (!centers.length || !(cfg.holeDia > 0)) return;

      var rHole = (cfg.holeDia / 2) * cfg.scale;
      var NS = 'http://www.w3.org/2000/svg';

      centers.forEach(function (hole) {
        var circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', cfg.cx + hole.x * cfg.scale);
        circle.setAttribute('cy', cfg.cy + hole.y * cfg.scale);
        circle.setAttribute('r', rHole);
        drawingEls.holesG.appendChild(circle);
      });

      if (cfg.showPcd && cfg.pcd > 0) {
        var rPcd = (cfg.pcd / 2) * cfg.scale;

        if (drawingEls.pcdCircle) {
          drawingEls.pcdCircle.style.display = '';
          setA(drawingEls.pcdCircle, 'cx', cfg.cx);
          setA(drawingEls.pcdCircle, 'cy', cfg.cy);
          setA(drawingEls.pcdCircle, 'r', rPcd);
        }

        var yDimPCD = cfg.cy + cfg.rOuter + 72;
        drawDiameterDimension(drawingEls.pcdExtL, drawingEls.pcdExtR, drawingEls.pcdLine, drawingEls.pcdText, cfg.cx - rPcd, cfg.cx + rPcd, cfg.cy, yDimPCD, 'PCD ' + fmt(cfg.pcd, 1) + ' mm', cfg.cx, 16);
      }
    }

    function drawThickness(cfg) {
      if (!cfg.thickness || !drawingEls.thkGroup) return;

      drawingEls.thkGroup.style.display = '';

      var yTopOD = cfg.cy - cfg.rOuter;
      var yBotOD = cfg.cy + cfg.rOuter;
      var yTopID = cfg.cy - cfg.rInner;
      var yBotID = cfg.cy + cfg.rInner;
      var x1 = 520;
      var x2 = 532;

      setA(drawingEls.thkLeft, 'x1', px(x1));
      setA(drawingEls.thkLeft, 'x2', px(x1));
      setA(drawingEls.thkLeft, 'y1', px(yTopOD));
      setA(drawingEls.thkLeft, 'y2', px(yBotOD));

      setA(drawingEls.thkRight, 'x1', px(x2));
      setA(drawingEls.thkRight, 'x2', px(x2));
      setA(drawingEls.thkRight, 'y1', px(yTopOD));
      setA(drawingEls.thkRight, 'y2', px(yBotOD));

      setA(drawingEls.thkTop, 'x1', px(x1));
      setA(drawingEls.thkTop, 'x2', px(x2));
      setA(drawingEls.thkTop, 'y1', px(yTopOD));
      setA(drawingEls.thkTop, 'y2', px(yTopOD));

      setA(drawingEls.thkBot, 'x1', px(x1));
      setA(drawingEls.thkBot, 'x2', px(x2));
      setA(drawingEls.thkBot, 'y1', px(yBotOD));
      setA(drawingEls.thkBot, 'y2', px(yBotOD));

      setA(drawingEls.thkIdTop, 'x1', px(x1));
      setA(drawingEls.thkIdTop, 'x2', px(x2));
      setA(drawingEls.thkIdTop, 'y1', px(yTopID));
      setA(drawingEls.thkIdTop, 'y2', px(yTopID));

      setA(drawingEls.thkIdBot, 'x1', px(x1));
      setA(drawingEls.thkIdBot, 'x2', px(x2));
      setA(drawingEls.thkIdBot, 'y1', px(yBotID));
      setA(drawingEls.thkIdBot, 'y2', px(yBotID));

      var yDim = yTopOD - 22;

      setA(drawingEls.thkDim, 'x1', px(x1));
      setA(drawingEls.thkDim, 'x2', px(x2));
      setA(drawingEls.thkDim, 'y1', px(yDim));
      setA(drawingEls.thkDim, 'y2', px(yDim));

      setA(drawingEls.thkText, 'x', (x1 + x2) / 2);
      setA(drawingEls.thkText, 'y', yDim - 8);

      if (drawingEls.thkText) drawingEls.thkText.textContent = fmt(cfg.thickness, 1) + ' mm';
    }

    function scheduleRender() {
      if (renderFrame) window.cancelAnimationFrame(renderFrame);

      renderFrame = window.requestAnimationFrame(function () {
        renderFrame = null;
        renderActivePreview();
      });
    }

    function hideCalculatedResult() {
      warn(els.warnBox, '');
      if (els.calcBox) els.calcBox.hidden = true;
    }

    function scheduleAutoCalculation(options) {
      options = options || {};

      if (options.layoutChanged) {
        currentPlateIndex = 0;
        plateRemainderOverrides = {};
      }

      if (autoCalcTimer) window.clearTimeout(autoCalcTimer);

      autoCalcTimer = window.setTimeout(function () {
        autoCalcTimer = null;
        calculatePrice(null, { automatic: true });
      }, 450);
    }

    function setCalculationBusy(busy) {
      if (els.busy) els.busy.hidden = !busy;
      if (els.nestRetry) els.nestRetry.disabled = !!busy;
    }

    function outerArea(it) {
      if (it.shape === 'circle') return circleArea(it.od);

      return roundedRectArea(it.outerW, it.outerH, it.outerRadius);
    }

    function innerArea(it) {
      if (it.innerShape === 'rect' || it.innerShape === 'manhole') {
        return roundedRectArea(it.innerW, it.innerH, it.innerRadius);
      }

      return circleArea(it.innerDia);
    }

    function ringArea(it) {
      var extraHoleArea = (it.holeCenters || []).length * circleArea(it.holeDia);
      return Math.max(0, outerArea(it) - innerArea(it) - extraHoleArea);
    }

    function outerPerimeter(it) {
      if (it.shape === 'circle') return circlePerimeter(it.od);

      return roundedRectPerimeter(it.outerW, it.outerH, it.outerRadius);
    }

    function innerPerimeter(it) {
      if (it.innerShape === 'rect' || it.innerShape === 'manhole') {
        return roundedRectPerimeter(it.innerW, it.innerH, it.innerRadius);
      }

      return circlePerimeter(it.innerDia);
    }

    function processMetricsPerPiece(it, holeMethod) {
      var cutLength = 0;
      var cutContours = 0;
      var pierces = 0;
      var punchedHoles = 0;

      cutLength += outerPerimeter(it);
      cutContours += 1;
      pierces += 1;

      if (innerArea(it) > 0) {
        cutLength += innerPerimeter(it);
        cutContours += 1;
        pierces += 1;
      }

      if (it.holes > 0 && it.holeDia > 0) {
        if (holeMethod === 'punch') {
          punchedHoles += it.holes;
        } else {
          cutLength += it.holes * Math.PI * it.holeDia;
          cutContours += it.holes;
          pierces += it.holes;
        }
      }

      return {
        cutLength: cutLength,
        cutContours: cutContours,
        pierces: pierces,
        punchedHoles: punchedHoles
      };
    }

    function readCostSettings() {
      var remainderMode = !els.remainderMode || els.remainderMode.checked
        ? 'charge'
        : 'discard';

      var nestingOptions = {
        materialMode: remainderMode === 'discard' ? 'used_strip' : 'full_plate',

        /*
          Belangrijk:
          - discard: onderste reststrook rood tonen en niet meerekenen
          - charge: geen automatische rode reststrook door 30%-threshold
        */
        wasteThresholdPct: remainderMode === 'discard' ? 30 : -1,
        strategyIndex: nestingAttempt,
        fastThreshold: 100,
        candidateLimit: 260
      };

      return {
        W: val(els.plateW) || 1500,
        H: val(els.plateH) || 1500,
        edge: val(els.edge),
        gap: val(els.gap),

        platePrice: val(els.platePrice),
        hourRate: val(els.hourRate),
        cutSpeed: val(els.cutSpeed),
        setupMin: val(els.setupMin),
        kerf: val(els.kerf),
        pierceSec: val(els.pierceSec),

        holeMethod: els.holeMethod && els.holeMethod.value ? els.holeMethod.value : 'cut',
        punchSec: val(els.punchSec),
        plateLoadMin: val(els.plateLoadMin),
        plateUnloadMin: val(els.plateUnloadMin),
        moveSec: val(els.moveSec),
        finishSec: val(els.finishSec),

        marginPct: Core.clampMarginPct(val(els.marginPct)),
        minOrder: val(els.minOrder),

        remainderMode: remainderMode,
        nestingOptions: nestingOptions
      };
    }

    function calculateProcessTotals(items, cfg) {
      var totals = {
        qty: 0,
        cutLength: 0,
        cutContours: 0,
        pierces: 0,
        punchedHoles: 0,
        ringArea: 0
      };

      items.forEach(function (it) {
        var metrics = processMetricsPerPiece(it, cfg.holeMethod);

        totals.qty += it.qty;
        totals.cutLength += metrics.cutLength * it.qty;
        totals.cutContours += metrics.cutContours * it.qty;
        totals.pierces += metrics.pierces * it.qty;
        totals.punchedHoles += metrics.punchedHoles * it.qty;
        totals.ringArea += ringArea(it) * it.qty;
      });

      return totals;
    }

    function calculateItemPrices(items, cfg, moneyData) {
      var lines = [];
      var sharedMinutes = cfg.setupMin + moneyData.plateHandlingMinutes;
      var finalScale = moneyData.subtotal > 0
        ? moneyData.totalCost / moneyData.subtotal
        : 0;
      var placements = [];
      var allocationInputs = [];

      items.forEach(function (it) {
        var m = processMetricsPerPiece(it, cfg.holeMethod);

        var itemCutIncl = (m.cutLength * it.qty) + (cfg.kerf > 0 ? (m.cutContours * it.qty * cfg.kerf) : 0);
        var itemCutMinutes = cfg.cutSpeed > 0 ? itemCutIncl / cfg.cutSpeed : 0;
        var itemPierceMinutes = (m.pierces * it.qty * cfg.pierceSec) / 60;
        var itemPositioningMinutes = (m.cutContours * it.qty * cfg.moveSec) / 60;
        var itemPunchMinutes = (m.punchedHoles * it.qty * cfg.punchSec) / 60;
        var itemFinishingMinutes = (it.qty * cfg.finishSec) / 60;

        var itemDirectMinutes =
          itemCutMinutes +
          itemPierceMinutes +
          itemPositioningMinutes +
          itemPunchMinutes +
          itemFinishingMinutes;

        allocationInputs.push({
          qty: it.qty,
          outerArea: outerArea(it),
          directMinutes: itemDirectMinutes
        });

        lines.push({
          index: it.index,
          qty: it.qty,
          shape: it.shape,
          od: it.od,
          id: it.id,
          label: itemLabel(it),
          directMinutes: itemDirectMinutes
        });
      });

      ((moneyData.packing && moneyData.packing.plates) || []).forEach(function (plate) {
        placements = placements.concat(plate.placed || []);
      });

      var allocations = Core.allocateItemCosts(
        allocationInputs,
        placements,
        moneyData.materialCost,
        sharedMinutes,
        cfg.hourRate
      );

      lines.forEach(function (line, index) {
        var allocation = allocations[index] || { materialCost: 0, laborCost: 0 };
        var itemMaterialCost = allocation.materialCost;
        var itemLaborCost = allocation.laborCost;
        var itemBaseCost = itemMaterialCost + itemLaborCost;
        var itemTotalCost = itemBaseCost * finalScale;
        var itemPiecePrice = line.qty > 0 ? itemTotalCost / line.qty : 0;

        line.materialCost = itemMaterialCost;
        line.laborCost = itemLaborCost;
        line.totalCost = itemTotalCost;
        line.piecePrice = itemPiecePrice;
        delete line.directMinutes;
      });

      return lines;
    }

    function calculatePrice(event, options) {
      if (event) event.preventDefault();

      options = options || {};
      var requestId = ++calculationSequence;

      if (activeNestingJob && activeNestingJob.cancel) {
        activeNestingJob.cancel();
      }

      setCalculationBusy(true);

      window.setTimeout(function () {
        if (requestId !== calculationSequence) return;

        var operation;

        try {
          operation = calculatePriceNow(options, requestId);
        } catch (error) {
          console.error('Gasket configurator: nestingberekening mislukt.', error);
          hideCalculatedResult();
          warn(els.warnBox, I18N.calc_error);
          if (requestId === calculationSequence) setCalculationBusy(false);
          return;
        }

        Promise.resolve(operation).then(function () {
          if (requestId === calculationSequence) setCalculationBusy(false);
        }, function (error) {
          console.error('Gasket configurator: nestingberekening mislukt.', error);
          hideCalculatedResult();
          warn(els.warnBox, I18N.calc_error);
          if (requestId === calculationSequence) setCalculationBusy(false);
        });
      }, 24);
    }

    function packSynchronously(items, cfg) {
      return items.length === 1
        ? Nesting.packSinglePattern(items[0], cfg.W, cfg.H, cfg.edge, cfg.gap, cfg.nestingOptions)
        : Nesting.packMixedSmart(items, cfg.W, cfg.H, cfg.edge, cfg.gap, cfg.nestingOptions);
    }

    function packInBackground(items, cfg, requestId) {
      var totalQty = items.reduce(function (sum, item) { return sum + item.qty; }, 0);
      var singleRotatable = items.length === 1 &&
        items[0].shape !== 'circle' &&
        Math.abs(items[0].outerW - items[0].outerH) > 0.001;

      if ((!singleRotatable && items.length < 2) || totalQty <= 100 || !window.Worker) return null;

      var workerUrl = findAssetUrl('gasket-configurator-worker.js');
      var nestingUrl = findAssetUrl('gasket-configurator-nesting.js');
      if (!workerUrl || !nestingUrl) return null;

      return new Promise(function (resolve) {
        var worker;
        var timeoutId;
        var settled = false;
        var job = {};

        function cleanup() {
          if (timeoutId) window.clearTimeout(timeoutId);
          if (worker) worker.terminate();
          if (activeNestingJob === job) activeNestingJob = null;
        }

        function finish(packing) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(packing);
        }

        function fallback() {
          if (requestId !== calculationSequence) {
            finish(null);
            return;
          }

          finish(packSynchronously(items, cfg));
        }

        job.cancel = function () {
          finish(null);
        };

        try {
          worker = new window.Worker(workerUrl);
        } catch (error) {
          fallback();
          return;
        }

        activeNestingJob = job;
        timeoutId = window.setTimeout(fallback, 20000);

        worker.addEventListener('message', function (event) {
          var data = event && event.data ? event.data : {};
          if (data.requestId !== requestId) return;
          if (data.error || !data.packing) {
            fallback();
            return;
          }

          data.packing.backgroundMode = true;
          finish(data.packing);
        });
        worker.addEventListener('error', fallback);
        worker.postMessage({
          requestId: requestId,
          nestingUrl: nestingUrl,
          items: items,
          width: cfg.W,
          height: cfg.H,
          edge: cfg.edge,
          gap: cfg.gap,
          options: cfg.nestingOptions
        });
      });
    }

    function applyPlateRemainderChoices(packing, cfg) {
      var plates = (packing && packing.plates) || [];
      var plateArea = Math.max(1, cfg.W * cfg.H);

      plates.forEach(function (plate, index) {
        var baseAnalysis = Nesting.analyzePlate(plate.placed || [], cfg.W, cfg.H, cfg.edge, cfg.gap, {
          materialMode: 'full_plate',
          wasteThresholdPct: 20
        });
        var remainderRatio = baseAnalysis.bottomRemainder
          ? baseAnalysis.bottomRemainder.areaMm2 / plateArea
          : 0;
        var isIntermediateSmallRemainder = index < plates.length - 1 && remainderRatio > 0 && remainderRatio <= 0.20;
        var defaultDiscard = cfg.remainderMode === 'discard' || isIntermediateSmallRemainder;
        var hasOverride = Object.prototype.hasOwnProperty.call(plateRemainderOverrides, index);

        plate.remainderDiscarded = hasOverride
          ? !!plateRemainderOverrides[index]
          : defaultDiscard;
      });
    }

    function calculatePriceNow(options, requestId) {

      options = options || {};

      warn(els.warnBox, '');

      var itemNodes = $all('[data-gasket-item]');
      var items = readItems();
      var hasUnchosenShape = itemNodes.some(function (item) {
        var shapeField = item.querySelector('[data-field="shape"]');
        return shapeField && !shapeField.value;
      });

      if (hasUnchosenShape) {
        hideCalculatedResult();
        if (!options.automatic) warn(els.warnBox, I18N.choose_shape);
        return;
      }

      if (!items.length || items.length !== itemNodes.length) {
        hideCalculatedResult();
        warn(els.warnBox, itemNodes.length ? I18N.invalid : I18N.no_items);
        return;
      }

      for (var i = 0; i < items.length; i++) {
        if (!validateBoltPattern(items[i], els.warnBox, {
          partial: I18N.bolt_partial,
          noFit: I18N.bolt_no_fit
        })) {
          if (options.automatic) hideCalculatedResult();
          return;
        }
      }

      var cfg = readCostSettings();
      var backgroundPacking = packInBackground(items, cfg, requestId);

      if (backgroundPacking) {
        return backgroundPacking.then(function (packing) {
          if (!packing || requestId !== calculationSequence) return;
          finishPriceCalculation(items, cfg, packing, options, requestId);
        });
      }

      return finishPriceCalculation(items, cfg, packSynchronously(items, cfg), options, requestId);
    }

    function finishPriceCalculation(items, cfg, packing, options, requestId) {
      if (requestId !== calculationSequence) return;

      if (packing.notFit && packing.notFit.length) {
        hideCalculatedResult();
        warn(els.warnBox, I18N.no_fit);
        return;
      }

      if (!packing.plates || !packing.plates.length) {
        hideCalculatedResult();
        warn(els.warnBox, I18N.no_fit);
        return;
      }

      applyPlateRemainderChoices(packing, cfg);

      var mat = Nesting.totalMaterialArea(packing, cfg.W, cfg.H, cfg.edge, cfg.nestingOptions);

      var plateAreaM2 = (cfg.W * cfg.H) / 1000000;
      var pricePerM2 = plateAreaM2 > 0 ? cfg.platePrice / plateAreaM2 : 0;

      var materialAreaM2 = (mat.areaMm2 || 0) / 1000000;
      var materialCost = materialAreaM2 * pricePerM2;

      var totals = calculateProcessTotals(items, cfg);
      var plateCount = packing.plates.length;

      var kerfAllowance = cfg.kerf > 0 ? totals.cutContours * cfg.kerf : 0;
      var totalCutIncl = totals.cutLength + kerfAllowance;
      var totalCutM = totalCutIncl / 1000;

      var cutMinutes = cfg.cutSpeed > 0 ? totalCutIncl / cfg.cutSpeed : 0;
      var pierceMinutes = (totals.pierces * cfg.pierceSec) / 60;
      var positioningMinutes = (totals.cutContours * cfg.moveSec) / 60;
      var punchMinutes = (totals.punchedHoles * cfg.punchSec) / 60;
      var plateHandlingMinutes = plateCount * (cfg.plateLoadMin + cfg.plateUnloadMin);
      var finishingMinutes = (totals.qty * cfg.finishSec) / 60;

      var totalMinutes =
        cfg.setupMin +
        plateHandlingMinutes +
        cutMinutes +
        pierceMinutes +
        positioningMinutes +
        punchMinutes +
        finishingMinutes;

      var laborCost = (totalMinutes / 60) * cfg.hourRate;
      var subtotal = materialCost + laborCost;
      var totalCost = Core.resolveSalePrice(subtotal, cfg.marginPct, cfg.minOrder, pricingIntent);
      var averagePricePerPiece = totals.qty > 0 ? totalCost / totals.qty : 0;
      var wastePct = mat.areaMm2 > 0 ? ((mat.areaMm2 - totals.ringArea) / mat.areaMm2) * 100 : 0;

      var lastPlate = packing.plates[packing.plates.length - 1] || { placed: [] };

      var itemPrices = calculateItemPrices(items, cfg, {
        materialCost: materialCost,
        plateHandlingMinutes: plateHandlingMinutes,
        cutMinutes: cutMinutes,
        pierceMinutes: pierceMinutes,
        positioningMinutes: positioningMinutes,
        punchMinutes: punchMinutes,
        finishingMinutes: finishingMinutes,
        subtotal: subtotal,
        totalCost: totalCost,
        packing: packing
      });

      var calculationData = {
        items: items,
        packing: packing,
        mat: mat,
        lastPlate: lastPlate,
        cfg: cfg,
        totals: totals,
        plateCount: plateCount,
        materialAreaM2: materialAreaM2,
        pricePerM2: pricePerM2,
        materialCost: materialCost,
        totalCutM: totalCutM,
        cutMinutes: cutMinutes,
        pierceMinutes: pierceMinutes,
        positioningMinutes: positioningMinutes,
        punchMinutes: punchMinutes,
        plateHandlingMinutes: plateHandlingMinutes,
        finishingMinutes: finishingMinutes,
        totalMinutes: totalMinutes,
        laborCost: laborCost,
        subtotal: subtotal,
        totalCost: totalCost,
        averagePricePerPiece: averagePricePerPiece,
        wastePct: wastePct,
        itemPrices: itemPrices
      };

      lastCalculationData = calculationData;
      currentPlateIndex = Math.max(0, Math.min(currentPlateIndex, packing.plates.length - 1));
      renderPriceResult(calculationData);
      renderNestWorkspace(calculationData);

      if (els.calcBox) {
        els.calcBox.hidden = false;

        if (!options.automatic && els.calcBox.scrollIntoView) {
          els.calcBox.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }

    function renderNestWorkspace(data) {
      if (!data || !data.packing || !data.packing.plates || !data.packing.plates.length) return;

      var plates = data.packing.plates;
      currentPlateIndex = Math.max(0, Math.min(currentPlateIndex, plates.length - 1));

      if (els.nestSvg) {
        Drawing.drawNest(
          els.nestSvg,
          data.cfg.W,
          data.cfg.H,
          data.packing,
          data.items,
          data.cfg.edge,
          Nesting,
          { plateIndex: currentPlateIndex }
        );
      }

      if (els.nestIndicator) {
        var platePieceCount = (plates[currentPlateIndex].placed || []).length;
        els.nestIndicator.textContent = 'Plaat ' + (currentPlateIndex + 1) + ' van ' + plates.length +
          ' \u2022 ' + platePieceCount + (platePieceCount === 1 ? ' pakking' : ' pakkingen');
      }

      if (els.nestPrev) els.nestPrev.disabled = currentPlateIndex <= 0;
      if (els.nestNext) els.nestNext.disabled = currentPlateIndex >= plates.length - 1;

      if (els.nestStrategy) {
        var strategyLabels = ['Gemengde indeling', 'Oppervlakte eerst', 'Breedte eerst'];
        els.nestStrategy.textContent = data.packing.fastMode
          ? 'Snelle indeling voor grote aantallen'
          : (data.packing.backgroundMode
            ? 'Uitgebreide achtergrondindeling'
          : (data.packing.layout && data.packing.layout.name
            ? data.packing.layout.name
            : strategyLabels[nestingAttempt]));
      }

      var plate = plates[currentPlateIndex];
      var analysis = plate.analysis || Nesting.analyzePlate(plate.placed || [], data.cfg.W, data.cfg.H, data.cfg.edge, data.cfg.gap, {
        materialMode: plate.remainderDiscarded ? 'used_strip' : 'full_plate',
        wasteThresholdPct: 20
      });
      var remainderArea = analysis.bottomRemainder ? analysis.bottomRemainder.areaMm2 : 0;
      var remainderPct = data.cfg.W * data.cfg.H > 0 ? remainderArea / (data.cfg.W * data.cfg.H) * 100 : 0;

      if (els.plateRemainder) els.plateRemainder.checked = !!plate.remainderDiscarded;
      if (els.plateRemainderText) {
        els.plateRemainderText.textContent = fmt(remainderPct, 1) + '% onderste reststrook • ' +
          (plate.remainderDiscarded ? 'rood en niet doorberekend' : 'wordt doorberekend');
      }
    }

    function showPlate(index) {
      if (!lastCalculationData || !lastCalculationData.packing) return;

      var maxIndex = lastCalculationData.packing.plates.length - 1;
      var nextIndex = Math.max(0, Math.min(maxIndex, index));
      if (nextIndex === currentPlateIndex) return;

      currentPlateIndex = nextIndex;
      renderNestWorkspace(lastCalculationData);
    }

    function renderPriceResult(data) {
      if (!els.priceResult) return;

      var discardedM2 = ((data.mat && data.mat.discardedAreaMm2) || 0) / 1000000;
      var chargedAreaM2 = ((data.mat && data.mat.areaMm2) || 0) / 1000000;
      var chargedPlates = data.mat && data.mat.chargedPlates != null
        ? data.mat.chargedPlates
        : data.mat.fullPlates;

      var restCost = discardedM2 * data.pricePerM2;
      var discardedPlateCount = data.packing.plates.filter(function (plate) {
        return plate.remainderDiscarded;
      }).length;
      var restSummary = discardedM2 > 0
        ? 'Reststrook niet doorgerekend op ' + discardedPlateCount + ' plaat/platen: ' + fmt(discardedM2, 3) + ' m² (' + money(restCost) + ' materiaalwaarde).'
        : 'Restmateriaal wordt meegerekend in de materiaalprijs; doorberekend oppervlak is ' + fmt(chargedAreaM2, 3) + ' m².';

      var marginEuro = data.totalCost - data.subtotal;
      var marginPct = Core.grossMarginPct(data.subtotal, data.totalCost);

      els.priceResult.innerHTML =
        '<div class="gcfg__resultSummary" data-gcfg-pricing>' +
          '<div class="gcfg__summaryGrid">' +
            resultMetric('Plaatmateriaal', fmt(chargedAreaM2, 3) + ' m²', money(data.materialCost), restSummary) +
            resultMetric('Tijd', fmt(data.totalMinutes, 1) + ' min', money(data.laborCost), 'Totale machine-/arbeidstijd en tijdkosten.') +
            resultMetric('Kostprijs', money(data.subtotal), 'materiaal + tijd', 'Exclusief marge; minimum orderbedrag staat hieronder bij details.') +
            editableResultMetric('Verkoopprijs', 'salePrice', num(data.totalCost, 2), '0.01', '€', '', 'Klik op de waarde om de verkoopprijs vast te zetten.', 0, null) +
            editableResultMetric('Brutomarge %', 'marginPct', num(marginPct, 2), '0.1', '', '%', 'Blijft bij nieuwe maten als percentage behouden.', 0, 99.9) +
            editableResultMetric('Marge €', 'marginEuro', num(marginEuro, 2), '0.01', '€', '', 'Blijft bij nieuwe maten als eurobedrag behouden.', 0, null) +
          '</div>' +

          '<div class="gcfg__resultNote" data-gcfg-value="minimumWarning">' +
            'Gemiddeld per pakking: ' + money(data.averagePricePerPiece) + '.' +
          '</div>' +

          '<div class="gcfg__lineItems" data-gcfg-value="itemPrices">' +
            renderItemPriceCards(data, data.totalCost) +
          '</div>' +

          '<details class="gcfg__resultDetails">' +
            '<summary>Uitgebreide berekening tonen</summary>' +
            '<div class="gcfg__detailsBody">' +
              renderDetailedResult(data, chargedAreaM2, discardedM2, chargedPlates) +
            '</div>' +
          '</details>' +
        '</div>';

      enhanceNumericInputs(els.priceResult);
      bindPricingControls(els.priceResult.querySelector('[data-gcfg-pricing]'), data);
    }

    function resultMetric(label, value, subvalue, hint) {
      return (
        '<div class="gcfg__metric">' +
          '<div class="gcfg__metricLabel">' + label + '</div>' +
          '<div class="gcfg__metricValue">' + value + '</div>' +
          '<div class="gcfg__metricSub">' + subvalue + '</div>' +
          '<div class="gcfg__metricHint">' + hint + '</div>' +
        '</div>'
      );
    }

    function editableResultMetric(label, key, value, step, prefix, suffix, hint, minValue, maxValue) {
      var range = minValue != null ? ' min="' + minValue + '"' : '';
      if (maxValue != null) range += ' max="' + maxValue + '"';

      return (
        '<div class="gcfg__metric gcfg__metric--editable">' +
          '<span class="gcfg__metricLabel">' + label + '</span>' +
          '<span class="gcfg__editableValue">' +
            (prefix ? '<span class="gcfg__valueAffix">' + prefix + '</span>' : '') +
            '<input class="gcfg__input gcfg__priceInput" type="number"' + range + ' step="' + step + '" value="' + value + '" aria-label="' + label + '" data-gcfg-input="' + key + '">' +
            (suffix ? '<span class="gcfg__valueAffix">' + suffix + '</span>' : '') +
          '</span>' +
          '<span class="gcfg__metricHint">' + hint + '</span>' +
        '</div>'
      );
    }

    function renderItemPriceCards(data, salePrice) {
      var scale = data.subtotal > 0 ? salePrice / data.subtotal : 0;

      return data.itemPrices.map(function (line) {
        var color = Drawing.getColor(line.index);
        var baseCost = line.materialCost + line.laborCost;
        var lineTotal = baseCost * scale;
        var piecePrice = line.qty > 0 ? lineTotal / line.qty : 0;

        return (
          '<div class="gcfg__lineItem">' +
            '<div class="gcfg__lineMain">' +
              '<strong>Pakking ' + line.index + ' (' + color.name + ')</strong>' +
              '<span>' + escXml(line.label || 'Pakking') + '</span>' +
            '</div>' +
            '<div class="gcfg__lineMeta">' +
              '<span>Aantal: <strong>' + line.qty + '</strong></span>' +
              '<span>Kostprijs: <strong>' + money(baseCost) + '</strong></span>' +
              '<span>Verkoop/stuk: <strong>' + money(piecePrice) + '</strong></span>' +
              '<span>Regeltotaal: <strong>' + money(lineTotal) + '</strong></span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    function bindPricingControls(container, data) {
      if (!container) return;

      var saleInput = container.querySelector('[data-gcfg-input="salePrice"]');
      var marginPctInput = container.querySelector('[data-gcfg-input="marginPct"]');
      var marginEuroInput = container.querySelector('[data-gcfg-input="marginEuro"]');
      var itemPrices = container.querySelector('[data-gcfg-value="itemPrices"]');
      var minimumWarning = container.querySelector('[data-gcfg-value="minimumWarning"]');
      var syncing = false;

      function readInput(input, fallback) {
        var n = extractNumber(input && input.value);
        return n == null ? fallback : n;
      }

      function setInput(input, value, decimals) {
        if (input) input.value = num(value, decimals == null ? 2 : decimals);
      }

      function renderState(salePrice, source) {
        salePrice = Math.max(0, salePrice);

        var marginEuro = salePrice - data.subtotal;
        var marginPct = Core.grossMarginPct(data.subtotal, salePrice);
        var average = data.totals.qty > 0 ? salePrice / data.totals.qty : 0;

        syncing = true;

        if (source !== 'sale') setInput(saleInput, salePrice, 2);
        if (source !== 'pct') setInput(marginPctInput, marginPct, 2);
        if (source !== 'euro') setInput(marginEuroInput, marginEuro, 2);

        syncing = false;

        if (itemPrices) itemPrices.innerHTML = renderItemPriceCards(data, salePrice);

        if (minimumWarning) {
          minimumWarning.textContent = salePrice < data.cfg.minOrder
            ? 'Let op: onder minimum orderbedrag (' + money(data.cfg.minOrder) + ').'
            : 'Gemiddeld per pakking: ' + money(average) + '.';
        }
      }

      if (saleInput) {
        saleInput.addEventListener('input', function () {
          if (syncing) return;
          var salePrice = readInput(saleInput, data.totalCost);
          pricingIntent = { mode: 'salePrice', value: salePrice };
          renderState(salePrice, 'sale');
        });
      }

      if (marginPctInput) {
        marginPctInput.addEventListener('input', function () {
          if (syncing) return;
          var pct = Core.clampMarginPct(readInput(marginPctInput, data.cfg.marginPct));
          pricingIntent = { mode: 'marginPct', value: pct };
          renderState(Core.salePriceForMargin(data.subtotal, pct), 'pct');
        });
      }

      if (marginEuroInput) {
        marginEuroInput.addEventListener('input', function () {
          if (syncing) return;
          var marginEuro = readInput(marginEuroInput, 0);
          pricingIntent = { mode: 'marginEuro', value: marginEuro };
          renderState(data.subtotal + marginEuro, 'euro');
        });
      }

      renderState(data.totalCost, '');
    }

    function renderDetailedResult(data, chargedAreaM2, discardedM2, chargedPlates) {
      var itemLines = data.items.map(function (it) {
        var color = Drawing.getColor(it.index);

        return 'Pakking ' +
          it.index +
          ' (' +
          color.name +
          '): ' +
          itemLabel(it) +
          ' • ' +
          innerLabel(it) +
          ' • aantal ' +
          it.qty;
      }).join('<br>');

      var layoutInfo = '';

      if (data.packing.mode === 'single') {
        layoutInfo =
          'Beste patroon: ' + data.packing.layout.name + '<br>' +
          'Raster: ' + data.packing.layout.gridCount + ' stuks per plaat<br>' +
          'Versprongen: ' + data.packing.layout.staggeredCount + ' stuks per plaat<br>' +
          'Maximaal per plaat: <strong>' + data.packing.perPlate + '</strong><br>' +
          '<em>Grijze posities zijn vrije posities en tellen niet mee.</em><br>';
      } else {
        layoutInfo =
          'Slimme gemixte indeling: pakkingtypes worden afgewisseld en vrije ruimtes en bruikbare binnendiameters worden benut.<br>' +
          '<em>Bij meerdere pakkingtypes worden grijze vrije posities uitgezet om verwarring te voorkomen.</em><br>';
      }

      var holeMethodLabel = data.cfg.holeMethod === 'punch'
        ? 'Boutgaten stansen'
        : 'Boutgaten CNC snijden';

      var remainderLabel = data.mat.discardedAreaMm2 > 0
        ? fmt(data.mat.discardedAreaMm2 / 1000000, 3) + ' m² niet meegerekend en rood getoond'
        : 'Alle reststroken meegerekend in materiaalprijs';

      return (
        '<strong>Pakkingregels</strong><br>' +
        itemLines +

        '<br><br><strong>Plaatindeling</strong><br>' +
        layoutInfo +
        'Aantal platen nodig: <strong>' + data.plateCount + '</strong><br>' +
        'Gebruikte platen gerekend: ' + data.mat.fullPlates + '<br>' +
        'Doorberekende platen/stroken: ' + fmt(chargedPlates, 2) + '<br>' +
        'Stuks op laatste/restplaat: ' + (data.lastPlate.placed ? data.lastPlate.placed.length : 0) + '<br><br>' +

        '<strong>Materiaal</strong><br>' +
        'Onderste reststrook: ' + remainderLabel + '<br>' +
        'Doorberekend materiaaloppervlak: ' + fmt(chargedAreaM2, 3) + ' m²<br>' +
        'Niet meegerekend/restmateriaal: ' + fmt(discardedM2, 3) + ' m²<br>' +
        'Prijs per m² materiaal: ' + money(data.pricePerM2) + '<br>' +
        'Materiaalkosten: ' + money(data.materialCost) + '<br>' +
        'Verdeling per type: buitenblank per niet-genest stuk; geneste stukken gebruiken restmateriaal.<br>' +
        'Indicatief verlies binnen strook/platen: ' + fmt(Math.max(0, data.wastePct), 1) + '%<br><br>' +

        '<strong>Bewerking</strong><br>' +
        'Bewerkingsmethode boutgaten: ' + holeMethodLabel + '<br>' +
        'Totaal aantal pakkingen: ' + data.totals.qty + '<br>' +
        'CNC-contouren: ' + data.totals.cutContours + '<br>' +
        'Pierces: ' + data.totals.pierces + '<br>' +
        'Gestanste gaten: ' + data.totals.punchedHoles + '<br>' +
        'Totale CNC snijlengte incl. kerf: ' + fmt(data.totalCutM, 2) + ' meter<br><br>' +

        '<strong>Arbeid & machinetijd</strong><br>' +
        'Setup / programma / instellen: ' + fmt(data.cfg.setupMin, 1) + ' min<br>' +
        'Plaat laden/afruimen: ' + fmt(data.plateHandlingMinutes, 1) + ' min<br>' +
        'CNC snijtijd: ' + fmt(data.cutMinutes, 1) + ' min<br>' +
        'Pierce-tijd: ' + fmt(data.pierceMinutes, 1) + ' min<br>' +
        'Positioneren/verplaatsen: ' + fmt(data.positioningMinutes, 1) + ' min<br>' +
        'Stanstijd: ' + fmt(data.punchMinutes, 1) + ' min<br>' +
        'Opruimen/sorteren: ' + fmt(data.finishingMinutes, 1) + ' min<br>' +
        'Totale tijd: <strong>' + fmt(data.totalMinutes, 1) + ' min</strong><br>' +
        'Arbeids-/machinekosten: ' + money(data.laborCost) + '<br><br>' +

        '<strong>Prijsinstellingen</strong><br>' +
        'Subtotaal/kostprijs: ' + money(data.subtotal) + '<br>' +
        'Ingestelde brutomarge: ' + fmt(Core.grossMarginPct(data.subtotal, data.totalCost), 1) + '%<br>' +
        'Minimum orderbedrag: ' + money(data.cfg.minOrder)
      );
    }

    function downloadText(content, type, filename) {
      var blob = new Blob([content], { type: type });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    function exportFilename(it, ext) {
      var base = 'pakking-1stuk-' + safeFilePart(it.shape || 'rond');

      if (it.shape === 'circle') {
        base += '-od' + safeFilePart(num(it.od, 2));
        if (it.hasCenterHole) base += '-id' + safeFilePart(num(it.id, 2));
      } else {
        base +=
          '-' +
          safeFilePart(num(it.outerW, 2)) +
          'x' +
          safeFilePart(num(it.outerH, 2));

        if (it.hasCenterHole) {
          base +=
            '-binnen-' +
            safeFilePart(it.innerShape || 'gat') +
            '-' +
            safeFilePart(num(it.innerW, 2)) +
            'x' +
            safeFilePart(num(it.innerH, 2));
        }
      }

      if (it.holePattern === 'bolt-circle' && it.pcd > 0 && it.holes > 0 && it.holeDia > 0) {
        base +=
          '-pcd' +
          safeFilePart(num(it.pcd, 2)) +
          '-' +
          it.holes +
          'x' +
          safeFilePart(num(it.holeDia, 2));
      }

      return base + '.' + ext;
    }

    function holeCenters(it) {
      return (it.holeCenters || []).map(function (hole) {
        return { x: hole.x, y: hole.y, r: hole.r };
      });
    }

    function roundedRectPoints(w, h, r, steps) {
      w = Math.max(0, w || 0);
      h = Math.max(0, h || 0);
      r = clampRadius(w, h, r);
      steps = Math.max(2, Math.round(steps || 8));

      var hw = w / 2;
      var hh = h / 2;
      var points = [];

      function pushArc(cx, cy, start, end) {
        for (var i = 0; i <= steps; i++) {
          var t = start + (end - start) * (i / steps);
          points.push({
            x: cx + Math.cos(t) * r,
            y: cy + Math.sin(t) * r
          });
        }
      }

      if (r <= 0) {
        return [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh }
        ];
      }

      pushArc(hw - r, -hh + r, -Math.PI / 2, 0);
      pushArc(hw - r, hh - r, 0, Math.PI / 2);
      pushArc(-hw + r, hh - r, Math.PI / 2, Math.PI);
      pushArc(-hw + r, -hh + r, Math.PI, Math.PI * 1.5);

      return points;
    }

    function generateLiveGasketDXF(it) {
      var lines = [];
      var holes = holeCenters(it);
      var ro = Math.max(it.outerW, it.outerH) / 2;

      function add() {
        for (var i = 0; i < arguments.length; i++) lines.push(String(arguments[i]));
      }

      function layer(name, color) {
        add(
          0, 'LAYER',
          2, name,
          70, 0,
          62, color,
          6, 'CONTINUOUS'
        );
      }

      function circle(layerName, x, y, r) {
        add(
          0, 'CIRCLE',
          8, layerName,
          10, num(x, 6),
          20, num(-y, 6),
          30, 0,
          40, num(r, 6)
        );
      }

      function line(layerName, x1, y1, x2, y2) {
        lineXY(layerName, x1, -y1, x2, -y2);
      }

      function lineXY(layerName, x1, y1, x2, y2) {
        add(
          0, 'LINE',
          8, layerName,
          10, num(x1, 6),
          20, num(y1, 6),
          30, 0,
          11, num(x2, 6),
          21, num(y2, 6),
          31, 0
        );
      }

      function arcXY(layerName, cx, cy, radius, startAngle, endAngle) {
        add(
          0, 'ARC',
          8, layerName,
          10, num(cx, 6),
          20, num(cy, 6),
          30, 0,
          40, num(radius, 6),
          50, num(startAngle, 6),
          51, num(endAngle, 6)
        );
      }

      function roundedRect(layerName, width, height, radius) {
        Core.roundedRectEntities(width, height, radius).forEach(function (entity) {
          if (entity.type === 'arc') {
            arcXY(layerName, entity.cx, entity.cy, entity.r, entity.startAngle, entity.endAngle);
          } else {
            lineXY(layerName, entity.x1, entity.y1, entity.x2, entity.y2);
          }
        });
      }

      add(
        0, 'SECTION',
        2, 'HEADER',
        9, '$ACADVER',
        1, 'AC1009',
        9, '$INSUNITS',
        70, 4,
        0, 'ENDSEC'
      );

      add(
        0, 'SECTION',
        2, 'TABLES',
        0, 'TABLE',
        2, 'LAYER',
        70, 8
      );

      layer('CUT_OD', 1);
      layer('CUT_ID', 5);
      layer('CUT_HOLES', 3);
      layer('REF_PCD', 2);
      layer('INFO_TEXT', 7);

      add(
        0, 'ENDTAB',
        0, 'ENDSEC'
      );

      add(
        0, 'SECTION',
        2, 'ENTITIES'
      );

      if (it.shape === 'circle') {
        circle('CUT_OD', 0, 0, it.od / 2);
        if (it.hasCenterHole) circle('CUT_ID', 0, 0, it.id / 2);
      } else {
        roundedRect('CUT_OD', it.outerW, it.outerH, it.outerRadius);

        if (it.hasCenterHole && (it.innerShape === 'rect' || it.innerShape === 'manhole')) {
          roundedRect('CUT_ID', it.innerW, it.innerH, it.innerRadius);
        } else if (it.hasCenterHole) {
          circle('CUT_ID', 0, 0, it.innerDia / 2);
        }
      }

      holes.forEach(function (hole) {
        circle('CUT_HOLES', hole.x, hole.y, hole.r);
      });

      if (it.holePattern === 'bolt-circle' && it.pcd > 0 && it.holes > 0 && it.holeDia > 0) {
        circle('REF_PCD', 0, 0, it.pcd / 2);
      }

      add(
        0, 'TEXT',
        8, 'INFO_TEXT',
        10, num(-ro, 3),
        20, num(-(ro + 14), 3),
        30, 0,
        40, Math.max(3, Math.max(it.outerW, it.outerH) * 0.025),
        1, '1x GASKET ' + shapeLabel(it.shape) + ' ' + num(it.outerW, 2) + 'x' + num(it.outerH, 2) + ' MM'
      );

      add(
        0, 'ENDSEC',
        0, 'EOF'
      );

      return lines.join('\n');
    }

    function generateLiveGasketSVG(it) {
      var margin = Math.max(10, Math.max(it.outerW, it.outerH) * 0.08);
      var sizeW = it.outerW + margin * 2;
      var sizeH = it.outerH + margin * 2;
      var cx = sizeW / 2;
      var cy = sizeH / 2;
      var holes = holeCenters(it);
      var out = '';

      out += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + num(sizeW, 3) + ' ' + num(sizeH, 3) + '" width="' + num(sizeW, 3) + 'mm" height="' + num(sizeH, 3) + 'mm">\n';
      out += '  <title>1x pakking ' + escXml(shapeLabel(it.shape)) + ' ' + escXml(num(it.outerW, 2)) + 'x' + escXml(num(it.outerH, 2)) + ' mm</title>\n';
      out += '  <desc>Lagen: CUT_OD rood, CUT_ID blauw, CUT_HOLES groen, REF_PCD geel. Eenheden zijn millimeters.</desc>\n';

      out += '  <g id="CUT_OD" data-layer="CUT_OD" data-cut="true" stroke="#ff0000" fill="none" stroke-width="0.2">\n';
      if (it.shape === 'circle') {
        out += '    <circle cx="' + num(cx, 6) + '" cy="' + num(cy, 6) + '" r="' + num(it.od / 2, 6) + '" />\n';
      } else {
        out += '    <path d="' + escXml(outerPathForItem(it, cx, cy, 1)) + '" />\n';
      }
      out += '  </g>\n';

      if (it.hasCenterHole) {
        out += '  <g id="CUT_ID" data-layer="CUT_ID" data-cut="true" stroke="#0066ff" fill="none" stroke-width="0.2">\n';
        if (it.innerShape === 'circle') {
          out += '    <circle cx="' + num(cx, 6) + '" cy="' + num(cy, 6) + '" r="' + num(it.innerDia / 2, 6) + '" />\n';
        } else {
          out += '    <path d="' + escXml(innerPathForItem(it, cx, cy, 1)) + '" />\n';
        }
        out += '  </g>\n';
      }

      if (holes.length) {
        out += '  <g id="CUT_HOLES" data-layer="CUT_HOLES" data-cut="true" stroke="#00a651" fill="none" stroke-width="0.2">\n';

        holes.forEach(function (hole) {
          out += '    <circle cx="' + num(cx + hole.x, 6) + '" cy="' + num(cy + hole.y, 6) + '" r="' + num(hole.r, 6) + '" />\n';
        });

        out += '  </g>\n';

        if (it.holePattern === 'bolt-circle') {
          out += '  <g id="REF_PCD" data-layer="REF_PCD" data-cut="false" stroke="#f0b400" fill="none" stroke-width="0.2" stroke-dasharray="4 3">\n';
          out += '    <circle cx="' + num(cx, 6) + '" cy="' + num(cy, 6) + '" r="' + num(it.pcd / 2, 6) + '" />\n';
          out += '  </g>\n';
        }
      }

      out += '</svg>';

      return out;
    }

    function bindEvents() {
      if (els.variant) {
        els.variant.addEventListener('change', applyVariant);
      }

      if (els.addItemBtn) {
        els.addItemBtn.addEventListener('click', function () {
          addItem();
          scheduleAutoCalculation({ layoutChanged: true });
        });
      }

      function scheduleFromField(target) {
        if (target === els.marginPct) pricingIntent = null;

        var layoutChanged = !!target.closest('[data-gasket-item]') ||
          target === els.plateW ||
          target === els.plateH ||
          target === els.edge ||
          target === els.gap ||
          target === els.remainderMode;

        scheduleAutoCalculation({ layoutChanged: layoutChanged });
      }

      root.addEventListener('input', function (event) {
        var target = event.target;
        if (!target || !target.matches('input, select')) return;
        if (target.closest('[data-gcfg-pricing]')) return;
        if (target.closest('[data-nesting-control]')) return;
        scheduleFromField(target);
      });

      root.addEventListener('change', function (event) {
        var target = event.target;
        if (!target || !target.matches('input, select')) return;
        if (target.closest('[data-gcfg-pricing]')) return;
        if (target.closest('[data-nesting-control]')) return;
        scheduleFromField(target);
      });

      if (els.nestRetry) {
        els.nestRetry.addEventListener('click', function () {
          nestingAttempt = (nestingAttempt + 1) % 3;
          currentPlateIndex = 0;
          plateRemainderOverrides = {};
          calculatePrice(null, { automatic: true });
        });
      }

      if (els.nestPrev) {
        els.nestPrev.addEventListener('click', function () {
          showPlate(currentPlateIndex - 1);
        });
      }

      if (els.nestNext) {
        els.nestNext.addEventListener('click', function () {
          showPlate(currentPlateIndex + 1);
        });
      }

      if (els.plateRemainder) {
        els.plateRemainder.addEventListener('change', function () {
          plateRemainderOverrides[currentPlateIndex] = !!els.plateRemainder.checked;
          calculatePrice(null, { automatic: true });
        });
      }

      if (els.nestSvg) {
        els.nestSvg.addEventListener('touchstart', function (event) {
          var touch = event.touches && event.touches[0];
          nestTouchStartX = touch ? touch.clientX : null;
        }, { passive: true });

        els.nestSvg.addEventListener('touchend', function (event) {
          if (nestTouchStartX == null) return;
          var touch = event.changedTouches && event.changedTouches[0];
          var delta = touch ? touch.clientX - nestTouchStartX : 0;
          nestTouchStartX = null;
          if (Math.abs(delta) < 44) return;
          showPlate(currentPlateIndex + (delta < 0 ? 1 : -1));
        }, { passive: true });
      }

      if (els.dxfBtn) {
        els.dxfBtn.addEventListener('click', function () {
          var it = readActiveItemForExport();
          if (!it) return;

          var dxf = generateLiveGasketDXF(it);
          if (dxf) downloadText(dxf, 'application/dxf', exportFilename(it, 'dxf'));
        });
      }

      if (els.svgBtn) {
        els.svgBtn.addEventListener('click', function () {
          var it = readActiveItemForExport();
          if (!it) return;

          var svg = generateLiveGasketSVG(it);
          if (svg) downloadText(svg, 'image/svg+xml', exportFilename(it, 'svg'));
        });
      }
    }

    updateStaticCopy();
    enhanceNumericInputs(root);
    addItem();
    applyVariant();
    bindEvents();
  }
})();
