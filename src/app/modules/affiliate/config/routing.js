angular.module('app.affiliate')
  .config(function ($stateProvider){

    // Set up the module states
    $stateProvider
      .state('affiliate', {
        url: '/affiliate',
        templateUrl: 'templates/index.html'
      });
  });