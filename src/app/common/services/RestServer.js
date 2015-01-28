angular.module('app.common')
  /**
   * Dummy configuration for the Rest server
   * @todo Replace this with something that can be used in production
   */
  .factory('RestServerConfig', function (){
    return {
      apiUri: 'http://127.0.0.1:8000/api/',
      tokenUrl: 'http://127.0.0.1:8000/oauth/v2/token',
      clientId: '1_26o6ulfxcysk08s4scks44w0ksc0goc000wo404gkcskgw4s84',
      clientSecret: '9j9xz7l1jv48kgcw8ogw0wcg4ks440408k44kg4cgs04000ks',
      grantType: 'password',
      loginState: 'login'
    };
  })
  .factory('AccessToken', function($http, RestServerConfig){
    /**
     * Access Token class
     * - keeps
     * @param token
     * @param expires_in
     * @param type
     * @param scope
     * @param refresh_token
     * @constructor
     */
    var AccessToken = function (token, expires_in, type, scope, refresh_token) {
      this.update(token, expires_in, type, scope, refresh_token);
    };

    AccessToken.prototype = {
      accessToken: null,
      expiresAt: null,
      type: 'bearer',
      scope: null,
      refreshToken: null,
      /**
       * Update the access token instance with the new fields
       * @param token
       * @param expires_in
       * @param type
       * @param scope
       * @param refresh_token
       */
      update: function (token, expires_in, type, scope, refresh_token) {
        this.accessToken = token;
        this.expiresAt = moment().add(expires_in, 'minutes');
        this.type = type;
        this.scope = scope;
        this.refreshToken = refresh_token;
      },
      /**
       * Check if the access token has expired
       * @returns {*}
       */
      isExpired: function () {
        return moment().isBefore(this.expiresAt);
      },
      /**
       * Refresh the access token and update it with the new values from the server
       * @returns {*}
       */
      refresh: function (){
        var self = this, params = {
          client_id: RestServerConfig.clientId,
          client_secret: RestServerConfig.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        };
        return $http.post({
          method: 'GET',
          url: RestServerConfig.tokenUrl,
          params: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }).then(function (resp){
          if (resp.data.access_token){
            self.update(resp.data.access_token, resp.data.expires_in, resp.data.token_type, resp.data.scope, resp.data.refresh_token);
          }
        });
      }
    };

    return AccessToken;
  })

  .factory('RestServer', function (AccessToken, $q, $http, $state, RestServerConfig) {
    /**
     * An auth api interface to the OAuth server
     *
     * @constructor
     */
    var RestServer = function () {

    };
    RestServer.prototype = {
      accessToken: null,
      /**
       * Get a new access token by logging in a user
       * @param username
       * @param password
       * @returns {promise|getDeferred.promise|fd.g.promise|result.promise|CodeUnit.promise|qFactory.Deferred.promise}
       */
      login: function (username, password){
        var defer = $q.defer();
        var self = this,
          params = {
            client_id: RestServerConfig.clientId,
            client_secret: RestServerConfig.clientSecret,
            grant_type: 'password',
            username: username,
            password: password
          };
        $http(
          {
            method: 'GET',
            url: RestServerConfig.tokenUrl,
            params: params,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
          }).then(function (resp){
            if (resp.data.error){
              return defer.reject(resp.data);
            }
            self.accessToken = new AccessToken(resp.data.access_token, resp.data.expires_in, resp.data.token_type, resp.data.scope, resp.data.refresh_token);
            defer.resolve(self.accessToken);
          });
        return defer.promise;
      },
      /**
       * Go to the login page
       * @returns {promise}
       */
      gotoLoginState: function(){
        return $state.go(RestServerConfig.loginState);
      },
      /**
       * Logout
       */
      logout: function (){
        this.accessToken = null;
      },
      /**
       * Refresh the auth token if needed
       * @returns {*}
       */
      refreshToken: function (){
        var self = this;
        return this.accessToken.refresh().then(function (resp){
          if (resp.error || !resp.access_token){
            self.gotoLoginState();
            return false;
          }
        });
      },
      /**
       * Check if the auth is expired
       * @returns {boolean|*}
       */
      isExpired: function (){
        return !this.isLoggedIn() || this.accessToken.isExpired();
      },
      /**
       * Check if the user is logged in
       * @returns {boolean}
       */
      isLoggedIn: function () {
        return this.accessToken != null;
      }
    };

    return new RestServer();
  })
  .factory('OAuthHttpInterceptor', function ($injector, $q, RestServerConfig){
    return {
      request: function (config) {
        if (config.url.indexOf(RestServerConfig.apiUri)!==0){
          return config;
        }
        var RestServer = $injector.get('RestServer');
        console.log(RestServer.isLoggedIn(), config);
        if (RestServer.isLoggedIn()){
          config.headers.Authorization = 'Bearer '+ RestServer.accessToken.accessToken;
        }
        console.log('After: ', config, RestServer);
        return config;
      },

//      requestError: function (rejection) {
//        return $q.reject(rejection);
//      },
//
//      response: function (response) {
//        return response;
//      },

      responseError: function (rejection) {
        var RestServer = $injector.get('RestServer');
        if (!RestServer.isLoggedIn() && rejection.status==401){
          RestServer.gotoLoginState();
        }
        if (RestServer.isLoggedIn() && rejection.status==401){
          var deferred = $q.defer();
          RestServer.refreshToken().then(function (resp){
            if (resp.error){
              deferred.reject(rejection);
              RestServer.gotoLoginState();
              return;
            }
            var config = rejection.config,
                $http = $injector.get('$http');
            config.headers.Authorization = 'Bearer '+ RestServer.accessToken.accessToken;
            deferred.resolve($http(config));
          });
          return deferred.promise;
        }
        return $q.reject(rejection);
      }
    };
  });
;
