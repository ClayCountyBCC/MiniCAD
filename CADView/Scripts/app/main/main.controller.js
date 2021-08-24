/* global _ */
(function () {
  "use strict";

  angular.module('MiniCadApp')
    .controller('MainController', ['minicadData', 'viewOptions', '$scope', mainController]);

  function mainController(minicadData, viewOptions, $scope) {
    var main = this;
    //console.log('tab', tab);
    $scope.$on('showMap', function () {
      main.showMap = viewOptions.mapOptions.showMap;
    });
    main.units = [];

    minicadData.getUnits()
      .then(function (response) {
        main.units = response.data;
      });


    main.map = {
      basemap: 'streets',
      center: {
        lng: -81.80,
        lat: 29.950
      },
      zoom: 11,
      loaded: false,
      mapOptions: {
        logo: false
      }      
    }

    main.mapLoaded = function (map) {
      main.realMap = map;
      //mapFunctions.updateUnits($scope.unitLayer, $scope.units);
      main.map.loaded = true;
      //console.log('map', main.map);
      //map.resize();
    };


  }

})();