angular.module('MiniCadApp',
  ['ngMaterial'
  , 'esri.map'
  , 'ngRoute'])

  .config(function ($mdThemingProvider, $routeProvider) {
    $mdThemingProvider.theme('default').primaryPalette('red');
    $routeProvider
      .when('/ActiveCalls', {
        controller: 'ActiveCallsController as ac',
        templateUrl: 'Scripts/app/activecalls/activecalls.controller.tmpl.html'
      })
      //.when('/:deptName', {
      //  controller: 'ReportViewController',
      //  templateUrl: 'Scripts/app/report/reportview.controller.tmpl.html'
      //})
      //.when('/Department/:deptId/Report/:reportId/Duration/:duration/Chart/:chartType', {
      //  controller: 'ReportViewController',
      //  templateUrl: 'Scripts/app/report/reportview.controller.tmpl.html'
      //})
      .otherwise({
        controller: 'ActiveCallsController as ac',
        templateUrl: 'Scripts/app/activecalls/activecalls.controller.tmpl.html'
      });
  });




