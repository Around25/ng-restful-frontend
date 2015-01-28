/**
 * User Model
 */
angular.module('app.auth')

  .factory('UserModel', function (Restangular) {
    var Users = Restangular.service('user');

    // Extend the mapper with new functionality
    Restangular.extendModel('user', function(model) {

      /**
       * Debug the current user object
       */
      model.debug = function() {
        console.log(this);
      };

      // return the updated model
      return model;
    });

    // Create the mapper from the Restangular service
    return Users;
  });