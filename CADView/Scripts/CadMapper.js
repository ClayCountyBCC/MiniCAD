/*global lastactivedata, currentactivedata, lasthistoricaldata, lastunitdata, currentunit, GoodCookies*/
"use strict";
var map = null;
var basemapToggle = null;
var defaultExtent = null;
var geocoder;
var locatorUrl = "https://maps.claycountygov.com:6080/arcgis/rest/services/Address_Site_Locator/GeocodeServer";
var InciLayer, HistoryLayer, USNGOverlay, RadarLayer, fireResponse, CallerLocationsLayer, VehicleLayer,
  WeatherWarningLayer, LocationLayer, RadioLayer;
var locateButton;
var WorldTranspo = null;
var showAvailable = 0;
var unitFilter = '';
var show_inactive_units = false;
var map_layer_list = null;


var never_hide_units = ['E11', 'E13', 'E14', 'E15', 'E17', 'E18',
  'E19', 'E20', 'E22', 'E23', 'E24', 'E25', 'E26', 'R11', 'R13',
  'R15', 'R17', 'R18', 'R19', 'R22', 'R22A', 'R23', 'R24', 'R25',
  'R26', 'BAT1', 'BAT2', 'CHIEF1', 'CHIEF2', 'CHIEF3', 'TR603',
  'T149', 'T209', 'T238'];
var temporarily_show_unit = [];
var availStatus = ["Available", "Available-Out-of-District"];

//http://static.arcgis.com/images/Symbols/Shapes/PurplePin1LargeB.png
//http://static.arcgis.com/images/Symbols/Shapes/OrangePin1LargeB.png

function IsFairTime() {
  var d = new Date();
  var month = d.getMonth();
  var day = d.getDate();
  return ((month === 1 && day > 25) || month === 2  || (month === 3 && day < 14));

}

