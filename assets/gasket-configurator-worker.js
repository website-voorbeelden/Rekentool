(function () {
  'use strict';

  self.window = self;

  self.addEventListener('message', function (event) {
    var data = event && event.data ? event.data : {};
    var requestId = data.requestId;

    try {
      if (!self.GasketConfiguratorNesting) {
        importScripts(data.nestingUrl);
      }

      if (!self.GasketConfiguratorNesting) {
        throw new Error('Nestingmodule kon niet in de worker worden geladen.');
      }

      var options = Object.assign({}, data.options || {}, {
        fastThreshold: Math.max(220, Number(data.options && data.options.fastThreshold) || 0)
      });
      var packing = data.items.length === 1
        ? self.GasketConfiguratorNesting.packSinglePattern(
          data.items[0], data.width, data.height, data.edge, data.gap, options
        )
        : self.GasketConfiguratorNesting.packMixedSmart(
          data.items, data.width, data.height, data.edge, data.gap, options
        );

      self.postMessage({ requestId: requestId, packing: packing });
    } catch (error) {
      self.postMessage({
        requestId: requestId,
        error: error && error.message ? error.message : String(error)
      });
    }
  });
})();
