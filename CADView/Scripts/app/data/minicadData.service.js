(function () {
  "use strict";
  // this factory just consumes our webservices.

  angular.module('MiniCadApp')
  .factory('minicadData', ['$http', minicadData]);

  function minicadData($http) {
    return {
      getAdvisories: getAdvisories,
      getActiveCalls: getActiveCalls,
      getHistoricalCalls: getHistoricalCalls,
      getUnits: getUnits,
      getCallDetail: getCallDetail,
      getAddressHistory: getAddressHistory
    }
    //var jqxhr = $.getJSON(")
    //var jqxhr = $.getJSON('')
    //LoadCADCalls("", "#historical");
    function getAdvisories() {
      return $http.get('./CallData/GetAdvisories')
      .then(function (response) {
        console.log('advisory success', response);
        return response;
      }, function (response) {
        console.log('advisory error', response);
        return response;
      });
    }

    function getUnits() {
      return $http.get('./CallData/GetShortUnitStatus', { cache: false })
      .then(function (response) {
        console.log('unit success', response);
        return response;
      }, function (response) {
        console.log('unit error', response);
        return response;
      });
    }

    function getAddressHistory(inciid) {
      return $http.get('./CallData/GetHistoricalCallHistory/' + inciid)
      .then(function (response) {
        console.log('address history success', response);
        return response;
      }, function (response) {
        console.log('address history error', response);
        return response;
      });
    }

    function getCallDetail(inciid) {
      return $http.get('./CallData/GetCallDetail/' + inciid, { cache: false })
      .then(function (response) {
        console.log('call detail success', response);
        return response;
      }, function (response) {
        console.log('call detail error', response);
        return response;
      });
    }

    function getActiveCalls() {
      return $http.get('./CallData/GetActiveCalls', { cache: false })
      .then(function (response) {
        console.log('active calls succcess', response);
        return response;
      }, function (response) {
        console.log('active calls error', response);
        return response;
      });
    }

    function getHistoricalCalls() {
      return $http.get('./CallData/GetHistoricalCalls')
      .then(function (response) {
        console.log('historical calls success', response);
        return response;
      }, function (response) {
        console.log('historical calls error', response);
        return response;
      });
    }


  }


})();