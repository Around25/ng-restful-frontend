angular.module('app')
  .config(function ($stateProvider, $urlRouterProvider){
    // For any unmatched url, redirect to / for the entire app
    $urlRouterProvider.otherwise("/");

    // Set up the module states
    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'templates/index.html',
        controller: function ($scope, Restangular){
          Restangular.one('users', 1).get().then(function (resp){
            console.log(resp);
          });
        }
      });
  });