function mapInit() {
  if (map !== null || mapresizing === true) { return false; }
  mapresizing = true;
  require([
    "esri/map",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/dijit/BasemapGallery",
    "esri/dijit/LayerList",
    "esri/dijit/HomeButton",
    "esri/layers/GraphicsLayer",
    "dojo/parser",
    "esri/layers/ArcGISImageServiceLayer"],
  function (Map, ArcGISDynamicMapServiceLayer, BasemapGallery, LayerList, HomeButton, GraphicsLayer,  parser, 
              ArcGISImageServiceLayer) {
    if (map === null) {
      parser.parse();

      map = new Map("map", {
        basemap: 'streets-navigation-vector',//"osm",
        center: [-81.80, 29.950], // lon, lat
        zoom: 11,
        logo: false
      });
      //map.on("load", function ()
      //{
      //  // let's load some data from the cookies.
      //  console.log("map load layer visibility");
      //  for (let i = 0; i < map.layerIds.length; i++)
      //  {

      //    let layerid = map.layerIds[i].trim();
      //    let maplayer = map.getLayer(layerid); //Minicad_layer_Fire%20Districts
      //    console.log('maplayer', maplayer);
      //    if (GoodCookies.get("Minicad_layer_" + layerid) !== undefined)
      //    {
      //      if (GoodCookies.get("Minicad_layer_" + layerid))
      //      {
      //        maplayer.show();
      //        maplayer.visible = true;
      //      }
      //      else
      //      {
      //        maplayer.hide();
      //        maplayer.visible = false;
      //      }
      //    }
      //    if (maplayer && maplayer.layerInfos && maplayer.layerInfos.length > 0)
      //    {
      //      for (let j = 0; j < maplayer.layerInfos.length; j++)
      //      {
      //        let layerinfo = maplayer.layerInfos[j];
      //        let infoid = layerinfo.id;
      //        if (GoodCookies.get("Minicad_layer_" + layerid + "-" + infoid) !== undefined)
      //        {
      //          layerinfo.defaultVisibility = GoodCookies.get("Minicad_layer_" + layerid + "-" + infoid);
      //        }
      //      }
      //    }
      //  }
      //  //GoodCookies.set("Minicad_layer_" + layer.id, event.visible, { sameSite: 'strict' });
      //  //GoodCookies.set("Minicad_layer_" + layer.id + '-' + sublayerid, is_visible, { sameSite: 'strict' });

      //});
      if (currentlat !== null) {
        let mapload = map.on('onLoad', ShowMap());
      }
      else
      {
        LoadRadioData();

        LoadCallerLocations();
      }
      if (IsFairTime()) {
        var fairMap = new ArcGISImageServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairImage/ImageServer');
        fairMap.id = "Fair Map";
        map.addLayer(fairMap);
        var fairAccess = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairAccess/MapServer');
        fairAccess.id = "Fair Access";
        map.addLayer(fairAccess);
      }
      fireResponse = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/Fire_Response/MapServer');
      fireResponse.id = "Fire Districts";
      map.addLayer(fireResponse); // was port 6080 for regular http
      
      var siteAddresses = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/SiteAddresses/MapServer');
      siteAddresses.id = "Address Points";
      map.addLayer(siteAddresses);

      WeatherWarningLayer = new ArcGISDynamicMapServiceLayer('//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Forecasts_Guidance_Warnings/watch_warn_adv/MapServer');
      WeatherWarningLayer.refreshInterval = 5; // refreshInterval is in Minutes per the docs

      WeatherWarningLayer.id = "Weather Warnings";
      WeatherWarningLayer.hide();
      map.addLayer(WeatherWarningLayer);

      RadarLayer = new ArcGISDynamicMapServiceLayer('//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Observations/radar_base_reflectivity/MapServer');
      RadarLayer.setRefreshInterval(1); // this was previously set to 30000, but this value is in Minutes so that was wrong.
      RadarLayer.setDisableClientCaching(true);
      RadarLayer.id = "NOAA Weather";
      RadarLayer.opacity = .5;
      RadarLayer.hide();
      map.addLayer(RadarLayer);

      let bmg = new BasemapGallery({
        map: map,
        portalURL: "https://arcgis.com",
        useVectorBasemaps: true
      }, document.getElementById("basemapcontrol"));
      bmg.startup();
      // this works but randomly fails. So I won't use this for the basemap.
      //bmg.on("selection-change", function ()
      //{
      //  let bm = bmg.getSelected();
      //  GoodCookies.set("Minicad_Basemap", bm.id, { sameSite: "strict" });
      //});
      //bmg.on("load", function () 
      //{
      //  console.log("bmg", bmg);
      //  if (GoodCookies.get("Minicad_Basemap"))
      //  {
      //    console.log('applying new basemap', GoodCookies.get("Minicad_Basemap"));
      //    let v = bmg.select(GoodCookies.get("Minicad_Basemap"));
      //    console.log('v', v);
      //  }
      //});


      defaultExtent = new esri.geometry.Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145,
        new esri.SpatialReference({ wkid: 4326 }));

      var home = new HomeButton({
        map: map,
        extent: defaultExtent,
        showAttribution: false
      }, "HomeButton");
      home.startup();
      
      // Setup USNG Layer
      USNGOverlay = new ArcGISDynamicMapServiceLayer('https://maps1.arcgisonline.com/ArcGIS/rest/services/NGA_US_National_Grid/MapServer');
      USNGOverlay.id = "USNG Layer";
      map.addLayer(USNGOverlay);
      USNGOverlay.hide();

      //Set Up History Layer
      HistoryLayer = new GraphicsLayer({id: "Historical Call Locations"});
      map.addLayer(HistoryLayer);
      HistoryLayer.hide();

      LocationLayer = new GraphicsLayer({id: "My Location"});
      map.addLayer(LocationLayer);

      RadioLayer = new GraphicsLayer({id: "Radio Locations"});
      //map.addLayer(RadioLayer);
      RadioLayer.hide();

      CallerLocationsLayer = new GraphicsLayer({id: "911 Caller Locations"});
      //map.addLayer(CallerLocationsLayer);
      CallerLocationsLayer.hide();

      //Set Up Inci Layer
      InciLayer = new GraphicsLayer({ id: "Current Call Locations" });
      map.addLayer(InciLayer);

      //Set Up Vehicle Layer
      VehicleLayer = new GraphicsLayer(
        {
          id: "Unit Locations",
          outFields: ["UnitName"]
        });
      map.addLayer(VehicleLayer);
      // old
      UpdateUnits();
      if (currentactivedata !== undefined) {
        UpdateActiveCallsMap(currentactivedata);
      }

      if (lasthistoricaldata !== null) {
        UpdateHistoricalCallsMap(filteredlasthistoricaldata);
      }
      map_layer_list = new LayerList({ map: map, showLegend: true }, document.getElementById("layercontrol"));
      map_layer_list.startup();
      map_layer_list.visible = false;  
      //ll.on("toggle", function (event)
      //{
      //  let layerIndex = event.layerIndex;
      //  let subLayerIndex = event.subLayerIndex;
      //  let layer = ll.layers[layerIndex];
      //  let maplayer = map.getLayer(layer.id);
      //  if (subLayerIndex)
      //  {
      //    let sublayerid = maplayer.layerInfos[subLayerIndex].id;
      //    let is_visible = maplayer.layerInfos[subLayerIndex].defaultVisibility;
      //    GoodCookies.set("Minicad_layer_" + layer.id + '-' + sublayerid, is_visible, { sameSite: 'strict' });
      //  }
      //  else
      //  {
      //    GoodCookies.set("Minicad_layer_" + layer.id, event.visible, { sameSite: 'strict' });
      //  }       
      //});
      // end old
    }
    //End Init			

  });
  mapresizing = false;
}

