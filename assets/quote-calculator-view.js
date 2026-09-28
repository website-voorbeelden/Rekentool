(function (global) {
  'use strict';

  function controlKey(element) {
    var data = element.dataset;
    if (data.path) return 'path:' + data.path;
    if (data.rateKey) return 'rate:' + data.rateScenario + ':' + data.rateKey + ':' + data.rateField;
    if (data.pricing) return 'price:' + data.scenario + ':' + (data.line || 'total') + ':' + data.pricing;
    if (element.hasAttribute('data-selected-scenario')) return element.hasAttribute('data-preview-scenario') ? 'preview-supplier' : 'supplier';
    return '';
  }

  function nodeKey(node) {
    if (node.nodeType !== 1) return String(node.nodeType);
    var key = controlKey(node);
    if (node.localName === 'label') {
      var control = node.querySelector('input,select');
      if (control) key = controlKey(control);
    }
    if (!key) {
      ['data-detail', 'data-edit-scope', 'id', 'aria-labelledby', 'data-piece-preview', 'data-comparison-chart', 'data-action'].some(function (name) {
        if (!node.hasAttribute(name)) return false;
        key = name + ':' + node.getAttribute(name);
        return true;
      });
    }
    if (!key) key = (node.getAttribute('class') || '').split(' ')[0];
    return node.namespaceURI + ':' + node.localName + ':' + key;
  }

  function patchNode(current, next, active) {
    if (current.nodeType !== 1) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return;
    }
    function preserveAttribute(name) {
      // Native editing buffers (including incomplete decimals) and open panels stay alive.
      return (current === active && name === 'value') || (current.localName === 'details' && name === 'open');
    }
    Array.from(current.attributes).forEach(function (attribute) {
      if (!preserveAttribute(attribute.name) && !next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    });
    Array.from(next.attributes).forEach(function (attribute) {
      if (!preserveAttribute(attribute.name) && current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
    });
    patchChildren(current, next, active);
    if (current !== active && (current.localName === 'input' || current.localName === 'select') && current.value !== next.value) current.value = next.value;
  }

  function patchChildren(current, next, active) {
    var oldNodes = Array.from(current.childNodes);
    var available = new Map();
    oldNodes.forEach(function (node) {
      var key = nodeKey(node);
      if (!available.has(key)) available.set(key, []);
      available.get(key).push(node);
    });
    var pairs = Array.from(next.childNodes).map(function (node) {
      var candidates = available.get(nodeKey(node));
      return { next: node, current: candidates && candidates.shift() };
    });
    // Remove obsolete siblings first so an input's ancestor need not be moved when
    // an alert or optional field above it disappears (moving it can itself blur it).
    available.forEach(function (nodes) { nodes.forEach(function (node) { node.remove(); }); });
    var cursor = current.firstChild;
    pairs.forEach(function (pair) {
      var node = pair.current || pair.next.cloneNode(true);
      if (node !== cursor) current.insertBefore(node, cursor);
      if (pair.current) patchNode(node, pair.next, active);
      cursor = node.nextSibling;
    });
  }

  function keepPosition(root, update, source, resolveTarget) {
    var active = global.document.activeElement;
    var focused = active && root.contains(active) && /^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY)$/.test(active.tagName);
    var anchor = source || (focused ? active : null);
    var rect = anchor && anchor.isConnected ? anchor.getBoundingClientRect() : null;
    var anchored = rect && rect.bottom > 0 && rect.top < global.innerHeight;
    var left = global.scrollX, top = global.scrollY;
    var selection = focused && typeof active.selectionStart === 'number'
      ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null;
    var scrollContainers = [];
    for (var parent = anchor && anchor.parentElement; parent && parent !== root; parent = parent.parentElement) {
      if (parent.scrollLeft || parent.scrollTop) scrollContainers.push([parent, parent.scrollLeft, parent.scrollTop]);
    }
    update(active);
    if (focused && active.isConnected && global.document.activeElement !== active) {
      active.focus({ preventScroll: true });
      if (selection) active.setSelectionRange(selection[0], selection[1], selection[2]);
    }
    scrollContainers.forEach(function (entry) {
      if (entry[0].isConnected) { entry[0].scrollLeft = entry[1]; entry[0].scrollTop = entry[2]; }
    });
    var target = resolveTarget ? resolveTarget() : anchor;
    if (anchored && target && target.isConnected) {
      var after = target.getBoundingClientRect();
      // A newly added record replaces the clicked button as the viewport anchor.
      left = global.scrollX + after.left - rect.left;
      top = global.scrollY + after.top - rect.top;
    }
    if (global.scrollX !== left || global.scrollY !== top) global.scrollTo({ left: left, top: top, behavior: 'instant' });
  }

  function update(root, html, openDetails, viewportRoot) {
    var template = global.document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('details[data-detail]').forEach(function (element) {
      element.open = openDetails && openDetails.has(element.dataset.detail);
    });
    keepPosition(viewportRoot || root, function (active) { patchChildren(root, template.content, active); });
  }

  global.QuoteCalculatorView = { update: update, keepPosition: keepPosition };
})(window);
