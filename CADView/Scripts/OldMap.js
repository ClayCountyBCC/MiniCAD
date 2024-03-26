function oldmapInit()
{
  if (map !== null || mapresizing === true) { return false; }
  mapresizing = true;
  require([
    "esri/map",
    "esri/config",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/dijit/BasemapGallery",
    "esri/dijit/LayerList",
    "esri/dijit/HomeButton",
    "esri/layers/GraphicsLayer",
    "dojo/parser",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/WMSLayer"],
    function (Map, esriConfig, ArcGISDynamicMapServiceLayer, BasemapGallery, LayerList, HomeButton, GraphicsLayer, parser,
      ArcGISImageServiceLayer, WMSLayer)
    {
      if (map === null)
      {
        parser.parse();

        map = new Map("map", {
          basemap: "osm", //'streets-navigation-vector',//"osm",
          center: [-81.80, 29.950], // lon, lat
          zoom: 11,
          logo: false
        });
        console.log('config', esriConfig);
        esriConfig.defaults.io.corsEnabledServers.push("opengeo.ncep.noaa.gov");
        esriConfig.defaults.io.corsEnabledServers.push("apps.claycountygov.com");
        esriConfig.defaults.io.corsEnabledServers.push("public.claycountygov.com");
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
        if (currentlat !== null)
        {
          let mapload = map.on('onLoad', ShowMap());
        }
        else
        {
          LoadRadioData();

          LoadCallerLocations();
        }
        if (IsFairTime())
        {
          var fairMap = new ArcGISImageServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairImage/ImageServer');
          fairMap.id = "Fair Map";
          map.addLayer(fairMap);
          var fairAccess = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/FairAccess/MapServer');
          fairAccess.id = "Fair Access";
          map.addLayer(fairAccess);
        }
        if (IsBoaterSkipDayTime())
        {
          var BoaterSkipDayMap = new ArcGISImageServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/BoaterSkipDay/MapServer');
          BoaterSkipDayMap.id = "Boater Skip Day Map";
          map.addLayer(BoaterSkipDayMap);
        }
        fireResponse = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/Fire_Response/MapServer');
        fireResponse.id = "Fire Districts";
        map.addLayer(fireResponse); // was port 6080 for regular http

        var siteAddresses = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/SiteAddresses/MapServer');
        siteAddresses.id = "Address Points";
        map.addLayer(siteAddresses);

        ParcelLayer = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/Parcel/MapServer');
        ParcelLayer.id = "Parcel Layer";
        ParcelLayer.setScaleRange(2000, 1);
        //ParcelLayer.hide();
        //ParcelLayer.on("load", function ()
        //{
        //  console.log("parcel layer loaded");
        //  console.log('Parcel Layer Min Scale 1', ParcelLayer.minScale);
        //  ParcelLayer.setScaleRange(2000, 1);
        //  console.log('Parcel Layer Min Scale 2', ParcelLayer.minScale);
        //});
        //ParcelLayer.maxScale = 4500;
        //ParcelLayer.minScale = 4500;


        map.addLayer(ParcelLayer);

        WeatherWarningLayer = new WMSLayer('https://opengeo.ncep.noaa.gov/geoserver/wwa/warnings/ows?service=wms&version=1.3.0&request=GetCapabilities');
        //'//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Forecasts_Guidance_Warnings/watch_warn_adv/MapServer');
        WeatherWarningLayer.refreshInterval = 5; // refreshInterval is in Minutes per the docs

        WeatherWarningLayer.id = "Weather Warnings";
        WeatherWarningLayer.hide();
        WeatherWarningLayer.visibleLayers.push("warnings");
        map.addLayer(WeatherWarningLayer);

        RadarLayer = new WMSLayer('https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.3.0&request=GetCapabilities');
        //'//idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Observations/radar_base_reflectivity/MapServer');
        RadarLayer.setRefreshInterval(1); // this was previously set to 30000, but this value is in Minutes so that was wrong.
        //RadarLayer.setDisableClientCaching(true);
        RadarLayer.id = "NOAA Weather";
        RadarLayer.opacity = .5;
        RadarLayer.hide();
        RadarLayer.visibleLayers.push("conus_bref_qcd");

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
        USNGOverlay = new ArcGISDynamicMapServiceLayer('https://maps.claycountygov.com:6443/arcgis/rest/services/US_National_Grid/MapServer');
        //USNGOverlay = new ArcGISDynamicMapServiceLayer('https://maps1.arcgisonline.com/ArcGIS/rest/services/NGA_US_National_Grid/MapServer');
        //USNGOverlay = new FeatureLayer('https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_National_Grid_HFL_V/FeatureServer');
        USNGOverlay.id = "USNG Layer";
        map.addLayer(USNGOverlay);
        USNGOverlay.hide();

        //Set Up History Layer
        HistoryLayer = new GraphicsLayer({ id: "Historical Call Locations" });
        map.addLayer(HistoryLayer);
        HistoryLayer.hide();

        LocationLayer = new GraphicsLayer({ id: "My Location" });
        map.addLayer(LocationLayer);

        RadioLayer = new GraphicsLayer({ id: "Radio Locations" });
        //map.addLayer(RadioLayer);
        RadioLayer.hide();

        CallerLocationsLayer = new GraphicsLayer({ id: "911 Caller Locations" });
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
        if (currentactivedata !== undefined)
        {
          UpdateActiveCallsMap(currentactivedata);
        }

        if (lasthistoricaldata !== null)
        {
          UpdateHistoricalCallsMap(filteredlasthistoricaldata);
        }
        map_layer_list = new LayerList({ map: map }, document.getElementById("layercontrol"));
        map_layer_list.startup();
        map_layer_list.visible = false;
        map_layer_list.on("toggle", function (evt)
        {

          console.log('layerlist toggle', evt);
          console.log('map layer', map_layer_list.layers);
        });
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