/*global lastactivedata, currentactivedata, lasthistoricaldata, lastunitdata, currentunit*/
"use strict";
var map = null;
var basemapToggle = null;
var defaultExtent = null;
var geocoder;
var locatorUrl = "https://maps.claycountygov.com:6080/arcgis/rest/services/Address_Site_Locator/GeocodeServer";
var InciLayer, HistoryLayer, USNGOverlay, RadarLayer, fireResponse, CallerLocationsLayer, VehicleLayer,
  WeatherWarningLayer, LocationLayer, TestGrid, RadioLayer, ExtraMapPointsLayer, ExtraMapPointsByCallLayer;
var locateButton;
var WorldTranspo = null;
var showAvailable = 0;
var unitFilter = '';
var availStatus = ["Available", "Available-Out-of-District"];

//http://static.arcgis.com/images/Symbols/Shapes/PurplePin1LargeB.png
//http://static.arcgis.com/images/Symbols/Shapes/OrangePin1LargeB.png

function IsFairTime() {
  var d = new Date();
  var month = d.getMonth();
  var day = d.getDate();
  //return true;
  return ((month === 1 && day > 25) || month === 2  || (month === 3 && day < 14));
  //if (d.getMonth() == 2 && d.getDate() > 25) {
  //  return true;
  //} else if (d.getMonth() == 3 && d.getDate() < 14) {
  //  return true;
  //}
  //return false;
}

//function ShowExtraMapPointsLayer()
//{
//  if (ExtraMapPointsLayer !== undefined)
//  {
//    if (ExtraMapPointsLayer.visible)
//    {
//      ExtraMapPointsLayer.hide();
//    }
//    else
//    {
//      ExtraMapPointsLayer.show();
//    }
//  }
//}

function ShowCallerLocationsLayer()
{
  if (CallerLocationsLayer !== undefined)
  {
    if (CallerLocationsLayer.visible)
    {
      CallerLocationsLayer.hide();
    }
    else
    {
      CallerLocationsLayer.show();
    }
  }
}

