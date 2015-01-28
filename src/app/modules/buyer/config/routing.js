angular.module('app.buyer')
  .config(function ($stateProvider){

    // Set up the module states
    $stateProvider
      .state('buyer', {
        url: '/buyer',
        templateUrl: 'templates/index.html'
      });
  });