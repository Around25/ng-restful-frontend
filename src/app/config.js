/**
 * Application configuration
 */
angular.module('app')

  // prefix the hashtag for SEO purposes
  .config(function ($locationProvider) {
    $locationProvider.hashPrefix('!');
  })

  // Configure the ORM
  .config(function(RestangularProvider) {

    // set api base path
    RestangularProvider.setBaseUrl('http://127.0.0.1:8000/api');
    RestangularProvider.setRequestSuffix('.json');

    // load data from the data field of the response
//    RestangularProvider.setResponseExtractor(function(response, operation) {
//      return response.data;
//    });

    // send PUT or PATCH methods in a separate field _method
    RestangularProvider.setMethodOverriders(["put", "patch"]);

  });