function mapInit() {
  if (map !== null || mapresizing === true) { return false; }
  mapresizing = true;
  require([
    "esri/map",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/dijit/BasemapToggle",
    "esri/dijit/HomeButton",
    "esri/layers/GraphicsLayer",
    "esri/layers/FeatureLayer",
    "dojo/parser",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/dijit/LocateButton",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ArcGISImageServiceLayer"],
  function (Map, ArcGISDynamicMapServiceLayer, BasemapToggle, HomeButton, GraphicsLayer, FeatureLayer, parser, Point, SpatialReference,
              LocateButton, Tiled, ArcGISImageServiceLayer) {
    if (map === null) {
      parser.parse();

      map = new esri.Map("map", {
        basemap: "osm",
        center: [-81.80, 29.950], // lon, lat
        zoom: 11,
        logo: false
      });
      if (currentlat !== null) {
        mapload = map.on('onLoad', ShowMap());
      }
      else
      {
        LoadRadioData();
        //LoadExtraMapPoints();
        // Re-enable after this fixed.
        //LoadCallerLocations();
      }
      if (IsFairTime()) {
        var fairMap = new ArcGISImageServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairImage/ImageServer');
        map.addLayer(fairMap);
        var fairAccess = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairAccess/MapServer');
        map.addLayer(fairAccess);
      }
      fireResponse = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/Fire_Response/MapServer');
      map.addLayer(fireResponse); // was port 6080 for regular http
      var siteAddresses = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/SiteAddresses/MapServer');
      map.addLayer(siteAddresses);
      // Test grid overlay for motorola rollout
      //TestGrid = new ArcGISDynamicMapServiceLayer('://maps.claycountygov.com:6443/arcgis/rest/services/Motorola_Test/MapServer');
      //map.addLayer(TestGrid);
      //TestGrid.hide();

      WeatherWarningLayer = new ArcGISDynamicMapServiceLayer('//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Forecasts_Guidance_Warnings/watch_warn_adv/MapServer');
      //WeatherWarningLayer.opacity = .5;
      WeatherWarningLayer.refreshInterval = 5;


      WeatherWarningLayer.hide();
      map.addLayer(WeatherWarningLayer);

      RadarLayer = new ArcGISDynamicMapServiceLayer('//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Observations/radar_base_reflectivity/MapServer');
      RadarLayer.setRefreshInterval(30000);
      RadarLayer.setDisableClientCaching(true);
      //RadarLayer.refreshInterval = 1;
      //RadarLayer.disableClientCaching(true);
      
      RadarLayer.opacity = .5;
      RadarLayer.hide();
      map.addLayer(RadarLayer);

      WorldTranspo = new Tiled('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer');
      //WorldTranspo = new ArcGISDynamicMapServiceLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer');
      map.addLayer(WorldTranspo);
      WorldTranspo.hide();
      var toggle = new BasemapToggle({
        map: map,
        basemap: "satellite" //hybrid
      }, "BasemapToggle");
      toggle.startup();
      toggle.on("toggle", function () {
        if (WorldTranspo !== null) {
          if (toggle.basemap === 'satellite') {
            WorldTranspo.hide();
          } else {
            WorldTranspo.show();
          }
        }
      });

      defaultExtent = new esri.geometry.Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145,
          new esri.SpatialReference({ wkid: 4326 }));
      var home = new HomeButton({
        map: map,
        extent: defaultExtent
      }, "HomeButton");
      home.startup();
      //geoLocate = new LocateButton({
      //  map: map,
      //  useTracking: true,
      //  clearOnTrackingStop: true
      //}, "LocateButton");
      //geoLocate.startup();
      //geoLocate.on("locate", function (locate) {
      //  event.stop(event);
          
      //});

      // Setup USNG Layer
      //USNGOverlay = new esri.layers.ArcGISDynamicMapServiceLayer();
      USNGOverlay = new ArcGISDynamicMapServiceLayer('https://maps1.arcgisonline.com/ArcGIS/rest/services/NGA_US_National_Grid/MapServer');
      //USNGOverlay = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/US_National_Grid/MapServer');
      map.addLayer(USNGOverlay);
      USNGOverlay.hide();

      //Set Up History Layer
      HistoryLayer = new esri.layers.GraphicsLayer();
      map.addLayer(HistoryLayer);
      HistoryLayer.hide();

      //Set Up Vehicle Layer
      VehicleLayer = new esri.layers.GraphicsLayer(
      {
        id: "Vehicle",
        outFields: ["UnitName"]
      });
      map.addLayer(VehicleLayer);

      LocationLayer = new esri.layers.GraphicsLayer();
      map.addLayer(LocationLayer);

      RadioLayer = new esri.layers.GraphicsLayer();
      map.addLayer(RadioLayer);

      //ExtraMapPointsLayer = new esri.layers.GraphicsLayer();
      //map.addLayer(ExtraMapPointsLayer);
      //ExtraMapPointsLayer.hide();

      //ExtraMapPointsByCallLayer = new esri.layers.GraphicsLayer();
      //map.addLayer(ExtraMapPointsByCallLayer);

      CallerLocationsLayer = new esri.layers.GraphicsLayer();
      map.addLayer(CallerLocationsLayer);
      CallerLocationsLayer.hide();

      //Set Up Inci Layer
      InciLayer = new esri.layers.GraphicsLayer();
      map.addLayer(InciLayer);
      // old
      UpdateUnits();
      if (currentactivedata !== undefined) {
        UpdateActiveCallsMap(currentactivedata);
      }
      //window.setInterval(function () {
      //    UpdateUnits();
      //}, 7000);
      if (lasthistoricaldata !== null) {
        UpdateHistoricalCallsMap(lasthistoricaldata);
      }
      // end old
    }
    //End Init			
    //if (lat !== 0) {
    //    var p = new Point([long, lat]);
    //    map.centerAndZoom(p, 18);
    //}
  });
  mapresizing = false;
}

function urlParam(name) {//URL Params
  var results = new RegExp('[\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href);
  return results[1] || 0;
}

//function geolocate() {
//    require(["esri/dijit/LocateButton"], function (LocateButton) {
//        geoLocate = new LocateButton({
//            map: map,
//            useTracking: true,
//            clearOnTrackingStop: true
//        }, "LocateButton");
//        geoLocate.startup();
//    });
//}

//function geocodeAddress() {
//    require(["esri/dijit/Geocoder"], function (Geocoder) {
//        var myGeocoders = [{
//            url: locatorUrl,
//            name: "Clay County",
//            placeholder: "Search for an Address"
//        }];
//        geocoder = new Geocoder({
//            map: map,
//            autoComplete: false,
//            arcgisGeocoder: false,
//            geocoders: myGeocoders
//        }, "search");

//        geocoder.startup();
//        geocoder.on('find-results', showLocation);
//        geoLocate.on('locate', useLocation);
//    });
//    //geocoder.on('select', showLocation);
//}

function mapUnitClick(graphic) {
  //console.log(graphic.attributes);
  var i = getUnitIndex(graphic.attributes.UnitName);
  var item = lastunitdata.Records[i];
  return buildUnitDisplay(item, 'mapUnit');
}

function callerLocationClick(graphic)
{
  var i = getCallerLocationIndex(graphic.attributes.location_id);
  if (i === -1) return;
  var item = [];
  item.push(callerLocations[i]);
  return buildCallerDisplay(item, 'mapUnit');
}

function towerCallerLocationClick(graphic)
{
  var lat_long = graphic.attributes.lat_long;
  console.log('lat_long', lat_long);
  console.log('callerLocations', callerLocations);
  var locations = callerLocations.filter(function (j) { return j.latitude.toString() + '-' + j.longitude.toString() === lat_long; });
  if (locations.length === 0) return;
  //var item = callerLocations[i];
  return buildCallerDisplay(locations, 'mapUnit');
}

function extraMapPointLocationClick(graphic)
{
  var address = graphic.attributes.address;
  if (address.length === 0) return;
  let ol = document.createElement("ol");
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(address));
  ol.appendChild(li);
  return ol;
}

