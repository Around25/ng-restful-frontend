/**
 * Main application
 */
angular.module('app', [
  'ui.bootstrap', 'ui.router', 'ui.select', 'restangular',
  'app.common', 'app.affiliate', 'app.auth', 'app.buyer', 'app.supplier'
]);