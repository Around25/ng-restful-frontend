/**
 * Application configuration
 */
angular.module('app')

  /**
   * Prefix the hashtag for SEO purposes
   * @param {} $locationProvider
   */
  .config(function ($locationProvider) {
    $locationProvider.hashPrefix('!');
  })

  /**
   * Set auth variables for the API
   * @param {} RestServerConfigProvider
   */
  .config(function (RestServerConfigProvider) {
    RestServerConfigProvider.setConfig({
      baseUrl: 'http://127.0.0.1:8000',
      clientId: '1_26o6ulfxcysk08s4scks44w0ksc0goc000wo404gkcskgw4s84',
      clientSecret: '9j9xz7l1jv48kgcw8ogw0wcg4ks440408k44kg4cgs04000ks'
    });
  })

  /**
   * Configure the ORM
   * @param {} RestangularProvider
   */
  .config(function (RestangularProvider) {
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