function checkTime() {
  var d = new Date(); // current time
  var hours = d.getHours();
  var mins = d.getMinutes();
  return hours >= 19 || hours <= 6;
}

function locateMapPointSuccess(position) {
  require(["esri/geometry/Point"],
    function (Point) {
      var p = new Point([position.coords.longitude, position.coords.latitude]);
      map.centerAndZoom(p, 18);
    });
  locateSuccess(position);
  updateLocations();
}

function updateLocations() {
  // this function is going to look at the trackingData array
  // and pull out the last 10 objects and throw them into a
  // layer.  
  if (LocationLayer === undefined || LocationLayer === null) return;

  require([
    "esri/symbols/SimpleMarkerSymbol",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/Color"],
      function (SimpleMarkerSymbol, Graphic, Point, SpatialReference, Color) {
        LocationLayer.clear();
        var xcoord, ycoord;
        for (var i = 0; i < locationData.length; i++) {
          xcoord = locationData[i].Longitude;
          ycoord = locationData[i].Latitude;
          var bgSymbol = new SimpleMarkerSymbol({            
            "size": 8,
            "angle": 0,
            "xoffset": 0,
            "yoffset": 0,
            "type": "esriSMS",
            "style": "esriSMSCircle",
            "outline": {
              "color": [0, 0, 0, 255],
              "width": 1,
              "type": "esriSLS",
              "style": "esriSLSSolid"
            }
          });
          var a = ((i + 1) / locationData.length);
          bgSymbol.color = Color.fromRgb("rgba(206, 36, 234, " + a + ")");
          var locationPoint = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
          var wmPoint = esri.geometry.geographicToWebMercator(locationPoint);
          var graphic = new Graphic(wmPoint, bgSymbol);
          LocationLayer.add(graphic);
        }
      }
  );
}

function getRandomInt(max)
{
  return Math.floor(Math.random() * Math.floor(max));
}

function UpdateUnits()
{
  //updateLocations();

  require(["esri/symbols/PictureMarkerSymbol",
    "esri/InfoTemplate",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/symbols/TextSymbol"],
      function (PictureMarkerSymbol, InfoTemplate, Graphic, Point, SpatialReference, TextSymbol) {
        if (lastunitdata !== undefined && lastunitdata.Records.length > 0 && map !== null) {
          var data = lastunitdata;
          VehicleLayer.clear();
          var infoTemplate = new InfoTemplate();
          infoTemplate.setTitle("Unit: ${UnitName}");
          //infoTemplate.setContent("<b>Unit Status: </b>${UnitStatus}");
          infoTemplate.setContent(mapUnitClick);

          for (var i = 0; i < data.Records.length; i++) {
            var xcoord = data.Records[i].Longitude;
            var ycoord = data.Records[i].Latitude;
            if (xcoord !== 0 || ycoord !== 0) {

              var symbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriPMS",
                "contentType": "image/png",
                "width": 30,
                "height": 30
              });
              var bgSymbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriPMS",
                "contentType": "image/png",
                "width": 40,
                "height": 40
              });
              switch (data.Records[i].UnitStatus) {
                case "Transport":
                  bgSymbol.url = "./Content/images/circle-yellow128.png";
                  break;
                case "Dispatched":
                  bgSymbol.url = "./Content/images/circle-purple128.png";
                  break;
                case "Hospital":
                  bgSymbol.url = "./Content/images/circle-orange128.png";
                  break;
                case "En-Route":
                  bgSymbol.url = "./Content/images/circle-lightgreen128.png";
                  break;
                case "Arrived":
                  bgSymbol.url = "./Content/images/circle-cyan128.png";
                  break;
                case "Out-of-Service":
                  if (data.Records[i].UnitType === "SPARE") {
                    bgSymbol.url = "";
                  } else {
                    bgSymbol.url = "./Content/images/circle-red128.png";
                  }
                  break;
                case "Available-Out-of-District":
                  bgSymbol.url = "./Content/images/circle-fuchsia128.png";
                  break;
                default:
                  bgSymbol.url = "";
                  break;
              }

              var textSymbol = new TextSymbol(data.Records[i].UnitName); //esri.symbol.TextSymbol(data.Records[i].UnitName);
              textSymbol.setColor(new dojo.Color([0, 100, 0]));
              textSymbol.setOffset(0, -25);
              textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
              

              switch (data.Records[i].UnitType) {
                case "OTHER":
                  symbol.url = "//static.arcgis.com/images/Symbols/OutdoorRecreation/RVPark.png";
                  break;
                case "RESCUE":
                  symbol.url = "//static.arcgis.com/images/Symbols/SafetyHealth/Ambulance.png";
                  //symbol.url = "./Content/images/Ambulance-R.png";
                  //if (heading > 179) symbol.url = "./Content/images/Ambulance-L.png";
                  break;
                case "LADDER":
                  symbol.url = "./Content/images/Fire-engine.png";
                  break;

                case "ENGINE":
                  symbol.url = "//static.arcgis.com/images/Symbols/SafetyHealth/FireTruck.png";
                  break;
                  
                case "BC":
                  //symbol.url = "//static.arcgis.com/images/Symbols/SafetyHealth/FireFighter.png";
                  symbol.url = "./Content/images/Pick-up.png";
                  break;

                case "TANKER":
                case "TENDER":
                  //symbol.url = "//static.arcgis.com/images/Symbols/OutdoorRecreation/RVPark.png";
                  symbol.url = "./Content/images/Tank%20truck.png";
                  break;
                  //if (data.Records[i].UnitName.indexOf("W") > 0) {
                  //  symbol.url = "//static.arcgis.com/images/Symbols/OutdoorRecreation/RVPark.png";
                  //} else {
                  //  //symbol.url = "//static.arcgis.com/images/Symbols/Transportation/Tank.png";
                  //}

                case "SPARE":
                  symbol.url = "//static.arcgis.com/images/Symbols/Transportation/CarGreenFront.png";
                  break;
                case "HAZ":
                  symbol.url = "//static.arcgis.com/images/Symbols/Transportation/CarYellowFront.png";
                  break;
                default:
                  symbol.url = "//static.arcgis.com/images/Symbols/Transportation/CarRedFront.png";
                  break;
              }
              switch (data.Records[i].UnitStatus) {
                case "Broke":
                  symbol.url = "//static.arcgis.com/images/Symbols/Transportation/CarRepair.png";
                  break;
              }

              if (filterAvailable(data.Records[i])) {

                var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
                var wmIncident = esri.geometry.geographicToWebMercator(incident);
                var graphic = new Graphic(wmIncident, symbol);
                if (bgSymbol.url.length > 0)
                {
                  var bgGraphic = new Graphic(wmIncident, bgSymbol);
                  VehicleLayer.add(bgGraphic);
                }
                graphic.setAttributes({ "UnitName": data.Records[i].UnitName, "UnitStatus": data.Records[i].UnitStatus });
                
                graphic.setInfoTemplate(infoTemplate);
                VehicleLayer.add(graphic);

                var font = new esri.symbol.Font();
                font.setSize("8pt");
                font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                textSymbol.setFont(font);

                var graphic2 = new Graphic(wmIncident, textSymbol);
                VehicleLayer.add(graphic2);
              }
            }
          }
        }
      })
}

