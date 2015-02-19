angular.module('app.common')
  .provider('RestServerConfig', function (){
    var defaults = {
      baseUrl: '',
      apiPath: '/api',
      tokenPath: '/oauth/v2/token',
      clientId: '',
      clientSecret: '',
      grantType: 'password',
      loginState: 'login'
    };

    this.setConfig = function (config){
      this.config = angular.extend({}, defaults, config);
      this.config.apiUrl = this.config.baseUrl + this.config.apiPath;
      this.config.tokenUrl = this.config.baseUrl + this.config.tokenPath;
    };

    this.setConfig({});

    this.$get = function () {
      return this.config
    };
  })
  .factory('AccessToken', function ($http, RestServerConfig) {
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
       * Refresh the access token and update it with the new values from the server
       * @returns {*}
       */
      refresh: function () {
        var self = this, params = {
          client_id: RestServerConfig.clientId,
          client_secret: RestServerConfig.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        };
        return $http.post(RestServerConfig.tokenUrl, params).then(function (resp) {
          if (resp.data.access_token) {
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
      login: function (username, password) {
        var defer = $q.defer();
        var self = this,
          params = {
            client_id: RestServerConfig.clientId,
            client_secret: RestServerConfig.clientSecret,
            grant_type: 'password',
            username: username,
            password: password
          };
        $http.post(RestServerConfig.tokenUrl, params).then(function (resp) {
          if (resp.data.error) {
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
      gotoLoginState: function () {
        return $state.go(RestServerConfig.loginState);
      },
      /**
       * Logout
       */
      logout: function () {
        this.accessToken = null;
      },
      /**
       * Refresh the auth token if needed
       * @returns {*}
       */
      refreshToken: function () {
        var self = this;
        return this.accessToken.refresh().then(function (resp) {
          if (resp.error || !resp.access_token) {
            self.gotoLoginState();
            return false;
          }
        });
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
  .factory('OAuthHttpInterceptor', function ($injector, $q, RestServerConfig) {
    return {
      request: function (config) {
        if (config.url.indexOf(RestServerConfig.apiUrl) !== 0) {
          return config;
        }
        var RestServer = $injector.get('RestServer');
        if (RestServer.isLoggedIn()) {
          config.headers.Authorization = 'Bearer ' + RestServer.accessToken.accessToken;
        }
        return config;
      },
      responseError: function (rejection) {
        var RestServer = $injector.get('RestServer');
        if (!RestServer.isLoggedIn() && rejection.status == 401) {
          RestServer.gotoLoginState();
        }
        if (RestServer.isLoggedIn() && rejection.status == 401) {
          var deferred = $q.defer();
          RestServer.refreshToken().then(function (resp) {
            if (resp.error) {
              deferred.reject(rejection);
              RestServer.gotoLoginState();
              return;
            }
            var config = rejection.config,
              $http = $injector.get('$http');
            config.headers.Authorization = 'Bearer ' + RestServer.accessToken.accessToken;
            deferred.resolve($http(config));
          });
          return deferred.promise;
        }
        return $q.reject(rejection);
      }
    };
  });