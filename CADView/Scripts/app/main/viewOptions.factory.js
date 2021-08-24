(function () {
  "use strict";
  angular.module('MiniCadApp')
      .factory('viewOptions', ['$rootScope', function ($rootScope) {

        var mapOptions = {
          showMap: false,
          share: function () {
            $rootScope.$broadcast('showMap');
          }
        };

        return {
          mapOptions: mapOptions
        };

      }]);


})();