//function useLocation(evt) {
//    require(["esri/symbols/PictureMarkerSymbol", "esri/graphic"], function (PictureMarkerSymbol, Graphic) {
//        var symbol = new PictureMarkerSymbol({
//            "angle": 0,
//            "xoffset": 0,
//            "yoffset": 10,
//            "type": "esriPMS",
//            "url": "https://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png",
//            "contentType": "image/png",
//            "width": 40,
//            "height": 40
//        });

//        map.graphics.clear();
//        var point = evt.graphic.geometry;
//        var graphic = new Graphic(point, symbol);
//        map.graphics.add(graphic);
//    });
//}

//function showLocation(evt) {
//    require(["esri/symbols/PictureMarkerSymbol", "esri/graphic"], function (PictureMarkerSymbol, Graphic) {
//        var symbol = new PictureMarkerSymbol({
//            "angle": 0,
//            "xoffset": 0,
//            "yoffset": 10,
//            "type": "esriPMS",
//            "url": "https://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png",
//            "contentType": "image/png",
//            "width": 40,
//            "height": 40
//        });

//        if (evt.results.results.length > 0) {
//            map.graphics.clear();
//            var point = evt.results.results[0].feature.geometry;
//            var graphic = new Graphic(point, symbol);
//            map.graphics.add(graphic);
//            identFunctionality();
//            doIdentify(point);
//        }
//    });
//}

