/* global _ */
(function () {
  "use strict";

  angular.module('MiniCadApp')
    .controller('TabController', ['$location', 'viewOptions', tabController]);

  function tabController($location, viewOptions) {
    var tab = this;
    //console.log('tab', tab);
    tab.selected = 0;

    console.log('viewoptions', viewOptions);

    tab.selectTab = function (view) {
      console.log('view', view);
      switch (view.toUpperCase()) {
        case 'MAP':
          viewOptions.mapOptions.showMap = true;
          viewOptions.mapOptions.share();
          break;
        default:
          if (viewOptions.mapOptions.showMap == true) {
            viewOptions.mapOptions.showMap = false;
            viewOptions.mapOptions.share();
          };
      }
      $location.url('/' + view);
      
    }

  }

})();