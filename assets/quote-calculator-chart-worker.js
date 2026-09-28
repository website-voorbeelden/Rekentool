self.window = self;
var revision = self.location ? self.location.search : '';
importScripts('gasket-configurator-nesting.js' + revision, 'quote-calculator-core.js' + revision, 'quote-calculator-chart.js' + revision);
self.onmessage = function (event) {
  var request = event.data || {};
  try {
    var model = self.QuoteCalculatorChart.build(request.state, self.QuoteCalculatorCore, self.GasketConfiguratorNesting);
    self.postMessage({ id: request.id, model: model });
  } catch (error) {
    self.postMessage({ id: request.id, error: 'De hoeveelheidsgrafiek kon niet worden berekend.' });
  }
};