function ShowAvailable(event, show_type)
{
  unitFilter = unitFilter === show_type ? '' : show_type;
  document.querySelectorAll('#ShowAvailable img').forEach(function (v)
  {
    v.style.borderBottom = "2px solid white";
  });
  if (unitFilter !== '') event.target.style.borderBottom = "2px solid red";

  //showAvailable++;
  //switch (showAvailable) {
  //  case 1: // Show Available Rescues
  //    $('#ShowAvailable').html('Show Available Engines');
  //    break;

  //  case 2: // Show Available Engines / Ladders
  //    $('#ShowAvailable').html('Show Animal Units');
  //    break;

  //  case 3:
  //    $('#ShowAvailable').html('Show All Units');
  //    break;

  //  default:
  //    $('#ShowAvailable').html('Show Available Rescues');
  //    showAvailable = 0;
  //}
  UpdateUnits();
}

function filterAvailable(u) {
  // this will filter the units based on the status of the
  // showAvailable variable

  switch (unitFilter)
  {
    case 'animal':
      if (availStatus.indexOf(u.UnitStatus) === -1) return false;
      return u.UnitType === "ANIMALSERVICES";

    case 'engine':
      if (availStatus.indexOf(u.UnitStatus) === -1) return false;
      return u.UnitType === "ENGINE" || u.UnitType === "LADDER";

    case 'rescue':
      if (availStatus.indexOf(u.UnitStatus) === -1) return false;
      return u.UnitType === "RESCUE";

    default:
      return u.UnitType !== "ANIMALSERVICES";

  }

  //switch (showAvailable) {
  //  case 1: // Show Available Rescues
  //    if (availStatus.indexOf(u.UnitStatus) == -1) return false;
  //    //if (u.UnitType == "RESCUE") console.log('filter unit', u);
  //    return (u.UnitType == "RESCUE");
      

  //  case 2: // Show Available Engines / Ladders
  //    if (availStatus.indexOf(u.UnitStatus) == -1) return false;
  //    //if (u.UnitType == "ENGINE" || u.UnitType == "LADDER") console.log('filter unit', u);
  //    return (u.UnitType == "ENGINE" || u.UnitType == "LADDER");

  //  case 3:
  //    if (availStatus.indexOf(u.UnitStatus) == -1) return false;
  //    return (u.UnitType == "ANIMALSERVICES");

  //  default:
  //    return (u.UnitType !== "ANIMALSERVICES");
  //}
}

function ShowLocation() {
  var ilb = document.getElementById("innerLocateButton");
  if (ilb.classList.toggle("tracking")) {
    startLocating();
  }
  else {
    stopLocating();
    updateLocations();
  }
}

function LocationZoom(event) {
  if (event.type === "mousedown" && event.button === 2) {
    locateInitialMapPoint();
  }
}

function ShowHistory() {
    if (HistoryLayer.visible === true) {
        HistoryLayer.hide();
    } else {
        HistoryLayer.show();
    }
}

function ShowRadar() {
  if (RadarLayer.visible === true) {
    RadarLayer.hide();
  } else {
    RadarLayer.show();
  }
}

//ShowTestGrid

function ShowWeatherWarnings() {
  if (WeatherWarningLayer.visible === true) {
    WeatherWarningLayer.hide();
  } else {
    WeatherWarningLayer.show();
  }
}

function ShowUSNG() {
  if (USNGOverlay.visible === true) {
    USNGOverlay.hide();
    fireResponse.show();
  } else
  {
    fireResponse.hide();
    USNGOverlay.show();    
  }
}

