angular.module('app.auth')
  .config(function ($stateProvider){

    // Set up the module states
    $stateProvider
      .state('login', {
        url: '/login',
        templateUrl: 'templates/auth/login.html',
        controller: 'LoginController'
      });
  });