function LayerToggle(event)
{
  console.log('layerlist toggle', event);
}

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

          for (var i = 0; i < data.Records.length; i++) 
          {

            var xcoord = data.Records[i].Longitude;
            var ycoord = data.Records[i].Latitude;
            if (xcoord !== 0 || ycoord !== 0)
            {

              if (filterAvailable(data.Records[i]) && ShowInactiveUnits(data.Records[i])) 
              {


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
                  "width": 45,
                  "height": 45
                });
                switch (data.Records[i].UnitStatus)
                {
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
                    if (data.Records[i].UnitType === "SPARE")
                    {
                      bgSymbol.url = "";
                    } else
                    {
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


                switch (data.Records[i].UnitType) 
                {
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
                    //symbol.url = "./Content/images/FancyFiretruck.png";
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
                switch (data.Records[i].UnitStatus) 
                {
                  case "Broke":
                    symbol.url = "//static.arcgis.com/images/Symbols/Transportation/CarRepair.png";
                    break;
                }



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

function ToggleInactiveUnitVisibility()
{
  show_inactive_units = !show_inactive_units;
  GoodCookies.set("Minicad_Show_Inactive_Units", show_inactive_units, { sameSite: 'strict' });
  document.getElementById("ShowInactiveUnits").textContent = show_inactive_units ? "Hide Inactive Units" : "Show Inactive Units";
  // do something here about updating the text of the button
  UpdateUnits();
}

function CheckInactiveUnit(unit)
{
  if (show_inactive_units) return;
  let expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 5);

  let temporary_exemption = temporarily_show_unit.filter(u => u.unitcode === unit);
  if (temporary_exemption && temporary_exemption.length > 0)
  {
    temporary_exemption[0].expiration_date = expiration;
  }
  else
  {
    temporarily_show_unit.push({
      unitcode: unit,
      expiration_date: expiration
    });
  }
  // if we did something, call UpdateUnits() so that this unit will be shown.
}

function HandleTemporarilyShowUnitExpirations()
{
  if (temporarily_show_unit.length === 0) return;
  let now = new Date();
  temporarily_show_unit = temporarily_show_unit.filter(u => u.expiration_date > now);
}

function ShowInactiveUnits(unit)
{
  if (show_inactive_units || never_hide_units.indexOf(unit.UnitName) > -1) return true;

  // Need to handle the Temporarily Shown units here
  HandleTemporarilyShowUnitExpirations();
  if (temporarily_show_unit.some(u => u.unitcode === unit.UnitName)) return true;

  // Now that we're here, we're going to look at each unit
  // if the unit is on a call, we'll show it
  if (unit.IncidentID.length > 0) return true;

  // if the unit is moving and has been updated recently (last 10 minutes, we'll show it)
  if (unit.speed > 0 && unit.LocationStatus.indexOf("Green") > -1) return true;

  return false;
  // otherwise we won't.

}

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
      return true;//u.UnitType !== "ANIMALSERVICES";

  }

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
                "width": 20,
                "height": 20
              });
              let TopSymbol = null;
              if (data.Records[i].CallIconURLBottom.length > 0)
              {
                symbol.url = data.Records[i].CallIconURLBottom;

                if (data.Records[i].CallIconURLTop.length > 0)
                {
                  TopSymbol = new PictureMarkerSymbol({
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": -7,
                    "type": "esriPMS",
                    "contentType": "image/png",
                    "width": 15,
                    "height": 15,
                    "url": data.Records[i].CallIconURLTop
                  });
                }


              }
              else
              {
                symbol.url = getSymbolURLForNatureCode(data.Records[i].NatureCode);
              }
              

              //let BottomSymbol = new PictureMarkerSymbol({
              //  "angle": 0,
              //  "xoffset": 0,
              //  "yoffset": 0,
              //  "type": "esriPMS",
              //  "contentType": "image/png",
              //  "width": 30,
              //  "height": 30,
              //  "url": "//static.arcgis.com/images/Symbols/OutdoorRecreation/Cloudy.png"
              //  //"url": "//static.arcgis.com/images/Symbols/SafetyHealth/esriCrimeMarker_56_Gradient.png"
              //});


              


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

              if (TopSymbol !== null)
              {
                var Topgraphic = new Graphic(wmIncident);
                Topgraphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });// data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
                Topgraphic.setInfoTemplate(infoTemplate);
                Topgraphic.setSymbol(TopSymbol);
                InciLayer.add(Topgraphic);
              }
              //var Bottomgraphic = new Graphic(wmIncident);
              //Bottomgraphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });// data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
              //Bottomgraphic.setInfoTemplate(infoTemplate);
              //Bottomgraphic.setSymbol(BottomSymbol);
              //InciLayer.add(Bottomgraphic);
              //var Topgraphic = new Graphic(wmIncident);
              //Topgraphic.setAttributes({ "InciID": data.Records[i].IncidentID, "NatureCode": data.Records[i].NatureCode, "Notes": notes });// data.Records[i].Notes.replace(/\[(.*?)\]/g, "") });
              //Topgraphic.setInfoTemplate(infoTemplate);
              //Topgraphic.setSymbol(TopSymbol);
              //InciLayer.add(Topgraphic);

            }
          }
        }
      }
    });
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
function UpdateHistoricalCallsMap(data)
{
  require(["esri/symbols/PictureMarkerSymbol", "esri/InfoTemplate", "esri/graphic", "esri/geometry/Point", "esri/SpatialReference"],
    function (PictureMarkerSymbol, InfoTemplate, Graphic, Point, SpatialReference)
    {
      map_layer_list.refresh();
      if (HistoryLayer !== undefined)
      {
        HistoryLayer.clear();
        let records = data.Records ? data.Records : data;
        if (records.length > 0)
        {
          var infoTemplate = new InfoTemplate();
          infoTemplate.setTitle("${InciID}");
          infoTemplate.setContent("<b>Nature Code: </b>${NatureCode}<BR><div class='NotesInfoTemplate'><span class='notesInfoTemplateHeader'>Notes</span> ${Notes}</div>");

          for (var i = 0; i < records.length; i++)
          {

            var symbol = new PictureMarkerSymbol({
              "angle": 0,
              "xoffset": 0,
              "yoffset": 0,
              "type": "esriPMS",
              "contentType": "image/png",
              "width": 20,
              "height": 20
            });
            let TopSymbol = null;
            if (records[i].CallIconURLBottom.length > 0)
            {
              symbol.url = records[i].CallIconURLBottom;

              if (records[i].CallIconURLTop.length > 0)
              {
                TopSymbol = new PictureMarkerSymbol({
                  "angle": 0,
                  "xoffset": 0,
                  "yoffset": -7,
                  "type": "esriPMS",
                  "contentType": "image/png",
                  "width": 15,
                  "height": 15,
                  "url": records[i].CallIconURLTop
                });
              }


            }
            else
            {
              symbol.url = getSymbolURLForNatureCode(records[i].NatureCode);
            }
            //symbol.url = getSymbolURLForNatureCode(records[i].NatureCode);

            let notes = records[i].Notes.map(n => n.note).join("<br>");
            var xcoord = records[i].Longitude;
            var ycoord = records[i].Latitude;

            var incident = new Point([xcoord, ycoord], new SpatialReference({ wkid: 4326 }));
            var wmIncident = esri.geometry.geographicToWebMercator(incident);
            var graphic = new Graphic(wmIncident);
            graphic.setAttributes({ "InciID": records[i].IncidentID, "NatureCode": records[i].NatureCode, "Notes": notes });//records[i].Notes.replace(/\[(.*?)\]/g, "") });
            graphic.setInfoTemplate(infoTemplate);
            graphic.setSymbol(symbol);
            HistoryLayer.add(graphic);

            if (TopSymbol !== null)
            {
              var Topgraphic = new Graphic(wmIncident);
              Topgraphic.setAttributes({ "InciID": records[i].IncidentID, "NatureCode": records[i].NatureCode, "Notes": notes });// records[i].Notes.replace(/\[(.*?)\]/g, "") });
              Topgraphic.setInfoTemplate(infoTemplate);
              Topgraphic.setSymbol(TopSymbol);
              HistoryLayer.add(Topgraphic);
            }

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
      if (!map || !RadioLayer) return;
      RadioLayer.clear();      
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
      if (!CallerLocationsLayer) return;
      
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