function UpdateActiveCallsMap(data) {
  require(["esri/symbols/PictureMarkerSymbol", "esri/InfoTemplate", "esri/graphic", "esri/geometry/Point",
    "esri/SpatialReference", "esri/geometry/Polyline", "esri/symbols/SimpleLineSymbol",
    "esri/geometry/webMercatorUtils"],
    function (
      PictureMarkerSymbol, InfoTemplate, Graphic, Point, SpatialReference, Polyline, SimpleLineSymbol, webMercatorUtils)
    {
      if (InciLayer !== undefined)
      {
        InciLayer.clear();
        //if (ExtraMapPointsByCallLayer !== undefined)
        //{
        //  ExtraMapPointsByCallLayer.clear();
        //  ResetExtraMapPoints();
        //}
        if (data.Records.length > 0)
        {
          var infoTemplate = new InfoTemplate();
          infoTemplate.setTitle("${InciID}");
          infoTemplate.setContent("<b>Nature Code: </b>${NatureCode}<BR><div class='NotesInfoTemplate'><span class='notesInfoTemplateHeader'>Notes</span> ${Notes}</div>");
          for (var i = 0; i < data.Records.length; i++)
          {
            var xcoord = data.Records[i].Longitude;
            var ycoord = data.Records[i].Latitude;
            if (xcoord !== 0)
            {
              let notes = data.Records[i].Notes.map(n => n.note).join("<br>");              
              let symbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriPMS",
                "contentType": "image/png",
                "width": 30,
                "height": 30
              });
              symbol.url = getSymbolURLForNatureCode(data.Records[i].NatureCode);
              if (data.Records[i].CallerLocationUSNG.length > 0)
              {
                var callersymbol = new PictureMarkerSymbol({
                  "angle": 0,
                  "xoffset": 0,
                  "yoffset": 0,
                  "type": "esriPMS",
                  "contentType": "image/png",
                  "width": 30,
                  "height": 30
                });
                callersymbol.url = "//static.arcgis.com/images/Symbols/PeoplePlaces/CellPhone.png";
                var callerloc = new Point([data.Records[i].CallerLongitude, data.Records[i].CallerLatitude], new SpatialReference({ wkid: 4326 }));
                var callergraphic = new Graphic(callerloc);
                callergraphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });//data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
                callergraphic.setInfoTemplate(infoTemplate);
                callergraphic.setSymbol(callersymbol);
                InciLayer.add(callergraphic);

                var polylineJson = { "paths": [[[data.Records[i].CallerLongitude, data.Records[i].CallerLatitude], [data.Records[i].Longitude, data.Records[i].Latitude]]], "spatialReference": { "wkid": 4326 } };
                var polyline = new Polyline(polylineJson);
                var polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1);
                var myLineGraphic = new Graphic(polyline, polylineSymbol, null, null);
                //map.graphics.add(myLineGraphic);
                InciLayer.add(myLineGraphic);
              }

              var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
              var wmIncident = esri.geometry.geographicToWebMercator(incident);
              var graphic = new Graphic(wmIncident);
              graphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });// data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
              graphic.setInfoTemplate(infoTemplate);
              graphic.setSymbol(symbol);
              InciLayer.add(graphic);
              //UpdateExtraMapPointsCallLayer(wmIncident, PictureMarkerSymbol, Graphic);
            }
          }
        }
      }
      //console.log('incilayer graphics', InciLayer.graphics)
    });
}



//function UpdateExtraMapPointsCallLayer(final_callpoint, PictureMarkerSymbol, Graphic)
//{
//  let threshold_distance = 200; // should be 200 meters
//  var symbols = ['http://static.arcgis.com/images/Symbols/Basic/LightBlueStickpin.png', 'http://static.arcgis.com/images/Symbols/Basic/OrangeBeacon.png', 'http://static.arcgis.com/images/Symbols/Basic/RedStickpin.png', 'http://static.arcgis.com/images/Symbols/Basic/BlackStickpin.png'];
//  if (extraMapPoints.length === 0) return;
//  for (var i = 0; i < extraMapPoints.length; i++)
//  {
//    let point = extraMapPoints[i];
//    if (point.final_point)
//    {
//      let distance = esri.geometry.getLength(final_callpoint, point.final_point);
//      if (distance < threshold_distance)
//      {
//        if (!point.visible_on_map)
//        {
//          // let's add it to the map
//          var symbol = new PictureMarkerSymbol({
//            "angle": 0,
//            "xoffset": 0,
//            "yoffset": 0,
//            "type": "esriPMS",
//            "contentType": "image/png",
//            "width": 25,
//            "height": 25,
//            "url": symbols[point.shape_index]
//          });
//          var graphic = new Graphic(point.final_point, symbol);

//          ExtraMapPointsByCallLayer.add(graphic);
//          point.visible_on_map = true;
//        }
//        //var polylineJson = { "paths": [[[call_longitude, call_latitude], [point.longitude, point.latitude]]], "spatialReference": { "wkid": 4326 } };
//        //var polyline = new Polyline(polylineJson);
//        //var polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1);
//        //var myLineGraphic = new Graphic(polyline, polylineSymbol, null, null);        
//        //ExtraMapPointsByCallLayer.add(myLineGraphic);
//      }
//    }
//  }
//}

//function ResetExtraMapPoints()
//{
//  for (var i = 0; i < extraMapPoints.length; i++)
//  {
//    extraMapPoints[i].visible_on_map = false;
//  }
//}


