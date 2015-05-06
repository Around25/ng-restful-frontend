angular.module('app.common')
  .provider('RestServerConfig', function (){
    var defaults = {
      baseUrl: '',
      apiPath: '/api',
      tokenPath: '/oauth/v2/token',
      clientId: '',
      clientSecret: '',
      grantType: 'password',
      loginState: 'login',
      deniedState: 'denied'
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

    AccessToken.reload = function (data){
      var token = new AccessToken(null, null, null, null, null);
      token.accessToken = data.accessToken;
      token.expiresAt = data.expiresAt;
      token.type = data.type;
      token.scope = data.scope;
      token.refreshToken = data.refreshToken;
      return token;
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
      refresh: function () {
        var self = this, params = {
          client_id: RestServerConfig.clientId,
          client_secret: RestServerConfig.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        };
        return $http({
          method: 'POST',
          url: RestServerConfig.tokenUrl,
//          params: params,
          data: $.param(params),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }).then(function (resp) {
          if (resp.data.access_token) {
            self.update(resp.data.access_token, resp.data.expires_in, resp.data.token_type, resp.data.scope, resp.data.refresh_token);
          }
        });
      }
    };

    return AccessToken;
  })
  .factory('RestServer', function (AccessToken, $q, $http, $state, RestServerConfig, $cookieStore) {

    function loadAccessToken(){
      var accessToken;
      if (accessToken = $cookieStore.get('ec_rest_server')){
        return AccessToken.reload(accessToken);
      }
      return null;
    }

    function saveAccessToken(accessToken){
      $cookieStore.put('ec_rest_server', accessToken);
    }

    /**
     * An auth api interface to the OAuth server
     *
     * @constructor
     */
    var RestServer = function () {
      this.accessToken = loadAccessToken();
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
        $http({
          method: 'POST',
          url: RestServerConfig.tokenUrl,
//          params: params,
          data: $.param(params),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }).then(function (resp) {
          self.accessToken = new AccessToken(resp.data.access_token, resp.data.expires_in, resp.data.token_type, resp.data.scope, resp.data.refresh_token);
          saveAccessToken(self.accessToken);
          defer.resolve(self.accessToken);
        }, function (resp){
          defer.reject(resp.data);
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
      gotoAccessDenied: function () {
        return $state.go(RestServerConfig.deniedState);
      },
      /**
       * Logout
       */
      logout: function () {
        this.accessToken = null;
        saveAccessToken(this.accessToken);
      },
      /**
       * Refresh the auth token if needed
       * @returns {*}
       */
      refreshToken: function () {
        var self = this;
        return this.accessToken.refresh().then(function (resp) {
          saveAccessToken(self.accessToken);
          return resp;
        }, function (resp){
          if (resp.error || !resp.access_token) {
            self.gotoLoginState();
            return false;
          }
        });
      },
      /**
       * Check if the auth is expired
       * @returns {boolean|*}
       */
      isExpired: function () {
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
        // if not logged in redirect to the login state
        if (!RestServer.isLoggedIn() && rejection.status == 401) {
          RestServer.gotoLoginState();
        }

        // if logged in and 403 redirect to access denied state
        if (RestServer.isLoggedIn() && rejection.status == 403) {
          RestServer.gotoAccessDenied();
        }

        // if logged in and 401 refresh the token and try again
        if (RestServer.isLoggedIn() && rejection.status == 401) {
          var deferred = $q.defer();
          RestServer.refreshToken().then(function (resp) {
            if (resp && resp.error) {
              deferred.reject(rejection);
              RestServer.gotoLoginState();
              return $q.reject(rejection);
            }
            var config = rejection.config,
              $http = $injector.get('$http');
            config.headers.Authorization = 'Bearer ' + RestServer.accessToken.accessToken;
            deferred.resolve($http(config));
          }, function (){
            deferred.reject(rejection);
            RestServer.gotoLoginState();
            return $q.reject(rejection);
          });
          return deferred.promise;
        }
        return $q.reject(rejection);
      }
    };
  });