angular.module('app.common')
  .config(function ($httpProvider) {
    $httpProvider.interceptors.push('OAuthHttpInterceptor');
  });