function callerClick(evt) {
}

function getSymbolURLForNatureCode(naturecode) {
    var url = '';
    switch (naturecode) {
        case 'HAZMAT':
            url = "//static.arcgis.com/images/Symbols/PeoplePlaces/Radioactive.png";
            break;
        case 'APARTMENT FIRE':
        case 'BOAT FIRE':
        case 'COMMERCIAL FIRE':
        case 'DUMPSTER FIRE':
        case 'MISC. FIRE':
        case 'PUBLIC ASSEMBLY FIRE':
        case 'SCHOOL FIRE':
        case 'STRUCTURE FIRE':
        case 'TARGET STRUCTURE FIRE':
        case 'TRAILER FIRE':
        case 'TRASH FIRE':
        case 'VEHICLE FIRE':
        case 'WOODS FIRE':
        case 'ILLEGAL BURN':
            url = "//static.arcgis.com/images/Symbols/SafetyHealth/esriCrimeMarker_56_Gradient.png";
            break;

        case 'FIRE ALARM':
        case 'FIRE ALARM INSPECTION':
        case 'FIRE SPRINKLER':
        case 'TARGET FIRE ALARM':
            url = "//static.arcgis.com/images/Symbols/PeoplePlaces/Bell.png";
            break;
        case 'SEIZURE':
            url = "//static.arcgis.com/images/Symbols/Basic/OrangeStickpin.png";
            break;
        default:
            url = "//static.arcgis.com/images/Symbols/Basic/SpringGreenStickpin.png";
            break;
    }
    return url;
}

//Historical Call Data
function UpdateHistoricalCallsMap(data) {
  require(["esri/symbols/PictureMarkerSymbol", "esri/InfoTemplate", "esri/graphic", "esri/geometry/Point", "esri/SpatialReference"],
      function (PictureMarkerSymbol, InfoTemplate, Graphic, Point, SpatialReference) {
        if (HistoryLayer !== undefined) {
          HistoryLayer.clear();
          if (data.Records.length > 0) {
            var infoTemplate = new InfoTemplate();
            infoTemplate.setTitle("${InciID}");
            infoTemplate.setContent("<b>Nature Code: </b>${NatureCode}<BR><div class='NotesInfoTemplate'><span class='notesInfoTemplateHeader'>Notes</span> ${Notes}</div>");

            for (var i = 0; i < data.Records.length; i++) {
              var symbol = new PictureMarkerSymbol({
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriPMS",
                "contentType": "image/png",
                "width": 30,
                "height": 30
              });
              let notes = data.Records[i].Notes.map(n => n.note).join("<br>");
              var xcoord = data.Records[i].Longitude;
              var ycoord = data.Records[i].Latitude;
              symbol.url = getSymbolURLForNatureCode(data.Records[i].NatureCode);
              var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
              var wmIncident = esri.geometry.geographicToWebMercator(incident);
              var graphic = new Graphic(wmIncident);
              graphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });//data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
              graphic.setInfoTemplate(infoTemplate);
              graphic.setSymbol(symbol);
              HistoryLayer.add(graphic);
            }
          }
        }
      });

}


