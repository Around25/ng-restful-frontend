angular.module('app.auth')
  .controller('LoginController', function ($scope, $state, RestServer){
    $scope.login = function (){
      RestServer.login('cosmin', 'secret').then(function (resp){
        if (!resp.error){
          $state.go('home');
        }
      });
    }
  });