function UpdateRadioLayer(radios)
{
  require([
    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/symbols/TextSymbol"],
    function (PictureMarkerSymbol, Graphic, Point, SpatialReference, TextSymbol)
    {

      RadioLayer.clear();
      RadioLayer.hide();
      for (var i = 0; i < radios.length; i++)
      {
        var radio = radios[i];
        var xcoord = radio.longitude;
        var ycoord = radio.latitude;
        if (xcoord !== 0 || ycoord !== 0)
        {

          var symbol = new PictureMarkerSymbol({
            "angle": 0,
            "xoffset": 0,
            "yoffset": 0,
            "type": "esriPMS",
            "contentType": "image/png",
            "width": 20,
            "height": 20,
            "url": "//static.arcgis.com/images/Symbols/Basic/RedSphere.png"
          });

          var textSymbol = new TextSymbol(radio.device_alias); //esri.symbol.TextSymbol(data.Records[i].UnitName);
          textSymbol.setColor(new dojo.Color([0, 100, 0]));
          textSymbol.setOffset(0, -25);
          textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
          var font = new esri.symbol.Font();
          font.setSize("10pt");
          font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
          textSymbol.setFont(font);

          var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
          var wmIncident = esri.geometry.geographicToWebMercator(incident);
          var graphic = new Graphic(wmIncident, symbol);

          RadioLayer.add(graphic);

          var graphic2 = new Graphic(wmIncident, textSymbol);
          RadioLayer.add(graphic2);
        }
      }
    });
}

//function UpdateExtraMapPointsLayer(extra_points, symbols)
//{
//  require([
//    "esri/symbols/PictureMarkerSymbol",
//    "esri/graphic",
//    "esri/InfoTemplate",
//    "esri/geometry/Point",
//    "esri/SpatialReference"],
//    function (PictureMarkerSymbol, Graphic, InfoTemplate, Point, SpatialReference)
//    {

//      ExtraMapPointsLayer.clear();      
//      for (var i = 0; i < extra_points.length; i++)
//      {
//        var extra_point = extra_points[i];        
//        var xcoord = extra_point.longitude;
//        var ycoord = extra_point.latitude;
//        if (xcoord !== 0 || ycoord !== 0)
//        {

//          var symbol = new PictureMarkerSymbol({
//            "angle": 0,
//            "xoffset": 0,
//            "yoffset": 0,
//            "type": "esriPMS",
//            "contentType": "image/png",
//            "width": 15,
//            "height": 15,
//            "url": symbols[extra_point.shape_index]
//          });


//          var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
//          var wmIncident = esri.geometry.geographicToWebMercator(incident);
//          var graphic = new Graphic(wmIncident, symbol);

//          if (extra_point.Address.length > 0)
//          {
//            var infoTemplate = new InfoTemplate();
//            infoTemplate.setTitle("Address");
//            infoTemplate.setContent(extraMapPointLocationClick);
//            graphic.setAttributes({ "address": extra_point.Address });
//            graphic.setInfoTemplate(infoTemplate);
//          }

//          ExtraMapPointsLayer.add(graphic);
//        }
//      }
//    });
//}

function UpdateCallerLocationsLayer(locations)
{
  require([
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/graphic",
    "esri/InfoTemplate",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/symbols/TextSymbol"],
    function (SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, InfoTemplate, Point, SpatialReference, TextSymbol)
    {

      CallerLocationsLayer.clear();
      for (var i = 0; i < locations.length; i++)
      {
        let location = locations[i];
        var xcoord = location.longitude;
        var ycoord = location.latitude;
        if (xcoord !== 0 || ycoord !== 0)
        {
          var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
          var wmIncident = esri.geometry.geographicToWebMercator(incident);

          if (location.call_type === "WPH1")
          {
            //
            var cellTower = new PictureMarkerSymbol({
              "angle": 0,
              "xoffset": 0,
              "yoffset": 0,
              "type": "esriPMS",
              "contentType": "image/png",
              "width": 20,
              "height": 20,
              "url": "//static.arcgis.com/images/Symbols/PeoplePlaces/TowerShort.png"
            });
            var towerGraphic = new Graphic(wmIncident, cellTower);
            var lat_long = location.latitude.toString() + '-' + location.longitude.toString();
            console.log('lat_long', lat_long);
            if (CallerLocationsLayer.graphics.filter(function (j) { return j.attributes.lat_long === lat_long; }).length === 0)
            {
              towerGraphic.setAttributes({ "lat_long": lat_long });
              var towerInfoTemplate = new InfoTemplate();
              towerInfoTemplate.setTitle("Callers using this Cell Tower");
              towerInfoTemplate.setContent(towerCallerLocationClick);
              towerGraphic.setInfoTemplate(towerInfoTemplate);
              CallerLocationsLayer.add(towerGraphic);
            }
          }
          else
          {
            var infoTemplate = new InfoTemplate();
            infoTemplate.setTitle("Caller Location");
            infoTemplate.setContent(callerLocationClick);
            var symbol = new SimpleMarkerSymbol(
              {
                "color": [0, 255, 255, location.caller_age_indicator],
                "size": 15,
                "angle": 0,
                "xoffset": 0,
                "yoffset": 0,
                "type": "esriSMS",
                "style": "esriSMSCircle",
                "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
              });



            var graphic = new Graphic(wmIncident, symbol);
            graphic.setAttributes({ "location_id": location.location_id });
            graphic.setInfoTemplate(infoTemplate);

            CallerLocationsLayer.add(graphic);

            var textSymbol = new TextSymbol(location.unique_id); //esri.symbol.TextSymbol(data.Records[i].UnitName);
            textSymbol.setColor(new dojo.Color([0, 0, 0]));
            textSymbol.setOffset(0, -4);
            textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
            var font = new esri.symbol.Font();
            font.setSize("10pt");
            font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
            textSymbol.setFont(font);
            var graphic2 = new Graphic(wmIncident, textSymbol);
            graphic2.setAttributes({ "location_id": location.location_id });
            graphic2.setInfoTemplate(infoTemplate);
            CallerLocationsLayer.add(graphic2);
          }


        }
      }
    });
}