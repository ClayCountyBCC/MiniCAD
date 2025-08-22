/*global lastactivedata, currentactivedata, lasthistoricaldata, lastunitdata, currentunit, map, GoodCookies*/
/* exported **/
"use strict";



var vehicleSwaps = [];
var currentRadioList = [];
var currentUnitControlDataList = [];
var unitControlGroups = [];
var extraMapPoints = [];
var callerLocations = [];
var activeIntervals = [];
let filterDistrictLabels = ['All Districts', 'No District', '11', '13', '14', '15', '17', '18', '19', '20', '22', '23', '24', '25', '26'];
let filterDistrictValues = ['all', 'OOC', '11', '13', '14', '15', '17', '18', '19', '20', '22', '23', '24', '25', '26'];
let historyfilters = {
  callType: 'all',
  emergency: 'all',
  district: 'all',
  searchText: '',
  unit: '',
  nature: ''
};
let showHistoryFilters = true;
let containerStyle;
let callOptions = {
  whitespace: 'normal' // or compact
  , show_usng: true
  , show_caller_usng: true
  , default_notes_layout: 'compact' // or detailed
  , show_userid_in_notes: true
  , call_buttons_display: 'row' // or mini
};

function ToggleCallOptions()
{
  let container = document.getElementById("call_options_container");
  container.style.display = container.style.display === "none" ? "block" : "none";
  if (container.style.display === "block") container.scrollIntoView();
}

function LoadSavedCallOptions()
{
  // do something with GoodCookie here
}

function UpdateCallOptions()
{
  let whitespace = document.querySelector('input[name="whitespace"]:checked');
  if (whitespace)
  {
    callOptions.whitespace = whitespace.value;
  }
  else
  {
    document.getElementById("whitespace_normal").checked = true;
    callOptions.whitespace = "normal";
  }
  let call_buttons = document.querySelector('input[name="call_buttons"]:checked');
  if (call_buttons)
  {
    callOptions.call_buttons_display = call_buttons.value;
  }
  else
  {
    document.getElementById("call_buttons_row").checked = true;
    callOptions.call_buttons_display = "row";
  }
  let note_view = document.querySelector('input[name="note_view"]:checked');
  if (note_view)
  {
    callOptions.default_notes_layout = note_view.value;
  }
  else
  {
    document.getElementById("note_view_compact").checked = true;
    callOptions.default_notes_layout = "compact";
  }
  
  callOptions.show_usng = document.getElementById("show_usng").checked;
  callOptions.show_caller_usng = document.getElementById("show_caller_usng").checked;
  callOptions.show_userid_in_notes = document.getElementById("show_note_userid").checked;
  ApplyCallOptions();
  SaveCallOptions();
}

function SaveCallOptions()
{
  GoodCookies.set("Minicad_call_options", JSON.stringify(callOptions), { sameSite: 'strict' });
}

function LoadCallOptions()
{
  let co = GoodCookies.get("Minicad_call_options");
  if (co && co.length > 0)
  {
    callOptions = JSON.parse(co);
  }
  // let's apply it to the elements
  document.getElementById("show_usng").checked = callOptions.show_usng;
  document.getElementById("show_caller_usng").checked = callOptions.show_caller_usng;
  document.getElementById("show_note_userid").checked = callOptions.show_userid_in_notes;
  //whitespace_normal
  if (callOptions.whitespace !== "normal" && callOptions.whitespace !== "compact") 
  {
    console.log('callOptions whitespace invalid LoadCallOptions', callOptions.whitespace);
    callOptions.whitespace = "normal";
  }
  document.getElementById("whitespace_normal").checked = callOptions.whitespace === "normal";
  document.getElementById("call_buttons_mini").checked = callOptions.whitespace === "compact";
  //call_buttons_row
  if (callOptions.call_buttons_display !== "row" && callOptions.call_buttons_display !== "mini")
  {
    console.log('callOptions call_buttons_display invalid LoadCallOptions', callOptions.call_buttons_display);
    callOptions.call_buttons_display = "row";
  }
  document.getElementById("call_buttons_row").checked = callOptions.call_buttons_display === "row";
  document.getElementById("call_buttons_mini").checked = callOptions.call_buttons_display === "mini";
  // note layout
  if (callOptions.default_notes_layout !== "compact" && callOptions.default_notes_layout !== "detailed")
  {
    console.log('callOptions default notes layout invalid LoadCallOptions', callOptions.default_notes_layout);
    callOptions.default_notes_layout = "compact";
  }
  document.getElementById("note_view_compact").checked = callOptions.default_notes_layout === "compact";
  document.getElementById("note_view_detailed").checked = callOptions.default_notes_layout === "detailed";
  }

function ApplyCallOptions()
{
  // whitespace
  if (callOptions.whitespace === 'normal')
  {
    document.querySelectorAll("ol.CADData.compact").forEach(v => v.classList.remove("compact"));
  }
  else
  {
    document.querySelectorAll("ol.CADData").forEach(v => v.classList.add("compact"));
  }
  // USNG
  if (callOptions.show_usng)
  {
    document.querySelectorAll("li.usng.hide").forEach(v => v.classList.remove("hide"));
  }
  else
  {
    document.querySelectorAll("li.usng").forEach(v => v.classList.add("hide"));
  }
  // Caller USNG
  if (callOptions.show_caller_usng)
  {
    document.querySelectorAll("li.callerusng.hide").forEach(v => v.classList.remove("hide"));
  }
  else
  {
    document.querySelectorAll("li.callerusng").forEach(v => v.classList.add("hide"));
  }
  // Default Call Notes View
  if (callOptions.default_notes_layout === "compact")
  {
    document.querySelectorAll(".notes.long").forEach(v => v.classList.replace("long", "short"));
  }
  else
  {
    document.querySelectorAll(".notes.short").forEach(v => v.classList.replace("short", "long"));
  }
  // UserID hide
  if (callOptions.show_userid_in_notes)
  {
    document.querySelectorAll(".userid.hide").forEach(v => v.classList.remove("hide"));
  }
  else
  {
    document.querySelectorAll(".userid").forEach(v => v.classList.add("hide"));
  }
  if (callOptions.call_buttons_display === 'mini')
  {
    document.querySelectorAll(".minibuttons").forEach(v => v.classList.remove("hide"));
    document.querySelectorAll("ol.CADDatabuttons").forEach(v => v.classList.add("hide"));
  }
  else
  {
    document.querySelectorAll(".minibuttons").forEach(v => v.classList.add("hide"));
    document.querySelectorAll("ol.CADDatabuttons").forEach(v => v.classList.remove("hide"));
  }
}

function ShowOnMap(lat, long) {
    if (lat === 0 || lat === '0') {
        currentlong = -81.80;
        currentlat = 29.950; // lon, lat
    } else {
        currentlat = lat;
        currentlong = long;
    }
    if ($(window).width() < 1000) {
        tabClick('tab-6');
    } 
    if (map !== null) {
        ShowMap();
    }
}

function ShowMap(event)
{
  require(["esri/geometry/Point"], function (Point)
  {
    var p = new Point([currentlong, currentlat]);
    if (currentlong === -81.80 && currentlat === 29.950)
    {
      map.centerAndZoom(p, 11);
    } else
    {
      map.centerAndZoom(p, 16);
      console.log('map extent', map.extent);
      console.log('map scale', map.getScale());
      console.log('map basemap', map.getBasemap(), map.getMaxScale(), map.getMinScale());

      console.log('map', map);
    }
    currentlat = null;
    if (mapload !== undefined)
    {
      mapload.remove();
    }
  });
}

function ToggleMapControl()
{
  let button = document.getElementById("mapcontrol");
  let basemapcontainer = document.getElementById("basemapcontrol");
  let layercontainer = document.getElementById("layercontrol");  
  if (basemapcontainer.style.display === "block")
  {
    button.textContent = "View Map Controls";
    basemapcontainer.style.display = "none";
    layercontainer.style.display = "none";
  }
  else
  {
    button.textContent = "Hide Map Controls";
    basemapcontainer.style.display = "block";
    layercontainer.style.display = "block";
  }
}

function ToggleHistoryFilters(element)
{
  let container = document.getElementById("historyfilters");
  if (container.classList.contains("show"))
  {
    container.classList.replace("show", "hide");
    showHistoryFilters = false;
    element.textContent = "Show Filters";
  }
  else
  {
    container.classList.replace("hide", "show");
    showHistoryFilters = true;
    element.textContent = "Hide Filters";
  }
}
function tabClick(tab)
{
  currenttab = tab;
  $('ul.tabs li').removeClass('current');
  $('.tab-content').removeClass('current');
  $('#li-' + tab).addClass('current');
  $("#" + tab).addClass('current');
  var tText = document.getElementById('li-' + tab).textContent;
  let container = document.getElementById("gridcontainer");
  let gutter = document.getElementById("gridgutter");
  //if (container.style.gridTemplateColumns !== '1fr' && container.style.gridTemplateColumns !== '' && container.style.gridTemplateColumns !== '1fr 1fr')
  //{
  //  console.log('setting container style', container.style.gridTemplateColumns);
  //  //containerStyle = container.style.gridTemplateColumns;
  //  //GoodCookies.set("Minicad_current_split", containerStyle, { sameSite: 'strict' });
  //}
  if (tText === 'Map')
  {
    if (map === null)
    {
      mapInit();
    }
    containerStyle = container.style.gridTemplateColumns;
    container.style.gridTemplateColumns = "1fr";
    container.style.gridTemplateAreas = "'header' 'right' 'footer'";
    gutter.style.display = "none";
  } else
  {
    if ($(window).width() > 999)
    {
      container.style.gridTemplateAreas = "'header header header' 'main gutter right' 'footer footer footer'";
      container.style.gridTemplateColumns = containerStyle;
        //grid-template-columns: 1fr auto 1fr;
    }
    gutter.style.display = "block";
  }
  if (map)
  {
    map.resize(true);
    map.reposition();
  }
}

function LoadUnitTableLayout()
{ // This function is responsible for creating the unit table, UpdateUnitTable will be responsible for keeping it up to date.
  var jqxhr = $.getJSON("./CallData/GetShortUnitStatus")
    .done(function (data)
    {
      var $ol = $('#AIR'), $li = [], unit = '';
      getVehicleSwaps(data.Records);
      for (var i = 0; i < data.Records.length; i++)
      {
        var item = data.Records[i];
        if (item.UnitType.trim().length > 0)
        {
          if ($ol.attr('id') !== item.UnitType)
          {
            $ol.append($li.join(''));// we've switched to the next group of unit types, so we need to write out the array $li to $ol
            $li = [];
            //console.log('test', item.UnitType, item, document.getElementById(item.UnitType));
            $ol = $('#' + item.UnitType);
          }
          $li.push("<li id='");
          $li.push(item.UnitName);
          $li.push("' class='");
          $li.push(unitStatusClass(item));
          //$li.push(item.UnitStatus);
          $li.push("' onclick='ClickUnitStatus(event, \"" + item.UnitName + "\")' onmouseover='HoverUnitStatus(event, \"" + item.UnitName + "\");' onmouseout='HideUnitStatusHover();'>"); //e.currentTarget.innerHTML // 
          //$li.push("<span class='green_tl_corner'></span>");
          //$li.push("<span>");
          $li.push(item.UnitName);
          //$li.push("</span>");
          $li.push("<img id='img-");
          $li.push(item.UnitName);
          $li.push("' src='");
          $li.push(item.LocationStatus);
          $li.push("' class='");
          if (item.LocationStatus.length === 0)
          {
            $li.push("imghide");
          }
          $li.push("' />");

          $li.push("</li>");
        }
      }
      $ol.append($li.join(''));// we've switched to the next group of unit types, so we need to write out the array $li to $ol
      lastunitdata = data; // we're going to be using lastunitdata for the hover functions.
      //addGroups('#OpsGroupsList', 'Ops');
      //addGroups('#EventGroupsList', 'Events');
      UpdateUnits();
    });
}

function unitStatusClass(u) {

  if (u.UnitStatus !== "Out-of-Service" && u.UnitStatus !== "Broke") {//"Available") {

    switch (u.UnitType) {
      case "ENGINE":
      case "LADDER":
        switch (countUnitManpower(u)) {
          case 0:
          case 1:
            return u.UnitStatus + "_red_" + checkSwap(u.UnitName);
          case 2:
            return u.UnitStatus + "_yellow_" + checkSwap(u.UnitName);
          default:
            return u.UnitStatus + "_green_" + checkSwap(u.UnitName);
        }
        //break;
      case "RESCUE":
        switch (countUnitManpower(u)) {
          case 0:
          case 1:
            return u.UnitStatus + "_red_" + checkSwap(u.UnitName);
          default:
            return u.UnitStatus + "_green_" + checkSwap(u.UnitName);
        }
        //break;
      default:
        return u.UnitStatus;

    }
  }
  
  else {
    return u.UnitStatus;
  }
}

function unitStatusClassExplain(u) {
  var x = {
    top_left: "",
    bottom_right: "Available_blank_" + checkSwap(u.UnitName),
    top_left_description: u.UnitType.toProperCase(),
    bottom_right_description: checkSwapExplain(u)
  };
  

  switch (u.UnitType) {
    case "ENGINE":
    case "LADDER":
      switch (countUnitManpower(u)) {
        case 0:
        case 1:
          x.top_left = "Available_red_blank";
          x.top_left_description += " with less than 2 staff.";
          return x;
        case 2:
          x.top_left = "Available_yellow_blank";
          x.top_left_description += " with only 2 staff.";
          return x;
        default:
          x.top_left = "Available_green_blank";
          x.top_left_description += " with at least 3 staff.";
          return x;
      }
      //break;
    case "RESCUE":
      switch (countUnitManpower(u)) {
        case 0:
        case 1:
          x.top_left = "Available_red_blank";
          x.top_left_description += " with only 1 staff.";
          return x;
        default:
          x.top_left = "Available_green_blank";
          x.top_left_description += " with at least 2 staff.";
          return x;
      }
      //break;
    default:
      return u.UnitStatus;
  }
  
}

function checkSwap(u) {
  // green for no swap
  // yellow for swap
  // red for bad swap
  for (var i = 0; i < vehicleSwaps.length; i++) {
    if (vehicleSwaps[i].main_unit === u) {
      if (vehicleSwaps[i].is_same_unittype()) {
        return "yellow";
      } else {
        return "red"; // bad swap
      }
    }
  }
  return "green";
}

function checkSwapExplain(u) {
  // green for no swap
  // yellow for swap
  // red for bad swap
  //console.log('checkswapexplain', u, vehicleSwaps);
  for (var i = 0; i < vehicleSwaps.length; i++) {
    if (vehicleSwaps[i].main_unit === u.UnitName) {
      if (vehicleSwaps[i].is_same_unittype()) {
        return "Vehicle is swapped to a similar spare.";
      } else {
        return "Vehicle is in a non-equivalent spare.";
      }
      //return "Vehicle is swapped to a similar spare.";
    }
  }
  return "Vehicle is not swapped.";
}

function UpdateUnitTable()
{ // This function is responsible for keeping the unit data up to date
  var jqxhr = $.getJSON("./CallData/GetShortUnitStatus")
    .done(function (data)
    {
      getVehicleSwaps(data.Records);
      for (var i = 0; i < data.Records.length; i++)
      {
        var item = data.Records[i];
        var currentUnit = $('#' + item.UnitName);
        var currentUnitImg = $('#img-' + item.UnitName);
        if (currentUnit.length)
        {
          //currentUnit.attr('class', item.UnitStatus).attr("onclick", "ClickUnitStatus(event)"); //, '" + item.UnitName + "'
          currentUnit.attr('class', unitStatusClass(item)).attr("onclick", "ClickUnitStatus(event, '" + item.UnitName + "')"); //, '" + item.UnitName + "'
          currentUnitImg.attr('src', item.LocationStatus);
          if (item.LocationStatus.length > 0)
          {
            currentUnitImg.attr('class', '');
          }
          else
          {
            currentUnitImg.attr('class', 'imghide');
          }
          
          //var $tmp = $('#img-' + item.UnitName);

          //if ($tmp.length)
          //{
          //  if (item.LocationStatus.length === 0)
          //  {
          //    $tmp.attr('class', 'imghide');
          //  }
          //  $tmp.attr("src", item.LocationStatus); //, '" + item.UnitName + "'
          //}
        }

      }
      lastunitdata = data;
      UpdateUnits();
    });
}

function ClickUnitStatus(e, currentunit)
{
  //currentunit = e.currentTarget.innerHTML.split('<')[0]; // Because we're inserting an img tag into the html, we can negate it by doing this.
  var i = getUnitIndex(currentunit);
  var item = lastunitdata.Records[i];
  if (item.Latitude !== 0)
  {
    CheckInactiveUnit(currentunit);
    ShowOnMap(item.Latitude, item.Longitude);
  }
}

function HoverUnitStatus(e, currentunit) {
  //console.log('hoverunitstatus e', e);
  //currentunit = e.currentTarget.innerHTML.split('<')[0]; // Because we're inserting an img tag into the html, we can negate it by doing this.
  var left = e.clientX + 5;
  var top = e.clientY + 5;
  var $div = $('#UnitStatusHover');
  var i = getUnitIndex(currentunit);
  var item = lastunitdata.Records[i];
  $div.html(buildUnitDisplay(item, ''));
  $div.css('display', 'block');
  var divwidth = $div.width(), divheight = $div.height();
  if ((left + divwidth) > window.innerWidth) {
    left = (window.innerWidth - divwidth);
  }
  if ((top + divheight) > window.innerHeight) {
    top = (window.innerHeight - divheight);
  }
  $div.css('left', left + 'px');
  $div.css('top', top + 'px');
}

function buildUnitDisplay(item, classToUse)
{
  //if (item.UnitStatus.indexOf('Available') !== -1) console.log('unit', item);
  var x = [];
  x.push("<ol class='");
  x.push(classToUse);
  x.push("'><li class='" + item.UnitStatus + "'>" + item.UnitStatus + "</li>");
  if (item.Location.length > 0)
  {
    x.push("<li>" + item.Location + "</li>");
  }
  x.push("<li>Station Assigned: " + item.District + "</li>");
  if (item.District !== item.HomeStation)
  {
    x.push("<li>Home Station: " + item.HomeStation + "</li>");
  }

  if (item.Staff.length > 0)
  {
    for (var j = 0; j < item.Staff.length; j++)
    {
      x.push("<li>" + item.Staff[j] + "</li>");
    }
  } else
  {
    x.push("<li>" + item.PrimeOfficer + "</li>");
  }
  if (item.LocationStatus.length > 0) 
  {
    x.push("<li>Location Type: ");
    x.push(item.LocationType);
    x.push("</li><li>");
    x.push("Updated: ");
    x.push(timeStamp(item.Timestamp));
    x.push("</li>");
  }
  if (item.Latitude > 0 && (item.Speed > 0 || item.Heading > 0))
  {
    x.push("<li>Speed: ");
    x.push(item.Speed.toString());
    x.push("</li><li>");
    x.push("Heading: ");
    x.push(item.Heading.toString());
    x.push("</li>");
  }

  var tmp = unitStatusClass(item);
  if (tmp !== item.UnitStatus)
  {
    var explain = unitStatusClassExplain(item);
    x.push("<li class='");
    x.push(explain.top_left);
    x.push("'>");
    x.push(explain.top_left_description);
    x.push("</li>");
    x.push("<li class='");
    x.push(explain.bottom_right);
    x.push("'>");
    x.push(explain.bottom_right_description);
    x.push("</li>");
  }
  x.push("</ol>");
  return x.join('');
}

function createCallerLocationLI(label, value)
{
  let li = document.createElement("li");
  if (label.length === 0)
  {
    li.appendChild(document.createTextNode(value));
  }
  else
  {
    li.appendChild(document.createTextNode(label + ' : ' + value));
  }
  return li;
}

function Format_DateTime(date)
{
  if (date instanceof Date)
  {
    return date.toLocaleString('en-us');
  }
  return new Date(date).toLocaleString('en-US');
}

function buildCallerDisplay(callers, classToUse)
{
  let ol = document.createElement("ol");
  ol.classList.add(classToUse);
  for (var i = 0; i < callers.length; i++)
  {
    var caller = callers[i];
    ol.appendChild(createCallerLocationLI("Phone Number", caller.phone_number));
    ol.appendChild(createCallerLocationLI("Call Received", caller.formatted_call_origin_time));
    ol.appendChild(createCallerLocationLI("Agency", caller.agency));
    ol.appendChild(createCallerLocationLI("Call Type", caller.call_type));
    ol.appendChild(createCallerLocationLI("Confidence", caller.confidence));
    ol.appendChild(createCallerLocationLI("Caller ID", caller.unique_id));
  }
  return ol;
}

function HideUnitStatusHover() {
    document.getElementById('UnitStatusHover').style.display = 'none';
    currentunit = '';
}

function LoadAdvisoryTable() {
    LoadCADCalls('./CallData/GetAdvisories', '#advisory');
}

function lidataUrl(idtouse, classtouse, labeltouse, data, MapUrl) {
  var x = [], $id = '', $class = '', $label = '';
  if (idtouse.length > 0) { $id = ' id="' + idtouse + '"'; }
  if (classtouse.length > 0) { $class = ' class="' + classtouse + '"'; }
  if (labeltouse.length > 0) { $label = ' <label>' + labeltouse + '</label>'; }
  x.push('<li');
  x.push($id);
  x.push($class);
  x.push('>');
  x.push($label);
  x.push('<span onclick="viewUrl(');
  x.push("'" + MapUrl + "')");
  x.push('">');
  x.push(data);
  x.push('</span></li>');
  return x.join('');
}

function viewUrl(u) {
  window.open("https://maps.google.com/maps?saddr=&z=19&maptype=satellite&daddr=" + u, "_blank");
}

//<a title='Clicking this will try to bring up Google Maps for this address.' 
// href='https://maps.google.com/maps?saddr=&z=19&maptype=satellite&daddr=" + data.MapURL + "' target='_Blank'>Map</a></li>");

function ToggleNotes(IncidentID, prefix) {
    //$('.dispatch, .linesep').toggle();
    //$('.linesep:nth-last-child(1), .linesep:nth-last-child(2)').css('display', 'none');
    //x.push("<ol class='notes short' id='active_notes_short-" + data.IncidentID + "' ");
  let container = document.getElementById(prefix + '_notes-' + IncidentID);
  if (!container) return;
  if (container.classList.contains("short"))
  {
    container.classList.replace("short", "long");
  }
  else
  {
    container.classList.replace( "long","short");
  }
}

function UpdateActiveCallsTable() {
    var jqxhr = $.getJSON('./CallData/GetActiveCalls')
    .done(function (data) {
        currentactivedata = data;
        if (data.Records.length > 0) {
            var $active = $('#active');
            for (var i = data.Records.length - 1; i >= 0; i--) {
              UpdateActiveCall(data.Records[i], $active, i);
              BuildNotes(data.Records[i]);
            }
        }
        HandleClosedCalls(data);
        lastactivedata = data;
        setTimeout(function () { UpdateActiveCallsMap(data); }, 3000);
        ShowMessage('', '#active');
        if (data.TotalRecordCount === 0 || data.TotalRecordCount === undefined) {  // let's update the tab to show the number of active calls
            $('#li-tab-1').text('Active Calls');
            ShowMessage('No records found.', '#active');
        } else {
            $('#li-tab-1').text('Active Calls (' + data.TotalRecordCount + ')');

        }
    })
    .fail(function () {
        ShowMessage('Error attempting to get a list of calls.  Are you connected to the internet?', '#active');
    });
}

function updateHistoricalCallsTable() {
    LoadCADCalls("./CallData/GetHistoricalCalls", "#historical");
}

function UpdateActiveCall(record, target, index) {
  var $call = $('#' + record.IncidentID);
  if ($call.length)
  {
    // removed on 8/27/2021
    //$call.find('.CADDatabuttons .detailbutton a').attr('href', 'javascript:ToggleDetail("' + record.IncidentID + '","' + index + '", "' + target.selector + '")');
    //$call.find('.CADDatabuttons .historybutton a').attr('href', 'javascript:ToggleHistoryByAddress("' + record.IncidentID + '","' + index + '", "#active")');

    //$call.find('.CADDatabuttons .mapbutton a').attr('href', 'https://maps.google.com/maps?saddr=&z=20&maptype=satellite&daddr=' +  record.MapURL);
    $call.find('.CADDatabuttons .mapbutton a').attr('href', 'javascript:ShowOnMap("' + record.Latitude + '","' + record.Longitude + '")');
    $call.find('.minibuttons .minimapbutton').attr('onclick', 'ShowOnMap(' + record.Latitude + ', ' + record.Longitude + ')');
    
    
    $call.find('li.age span').text(record.Age);
    $call.find('li.district span').text(record.District);
    $call.find('li.nature span').text(record.NatureCode);
    $call.find('li.street span').text(record.Location);
    $call.find('li.calltime span').text(record.FormattedCallTime);
    $call.find('li.crossstreet span').text(record.CrossStreet);
    $call.find('li.business span').text(record.BusinessName);
    $call.find('li.usng span').text(record.CallLocationUSNG);
    $call.find('li.callerusng span').text(record.CallerLocationUSNG);
    $call.find('li.callerlocationage span').text(record.CallerLocationAge);
    $call.find('li.callerlocationconfidence span').text(record.CallerLocationConfidence);
    $call.find('li.ccfr span').text(record.CCFR);
    $call.find('li.staffdispatched span').text(countManpower(record, ['Dispatched', 'En-Route']));
    $call.find('li.staffarrived span').text(countManpower(record, ['Arrived']));
    //x.push(lidata('', 'manpower', 'Clay Manpower', countManpower(data)));
    //var test = record.Notes.toProperCase().replace(/\[/g, "<span class='linesep'></span><span class='dispatch'>[").replace(/(?:\r\n|\r|\n)/g, "</span>");
    //console.log('test', test);
    //$call.find('ol li.notes a').html(test);
    var xx = [], units = record.Units;
    for (var i = 0; i < units.length; i++) {
      //xx.push("<li class='" + units[i].UnitStatus);
      //var unit = '"' + units[i].UnitName + '"';
      //xx.push("' onclick='ClickUnitStatus(event)' onmouseover='HoverUnitStatus(event);' onmouseout='HideUnitStatusHover();");
      //xx.push("'>" + units[i].UnitName + "</li>");
      var item = units[i];
      xx.push("<li class='");
      xx.push(unitStatusClass(units[i]));
      xx.push("' onclick='ClickUnitStatus(event, \"" + units[i].UnitName + "\")' onmouseover='HoverUnitStatus(event, \"" + units[i].UnitName + "\");' onmouseout='HideUnitStatusHover();'>"); //e.currentTarget.innerHTML // 
      xx.push(item.UnitName);
      xx.push("<img src='");
      xx.push(item.LocationStatus);
      xx.push("' class='");
      if (item.LocationStatus.length === 0) {
        xx.push("imghide");
      }
      xx.push("' />");
      xx.push("</li>");

    }
    $call.find('ol.unitlist').html(xx.join(''));

  } else {
    target.prepend(CreateCallLayout(record, index, '#active'));
    HandleDetailAndHistoryButtons(record);
    BuildNotes(record);
  }
}

function HandleDetailAndHistoryButtons(record)
{
  // We're going to look for detail and history buttons that are missing a "live" class.
  // the purpose of the live class is to indicate that this button has been wired up with the 
  // correct function
  HandleDetailsButton(record);

  HandleHistoricalCallsButton(record);

}

function HandleHistoricalCallsButton(record)
{
  //x.push("   <li class='historybutton'><a id='calladdresshistory-" + data.IncidentID + "'>History</a></li>");
  //x.push("<ol class='historybyaddressbase' style='display: none;' id='historylist-" + data.IncidentID + "'>");
  let minihistoricalcallsbutton = document.getElementById("mini-calladdresshistory-" + record.IncidentID);
  let historicalcallsbutton = document.getElementById("calladdresshistory-" + record.IncidentID);
  let historicalcallsContainer = document.getElementById("historylist-" + record.IncidentID);
  let detailsContainer = document.getElementById("detaillist-" + record.IncidentID);
  if (historicalcallsbutton && !historicalcallsbutton.classList.contains("live") && !minihistoricalcallsbutton.classList.contains("live") && historicalcallsContainer)
  {
    historicalcallsbutton.classList.add("live");
    historicalcallsbutton.parentElement.onclick = function ()
    {
      HistoricalCallsButtonClick(record, minihistoricalcallsbutton, historicalcallsbutton, historicalcallsContainer, detailsContainer);
    }
    minihistoricalcallsbutton.classList.add("live");
    minihistoricalcallsbutton.onclick = function ()
    {
      HistoricalCallsButtonClick(record, minihistoricalcallsbutton, historicalcallsbutton, historicalcallsContainer, detailsContainer);
    }
  }
}

function HistoricalCallsButtonClick(record, minihistoricalcallsbutton, historicalcallsbutton,
  historicalcallsContainer, detailsContainer)
{
  if (historicalcallsContainer.style.display === "block")
  {
    historicalcallsContainer.style.display = "none";
  }
  else
  {
    if (historicalcallsContainer.childElementCount === 0 || (record && record.HistoricalCallsByAddress === null))
    {
      // let's load them
      historicalcallsbutton.textContent = "Loading History...";      
      let requestURL = './CallData/GetHistoricalCallHistory?IncidentID=' + record.IncidentID;
      $.getJSON(requestURL)
        .done(function (data)
        {
          historicalcallsbutton.textContent = "History";
          if (data === null || data.Records === null)
          {
            record.HistoricalCallsByAddress = null; // we set this to null if we want to indicate an error state.             
          }
          else
          {
            record.HistoricalCallsByAddress = data.Records;
          }
          BuildHistoricalCalls(record, historicalcallsContainer);
          historicalcallsContainer.style.display = "block";
          detailsContainer.style.display = 'none';
          // We have to remove the interval here just in case the call details were shown prior to viewing the
          // call history.  One replaces the other.
          RemoveInterval(record.IncidentID);
        })
        .fail(function ()
        {
          record.HistoricalCallsByAddress = null;
          historicalcallsbutton.textContent = "History";
          BuildHistoricalCalls(record, historicalcallsContainer);
          console.log('Failed to load Call Detail');
          historicalcallsContainer.style.display = "block";
          detailsContainer.style.display = 'none';
          RemoveInterval(record.IncidentID);
        });
    }
    else
    {
      historicalcallsContainer.style.display = "block";
      detailsContainer.style.display = 'none';
      RemoveInterval(record.IncidentID);
    }
  }
}

function BuildHistoricalCalls(record, container)
{
  if (record && record.HistoricalCallsByAddress === null || record.HistoricalCallsByAddress.length === 0)
  {
    let message = document.createElement("li");
    if (!record || record.HistoricalCallsByAddress === null)
    {
      message.textContent = "There was a problem loading the Historical Calls for this call.";
    }
    else
    {
      message.textContent = "No previous calls to this address.";
    }
    container.appendChild(message);
  }
  else
  {
    ClearElement(container);
    for (let i = 0; i < record.HistoricalCallsByAddress.length; i++)
    {
      let historicalcall = record.HistoricalCallsByAddress[i];
      container.appendChild(BuildHistoricalCall(historicalcall));
    }
  }
}

function BuildHistoricalCall(call)
{
  let historyrow = document.createElement("li");
  historyrow.classList.add("historyrow");
  let historicalcallContainer = document.createElement("ol");
  historicalcallContainer.classList.add("CADData");
  historicalcallContainer.appendChild(CreateDetailRow('historynature', 'Nature Code', call.Nature));
  historicalcallContainer.appendChild(CreateDetailRow('historyage', 'Calltime', call.LongCallTime));
  historyrow.appendChild(historicalcallContainer);
  let notesContainer = document.createElement("ol");
  notesContainer.id = "historical_notes-" + call.IncidentID;
  notesContainer.onclick = function ()
  {
    ToggleNotes(call.IncidentID, 'historical');
  }

  notesContainer.classList.add("historynotes", "short");

  BuildHistoricalCallNotes(call, notesContainer);
  historyrow.appendChild(notesContainer);
  return historyrow;
}

function HandleDetailsButton(record)
{
  //x.push("   <li class='detailbutton'><a id='calldetail-" + data.IncidentID + "'>Detail</a></li>");
  //x.push("<ol class='calldetailbase' style='display: none;' id='detaillist-" + data.IncidentID + "'>");
  let minidetailbutton = document.getElementById("mini-calldetail-" + record.IncidentID);
  let detailbutton = document.getElementById("calldetail-" + record.IncidentID);
  let detailsContainer = document.getElementById("detaillist-" + record.IncidentID);
  let historicalcallsContainer = document.getElementById("historylist-" + record.IncidentID);
  if (detailbutton && !detailbutton.classList.contains("live") && detailsContainer)    
  {
    detailbutton.classList.add("live"); // live means that the button's onclick event has been added.
    detailbutton.onclick = function ()
    {
      DetailButtonClick(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer);
    }
    minidetailbutton.classList.add("live");
    minidetailbutton.onclick = function ()
    {
      DetailButtonClick(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer);
    }
  }
}

function DetailButtonClick(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer)
{
  if (detailsContainer.style.display === "block")
  {
    // we need to hide the call details and reset the CallDetails part of the record.
    // we're using the record.CallDetails value as our toggle.  If it is not null, we know we're displaying 
    // those records at the moment.
    RemoveInterval(record.IncidentID);
    record.CallDetails = null;
    detailsContainer.style.display = "none";
    ClearElement(detailsContainer);    
  }
  else
  {
    // let's load the calldetails and display them
    minidetailbutton.textContent = "...";
    detailbutton.textContent = "Loading Details...";
    GetAndUpdateCallDetails(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer);
    let intervalid = setInterval(function ()
    {
      GetAndUpdateCallDetails(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer);
    }, 10000);
    activeIntervals.push({ IncidentID: record.IncidentID, IntervalID: intervalid });
  }
}

function RemoveInterval(IncidentID)
{
  let index = activeIntervals.findIndex(function (j, t)
  {
    return j.IncidentID === IncidentID;
  });
  if (index !== -1)
  {
    clearInterval(activeIntervals[index].IntervalID);
    activeIntervals = activeIntervals.filter(j => j.IncidentID !== IncidentID);
  }
}

function GetAndUpdateCallDetails(record, minidetailbutton, detailbutton, detailsContainer, historicalcallsContainer)
{
  let timestamp = '';
  if (record && record.CallDetails && record.CallDetails.length > 0)
  {
    let ordered = record.CallDetails.sort(function (a, b)
    {
      return Date.parse(timeStamp(a.Timestamp)) < Date.parse(timeStamp(b.Timestamp));
    });
    timestamp = timeStamp(ordered[0].Timestamp);
  }
  let requestURL = './CallData/GetCallDetail?IncidentID=' + record.IncidentID + '&Timestamp=' + timestamp; 
  $.getJSON(requestURL)
    .done(function (data)
    {
      minidetailbutton.textContent = "D";
      detailbutton.textContent = "Details";

      if (data === null || data.Records === null)
      {
        record.CallDetails = null; // we set this to null if we want to indicate an error state.             
      }
      else
      {
        if (record && record.CallDetails && record.CallDetails.length > 0 && data.Records.length > 0)
        {
          data.Records.reverse();
          for (let i = 0; i < data.Records.length; i++)
          {
            record.CallDetails.unshift(data.Records[i]);
          }
        }
        else
        {
          record.CallDetails = data.Records;
        }        
      }
      BuildCallDetails(record, detailsContainer);
      detailsContainer.style.display = "block";
      historicalcallsContainer.style.display = 'none';
    })
    .fail(function ()
    {
      record.CallDetails = null;
      minidetailbutton.textContent = "D";
      detailbutton.textContent = "Details";
      BuildCallDetails(record, detailsContainer);
      console.log('Failed to load Call Detail');
      detailsContainer.style.display = "block";
    });
}

function lidata(idtouse, classtouse, labeltouse, data)
{
  var x = [], $id = '', $class = '', $label = '';
  if (idtouse.length > 0) { $id = ' id="' + idtouse + '"'; }
  if (classtouse.length > 0) { $class = ' class="' + classtouse + '"'; }
  if (labeltouse.length > 0) { $label = ' <label>' + labeltouse + '</label>'; }
  x.push('<li');
  x.push($id);
  x.push($class);
  x.push('>');
  x.push($label);
  x.push('<span>');
  x.push(data);
  x.push('</span></li>');
  return x.join('');
}

function BuildCallDetails(record, container)
{
  // add header row
  //var x = ['<li class="detailheader"><span>Detail for Incident Id: ' + inciid + '</span></li>'];
  let dataExists = container.childElementCount > 0;
  if (!dataExists)
  {
    let detailheader = document.createElement("li");
    detailheader.classList.add("detailheader");

    let incidentid = document.createElement("span");
    incidentid.textContent = 'Detail for Incident Id: ' + record.IncidentID;
    detailheader.appendChild(incidentid);
    container.appendChild(detailheader);
  }

  if (record.CallDetails)
  {
    for (let i = 0; i < record.CallDetails.length; i++)
    {
      let detail = record.CallDetails[i];
      let detailrow = document.createElement("li");
      let id = "detailrow-" + detail.LogID.toString() + '-' + detail.NoteID.toString()
      if (!document.getElementById(id))
      {
        detailrow.id = id;
        detailrow.classList.add("detailrow");
        let innercontainer = document.createElement("ol");
        innercontainer.classList.add("calldetail");

        innercontainer.appendChild(CreateDetailRow('userid', 'UserID', detail.UserID));
        innercontainer.appendChild(CreateDetailRow('desc', 'Desc', detail.Description));
        innercontainer.appendChild(CreateDetailRow('timestamp', 'Date', detail.FormattedTimestamp));
        innercontainer.appendChild(CreateDetailRow('unit', 'Unit', detail.Unit));
        innercontainer.appendChild(CreateDetailRow('usertyped', 'User Typed', detail.UserTyped));
        innercontainer.appendChild(CreateDetailRow('comments', 'Comments', detail.Comments));
        detailrow.appendChild(innercontainer)
        if (dataExists)
        {
          // We add the new detail rows this way in order to preserve detailheader element being at the top.
          let fc = container.firstChild;
          fc.insertAdjacentElement('afterend', detailrow);
          //container.prepend(detailrow);
        }
        else
        {
          container.appendChild(detailrow);
        }
      }
    }
  }
  // add footer row if no records or error condition present.
  let footer = document.createElement("li");
  if (record.CallDetails === null)
  {
    footer.textContent = "There was a problem retrieving this Call's Details.";
  }
  else
  {
    if (record.CallDetails.length === 0)
    {
      footer.textContent = "No details were found for this call.";
    }
  }
  container.appendChild(footer);
}

function CreateDetailRow(classtouse, labeltouse, data)
{
  let li = document.createElement("li");
  li.classList.add(classtouse);
  let label = document.createElement("label");
  label.textContent = labeltouse
  let text = document.createElement("span");
  text.textContent = data;
  li.appendChild(label);
  li.appendChild(text);
  return li;
}

function BuildNotes(record)
{
  let container = document.getElementById("active_notes-" + record.IncidentID);
  if (!container) return;
  let prepend = container.childElementCount > 0;
  for (let i = 0; i < record.Notes.length; i++) 
  {
    let note = record.Notes[i];
      //if (record.Notes[i + 1] && record.Notes[i].timestamp > record.Notes[i + 1]) alert("Timestamps out of order" + record.Notes[i] + record.Notes[i + 1]);
    if (!document.getElementById("normalcall-note-" + note.log_id.toString() + '-' + note.note_id.toString()))
    {
      if (prepend)
      {
        container.prepend(CreateNote(note, 'normalcall'));
      }
      else
      {
        container.appendChild(CreateNote(note, 'normalcall'));
      }
    }
  }
}

function BuildHistoricalCallNotes(record, container)
{
  for (let i = 0; i < record.Notes.length; i++) 
  {
    let note = record.Notes[i];
    if (!document.getElementById("historicalcall-note-" + note.log_id.toString() + '-' + note.note_id.toString()))
    {
      container.appendChild(CreateNote(note, 'historicalcall'));
    }
  }
}

function CreateNote(note, idPrefix)
{
  let li = document.createElement("li");
  li.id = idPrefix + "-note-" + note.log_id.toString() + '-' + note.note_id.toString();
  let userid = document.createElement("span");
  let timestamp = document.createElement("span");
  let text = document.createElement("span");
  userid.appendChild(document.createTextNode(note.userid));
  userid.classList.add("userid");  
  timestamp.appendChild(document.createTextNode(note.formatted_timestamp));
  timestamp.classList.add("timestamp");
  text.appendChild(document.createTextNode(note.note.toProperCase()));
  text.classList.add("text");
  li.appendChild(userid);
  li.appendChild(timestamp);
  li.appendChild(text);
  return li;
}

function HandleClosedCalls(data) {
    // here we're going to compare the incidentIDs in lastactivedata versus data, if one is in lastactivedata but not in data, we're going to remove it
    for (var i = 0; i < lastactivedata.Records.length; i++) {
        var x = getCallIndex(lastactivedata.Records[i].IncidentID, data);
        if (x === -1) {            
          $('#' + lastactivedata.Records[i].IncidentID).remove();
          RemoveInterval(lastactivedata.Records[i].IncidentID);
        }
    }
}

function CreateHistoryCallFilters()
{
  let container = document.createElement("fieldset");
  container.style.padding = ".5em 1em .5em 1em";
  container.style.marginLeft = 0;
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.flexDirection = "row";
  container.style.width = "100%";
  // header container
  let headerContainer = document.createElement("div");
  headerContainer.style.display = "flex";
  headerContainer.style.flexDirection = "row";
  headerContainer.style.width = "100%";
  headerContainer.classList.add("historyheader");
  container.appendChild(headerContainer);
  let title = document.createElement("span");
  title.textContent = "Historical Call Filters";
  title.style.width = "50%";
  title.style.fontWeight = "bolder";
  title.style.fontSize = "1.2em";
  headerContainer.appendChild(title);
  let headerButton = document.createElement("a");
  headerButton.onclick = function ()
  {
    ToggleHistoryFilters(headerButton);
  };
  headerButton.style.width = "50%";
  headerButton.style.paddingRight = "1em";
  headerButton.style.textAlign = "end";
  headerButton.style.cursor = "pointer";
  headerButton.textContent = showHistoryFilters ? "Hide Filters" : "Show Filters" ;
  headerContainer.appendChild(headerButton);
  // filters
  let filterContainer = document.createElement("div");
  filterContainer.id = "historyfilters";
  filterContainer.classList.add(showHistoryFilters ? "show" : "hide");
  filterContainer.style.width = "100%";
  filterContainer.style.flexWrap = "wrap";
  // call type filter
  let calltypeOuterContainer = CreateFilterContainer("40%", "column");
  let calltypeInnerContainer = CreateFilterContainer("100%", "row");
  calltypeOuterContainer.appendChild(calltypeInnerContainer);
  calltypeInnerContainer.appendChild(CreateHistoryRadioFilter("call_type", "all", historyfilters.callType === "all"));
  calltypeInnerContainer.appendChild(CreateHistoryLabelFilter("call_type", "all", "All Calls"));
  calltypeInnerContainer.appendChild(CreateHistoryRadioFilter("call_type", "fire", historyfilters.callType === "fire"));
  calltypeInnerContainer.appendChild(CreateHistoryLabelFilter("call_type", "fire", "Fire"));
  calltypeInnerContainer.appendChild(CreateHistoryRadioFilter("call_type", "ems", historyfilters.callType === "ems"));
  calltypeInnerContainer.appendChild(CreateHistoryLabelFilter("call_type", "ems", "EMS"));
  calltypeInnerContainer.appendChild(CreateHistoryRadioFilter("call_type", "admin", historyfilters.callType === "admin"));
  calltypeInnerContainer.appendChild(CreateHistoryLabelFilter("call_type", "admin", "Admin"));
  filterContainer.appendChild(calltypeOuterContainer);
  // emergency filter
  let emergencyOuterContainer = CreateFilterContainer("60%", "column");
  let emergencyInnerContainer = CreateFilterContainer("100%", "row");
  emergencyOuterContainer.appendChild(emergencyInnerContainer);
  emergencyInnerContainer.appendChild(CreateHistoryRadioFilter("emergency", "all", historyfilters.emergency === "all"));
  emergencyInnerContainer.appendChild(CreateHistoryLabelFilter("emergency", "all", "All Calls"));
  emergencyInnerContainer.appendChild(CreateHistoryRadioFilter("emergency", "emergency", historyfilters.emergency === "emergency"));
  emergencyInnerContainer.appendChild(CreateHistoryLabelFilter("emergency", "emergency", "Emergency"));
  emergencyInnerContainer.appendChild(CreateHistoryRadioFilter("emergency", "non_emergency", historyfilters.emergency === "non_emergency"));
  emergencyInnerContainer.appendChild(CreateHistoryLabelFilter("emergency", "non_emergency", "Non Emergency"));
  filterContainer.appendChild(emergencyOuterContainer);
  
  // division
  let divisionOuterContainer = CreateFilterContainer("40%", "column");
  let divisionInnerContainer = CreateFilterContainer("100%", "row");
  divisionOuterContainer.appendChild(divisionInnerContainer);
  divisionInnerContainer.appendChild(CreateHistoryLabelFilter("district", "filter", "District"));
  let divisionSelect = document.createElement("select");
  divisionSelect.id = "district_filter";
  for (let i = 0; i < filterDistrictLabels.length; i++)
  {
    let label = filterDistrictLabels[i];
    let value = filterDistrictValues[i]
    let selected = historyfilters.district === value;
    divisionSelect.appendChild(CreateOption(label, value, selected));
  }
  divisionSelect.onchange = function ()
  {
    HistoryFilterChange();
  }
  divisionInnerContainer.appendChild(divisionSelect);
  filterContainer.appendChild(divisionOuterContainer);

  // text search
  let textOuterContainer = CreateFilterContainer("60%", "column");
  let textInnerContainer = CreateFilterContainer("100%", "row");
  textInnerContainer.paddingLeft = "1em";
  textInnerContainer.paddingRight = "1em";
  textOuterContainer.appendChild(textInnerContainer);
  let textsearch = document.createElement("input");
  textsearch.id = "text_filter";
  textsearch.type = "text";
  textsearch.maxLength = 25;
  textsearch.style.width = "70%";  
  textsearch.placeholder = "Filter By Partial Street, or Incident #";
  textsearch.value = historyfilters.searchText;  
  textsearch.title = "Search by Partial Street Names, Incident Numbers";
  textsearch.addEventListener("keyup", function (event)
  {
    if (event.keyCode === 13)
    {
      event.preventDefault();
      HistoryFilterChange();
    }
  });
  textInnerContainer.appendChild(textsearch);
  let textsearchClearbutton = document.createElement("button");
  textsearchClearbutton.textContent = "Clear";
  textsearchClearbutton.style.display = "inline";
  textsearchClearbutton.style.cursor = "pointer";
  textsearchClearbutton.style.marginLeft = ".25em";
  textsearchClearbutton.onclick = function ()
  {
    document.getElementById("text_filter").value = "";
    HistoryFilterChange();
  }
  
  textInnerContainer.appendChild(textsearchClearbutton);
  filterContainer.appendChild(textOuterContainer);

  // Unit
  let unitOuterContainer = CreateFilterContainer("40%", "column");
  let unitInnerContainer = CreateFilterContainer("100%", "row");
  unitOuterContainer.appendChild(unitInnerContainer);
  unitInnerContainer.appendChild(CreateHistoryLabelFilter("unit", "filter", "Unit"));
  let unitsearch = document.createElement("input");
  unitsearch.id = "unit_filter";
  unitsearch.type = "text";
  unitsearch.maxLength = 10;
  unitsearch.style.width = "4em";
  unitsearch.placeholder = "R88";
  unitsearch.value = historyfilters.unit;
  unitsearch.title = "Search by Full Unit Name. Partial Matches will not work.";
  unitsearch.addEventListener("keyup", function (event)
  {
    if (event.keyCode === 13)
    {
      event.preventDefault();
      HistoryFilterChange();
    }
  });
  unitInnerContainer.appendChild(unitsearch);
  let unitsearchClearbutton = document.createElement("button");
  unitsearchClearbutton.textContent = "Clear";
  unitsearchClearbutton.style.display = "inline";
  unitsearchClearbutton.style.cursor = "pointer";
  unitsearchClearbutton.style.marginLeft = ".25em";
  unitsearchClearbutton.onclick = function ()
  {
    document.getElementById("unit_filter").value = "";
    HistoryFilterChange();
  }  
  unitInnerContainer.appendChild(unitsearchClearbutton);
  filterContainer.append(unitOuterContainer);

  // Nature Code
  let natureOuterContainer = CreateFilterContainer("60%", "column");
  let natureInnerContainer = CreateFilterContainer("100%", "row");
  natureInnerContainer.paddingLeft = "1em";
  natureInnerContainer.paddingRight = "1em";
  natureOuterContainer.appendChild(natureInnerContainer);
  let naturesearch = document.createElement("input");
  naturesearch.id = "nature_filter";
  naturesearch.type = "text";
  naturesearch.maxLength = 50;
  naturesearch.style.width = "70%";
  naturesearch.placeholder = "Filter By Nature";
  naturesearch.value = historyfilters.nature;
  naturesearch.title = "Search by Nature";
  naturesearch.addEventListener("keyup", function (event)
  {
    if (event.keyCode === 13)
    {
      event.preventDefault();
      HistoryFilterChange();
    }
  });
  natureInnerContainer.appendChild(naturesearch);
  let naturesearchbutton = document.createElement("button");
  naturesearchbutton.textContent = "Search";
  naturesearchbutton.style.display = "inline";
  naturesearchbutton.style.cursor = "pointer";
  naturesearchbutton.style.marginLeft = ".25em";
  naturesearchbutton.style.marginRight = ".25em";
  naturesearchbutton.onclick = function ()
  {
    HistoryFilterChange();
  }
  let naturesearchClearbutton = document.createElement("button");
  naturesearchClearbutton.textContent = "Clear";
  naturesearchClearbutton.style.display = "inline";
  naturesearchClearbutton.style.cursor = "pointer";
  naturesearchClearbutton.style.marginLeft = ".25em";
  naturesearchClearbutton.onclick = function ()
  {
    document.getElementById("nature_filter").value = "";
    HistoryFilterChange();
  }
  natureInnerContainer.appendChild(naturesearchClearbutton);
  natureInnerContainer.appendChild(naturesearchbutton);  
  filterContainer.appendChild(natureOuterContainer);

  container.appendChild(filterContainer);
  return container;
}

function CreateOption(label, value, selected)
{
  let o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  o.selected = selected;
  return o;
}

function CreateFilterContainer(width, direction)
{
  let c = document.createElement("div");
  //c.style.marginTop = ".5em";
  //c.style.display = "flex";
  //c.style.flexDirection = direction;
  //c.style.flexWrap = "wrap";
  //c.style.justifyContent = "start";
  //c.style.alignItems = "center";
  //c.style.width = width;
  c.classList.add("HistoryFilterContainer");
  if (width === "40%") c.classList.add("Short");
  if (width === "60%") c.classList.add("Long");
  if (width === "100%") c.classList.add("Full");
  c.classList.add(direction === "column" ? "Outer" : "Inner");
  return c;
}

function HistoryFilterChange()
{
  historyfilters.callType = document.querySelector('input[name="call_type"]:checked').value;
  historyfilters.emergency = document.querySelector('input[name="emergency"]:checked').value;
  historyfilters.district = document.getElementById("district_filter").value;
  historyfilters.searchText = document.getElementById("text_filter").value;
  historyfilters.unit = document.getElementById("unit_filter").value;
  historyfilters.nature = document.getElementById("nature_filter").value;
  ApplyHistoryFilter();
  LoadFilteredHistoricalCalls();
  UpdateHistoricalCallsMap(filteredlasthistoricaldata);
}

function ApplyHistoryFilter()
{
  let ct = historyfilters.callType.toUpperCase();  
  let emergency = historyfilters.emergency === "emergency";
  let searchtext = historyfilters.searchText.toUpperCase();
  let unit = historyfilters.unit.trim().toUpperCase();
  let nature = historyfilters.nature.trim().toUpperCase();
  filteredlasthistoricaldata = lasthistoricaldata.Records.filter(function (j)
  {
    let calltypecheck = true;  
    let emergencycheck = true;
    let districtcheck = true;
    let textcheck = true;
    let unitcheck = true;
    let naturecheck = true;
    if (historyfilters.callType !== 'all')
    {
      calltypecheck = j.CallType === ct;      
    }
    if (historyfilters.emergency !== 'all')
    {
      emergencycheck = j.IsEmergency === emergency;
    }
    if (historyfilters.district !== 'all')
    {
      districtcheck = j.District.trim() === historyfilters.district;
    }
    if (searchtext.trim().length > 0)
    {
      textcheck = ((j.Street.indexOf(searchtext) > -1) || j.CCFR.indexOf(searchtext) > -1);
    }
    if (unit.length > 0)
    {
      unitcheck = j.Units.filter(u => u.UnitName === unit).length > 0;
    }
    if (nature.length > 0)
    {
      naturecheck = (j.NatureCode.indexOf(nature) > -1);
    }
    return calltypecheck && emergencycheck && districtcheck && textcheck && unitcheck && naturecheck;
  });

}

function LoadFilteredHistoricalCalls()
{
  let targetdiv = '#historical';
  let i = 0;
  let calls = [];
  for (i = 0; i < filteredlasthistoricaldata.length; i++)
  {
    calls.push(CreateCallLayout(filteredlasthistoricaldata[i], i, targetdiv));
    if (filteredlasthistoricaldata.HistoricalCallsByAddress === undefined)
    {
      filteredlasthistoricaldata[i].HistoricalCallsByAddress = null;
    }
  }  
  $(targetdiv).html(calls.join(''));
  document.getElementById('historical').prepend(CreateHistoryCallFilters());
  for (i = 0; i < filteredlasthistoricaldata.length; i++)
  {
    HandleDetailAndHistoryButtons(filteredlasthistoricaldata[i]);
    BuildNotes(filteredlasthistoricaldata[i]);
  }
}

function CreateHistoryRadioFilter(name, value, is_checked)
{
  let r = document.createElement("input");
  r.type = "radio";
  r.id = name + '_' + value;
  r.name = name;
  r.value = value;
  r.checked = is_checked;
  r.style.marginLeft = "1em";
  r.onchange = function ()
  {
    HistoryFilterChange();
  }
  return r;
}

function CreateHistoryLabelFilter(name, value, label)
{
  let l = document.createElement("label");  
  l.htmlFor = name + '_' + value;
  l.textContent = label;
  l.style.marginLeft = ".5em";
  l.style.marginRight = ".5em";
  return l;
}

function LoadCADCalls(listaction, targetdiv)
{
  var $target = $(targetdiv); //the div we're going to be adding to.
  var jqxhr = $.getJSON(listaction)
    .done(function (data)
    {
      if (data.Records.length > 0)
      { 
        var i = 0;
        var calls = [];

        if (targetdiv === '#historical')
        {
          lasthistoricaldata = data;
          ApplyHistoryFilter();
          for (i = 0; i < filteredlasthistoricaldata.length; i++)
          {
            calls.push(CreateCallLayout(filteredlasthistoricaldata[i], i, targetdiv));
            if (filteredlasthistoricaldata.HistoricalCallsByAddress === undefined)
            {
              filteredlasthistoricaldata[i].HistoricalCallsByAddress = null;
            }            
          }
          UpdateHistoricalCallsMap(filteredlasthistoricaldata);
        }
        else
        {
          for (i = 0; i < data.Records.length; i++)
          {
            if (targetdiv === '#advisory')
            {
              calls.push(CreateAdvisoryLayout(data.Records[i]));
            } else
            {
              calls.push(CreateCallLayout(data.Records[i], i, targetdiv));
              data.Records[i].HistoricalCallsByAddress = null;

            }
          }
        }




        $target.html(calls.join(''));
        if (targetdiv === "#historical")
        {
          document.getElementById('historical').prepend(CreateHistoryCallFilters());
        }
        if (targetdiv !== '#advisory')
        {
          for (i = 0; i < data.Records.length; i++)
          {
            HandleDetailAndHistoryButtons(data.Records[i]);
            BuildNotes(data.Records[i]);
          }          
        }
        
      }
      if (targetdiv === '#active')
      {
        lastactivedata = data;
        setTimeout(function () { UpdateActiveCallsMap(data); }, 3000);
      }
      ShowMessage('', targetdiv);
      if (targetdiv === '#active')
      {
        if (data.TotalRecordCount === 0 || data.TotalRecordCount === undefined)
        {  // let's update the tab to show the number of active calls
          $('#li-tab-1').text('Active Calls');
          ShowMessage('No records found.', targetdiv);
        } else
        {
          $('#li-tab-1').text('Active Calls (' + data.TotalRecordCount + ')');
        }
      } else if (targetdiv === '#advisory')
      {
        if (data.TotalRecordCount === 0 || data.TotalRecordCount === undefined)
        {  // let's update the tab to show the number of active calls
          $('#li-tab-4').text('Advisories');
          ShowMessage('No records found.', targetdiv);
        } else
        {
          $('#li-tab-4').text('Advisories (' + data.TotalRecordCount + ')');
        }
      }
    })
    .fail(function (eFailed)
    {
      console.log('loadcaddata failed', eFailed);
      ShowMessage('Error attempting to get a list of calls.  Are you connected to the internet?', targetdiv);
    });
}

function LoadRadioData()
{
  ShowRadioDataMessage("Loading Radio Data...");
  $.getJSON('./CallData/GetRadioLocations')
    .done(function (data)
    {
      if (data === null || data.Records === null || data.Records.length === 0) return;
      currentRadioList = data.Records;
      UpdateRadioLayer(data.Records);      
      document.getElementById("li-tab-7").style.display = "block";
      if (!map || !RadioLayer) return;
      map.addLayer(RadioLayer);      
      CreateRadioTable(data.Records);
    })
    .fail(function ()
    {
      console.log('get radio data failed');
      ShowRadioDataMessage("There was an error loading the radio data.");
    });
}

function LoadUnitControlData()
{
  ShowUnitControlDataMessage("Loading...");
  $.getJSON('./CallData/GetUnitControlData')
    .done(function (data)
    {
      unitControlGroups = [... new Set(data.Records.map(item => item.group_name))];
      unitControlGroups.push('DELETE UNIT');

      PopulateUnitControlDataGroups(document.getElementById("filter_unit_control_groups"));
      if (data === null || data.Records === null || data.Records.length === 0) return;
      currentUnitControlDataList = data.Records;
      document.getElementById("li-tab-9").style.display = "block";
      CreateUnitControlDataTable(data.Records);
      ShowUnitControlDataMessage("Data updated at " + new Date().toLocaleTimeString("en-US") + ".");
    })
    .fail(function ()
    {
      console.log('get unit control data failed');
      ShowUnitControlDataMessage("There was an error loading the unit control data.");
    });
}

function LoadRadioTrackerLink() {
    ShowUnitControlDataMessage("Loading...");
    $.getJSON('./CallData/GetRadioTrackerLink')
        .done(function (data) {
            if (data === null || data.Link === null || data.Link.length === 0) return;
            document.getElementById("li-tab-11").style.display = "block";
        });
}

function SaveUnitControlData(unitdata, td, savebutton)
{
  savebutton.disabled = true;
  savebutton.innerText = "Saving...";
  $.post('./CallData/SaveUnitControlData', unitdata, 'json')
    .done(function (data)
    {
      console.log('Save Unit Control Data return', data);
      savebutton.disabled = false;
      savebutton.innerText = "Saved!";
      window.setTimeout(function (j)
      {
        savebutton.innerText = "Save";
      }, 10000);
    })
    .fail(function ()
    {
      console.log('Failed to save Unit Control Data');
      savebutton.disabled = false;
      savebutton.innerText = "Error Saving";
      alert("There was an error attempting to save your data.  Please try again and contact MIS if this situation persists.");
      window.setTimeout(function (j)
      {
        savebutton.innerText = "Save";
      }, 10000);
    });
}

function GetAccountabilityData()
{
  $.getJSON('./CallData/GetAccountabilityData')
    .done(function (data)
    {
      console.log('accountability data ', data);
      if (data === null || data.Records === null || data.Records.length === 0) return;
      if (data.Records)
      {
        document.getElementById("li-tab-10").style.display = "block";
      }
    })
    .fail(function ()
    {
    });
}

function CreateAndPopulateUnitControlDataSelect(current_value)
{
  let select = document.createElement("select");
  PopulateUnitControlDataGroups(select);
  select.value = current_value;
  return select;
}

function PopulateUnitControlDataGroups(select)
{
  for (let i = 0; i < unitControlGroups.length; i++)
  {
    let o = document.createElement("option");
    o.text = unitControlGroups[i];
    o.value = unitControlGroups[i];
    select.appendChild(o);
  }
}

function CreatePopulateUnitControlCheckbox(checked)
{
  let input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  return input;
}

function ShowUnitControlDataMessage(message)
{
  let e = document.getElementById("unit_control_status");
  if (!e) return;
  e.innerText = message;
}

function CreateUnitControlDataTable(units)
{
  var tbody = document.getElementById("unit_control_list");
  ClearElement(tbody);
  for (var i = 0; i < units.length; i++)
  {
    var unit = units[i];
    tbody.appendChild(CreateUnitControlDataRow(unit));
  }
}

function CreateUnitControlDataRow(unit)
{
  var tr = document.createElement("tr");
  let unitcode_td = CreateRadioTableCell(unit.unitcode);
  unitcode_td.style.textAlign = "left";
  tr.appendChild(unitcode_td);
  let vehicle_td = CreateRadioTableCell(unit.vehicle_id);
  vehicle_td.style.textAlign = "left";
  tr.appendChild(vehicle_td);
  let group_td = CreateRadioTableCell("");
  let show_minicad_td = CreateRadioTableCell("");
  let is_primary_td = CreateRadioTableCell("");
  let select_group = CreateAndPopulateUnitControlDataSelect(unit.group_name);
  group_td.appendChild(select_group); 
  let check_show_minicad = CreatePopulateUnitControlCheckbox(unit.show_in_minicad);
  show_minicad_td.appendChild(check_show_minicad);
  let check_is_primary = CreatePopulateUnitControlCheckbox(unit.is_primary_unit);
  is_primary_td.appendChild(check_is_primary);  
  

  tr.appendChild(group_td);
  tr.appendChild(show_minicad_td);
  tr.appendChild(is_primary_td);
  tr.style.borderBottom = "1px dotted gray";
  let buttonTd = CreateRadioTableCell("");
  let saveButton = document.createElement("button");
  saveButton.onclick = function ()
  {
    // do something here to show it's saved.
    let uc = {
      unitcode: unit.unitcode,
      group_name: select_group.value,
      show_in_minicad: check_show_minicad.checked,
      is_primary_unit: check_is_primary.checked
    }
    SaveUnitControlData(uc, buttonTd, saveButton);
  };
  saveButton.appendChild(document.createTextNode("Save"));
  buttonTd.appendChild(saveButton);
  tr.appendChild(buttonTd);
  return tr;
}

function LoadCallerLocations()
{
  $.getJSON('./CallData/GetCallerLocations')
    .done(function (data)
    {
      if (data === null || data.Records === null || data.Records.length === 0) return;
      callerLocations = data.Records;
      if (!map || !CallerLocationsLayer) return;
      map.addLayer(CallerLocationsLayer);      
      UpdateCallerLocationsLayer(data.Records);
    })
    .fail(function ()
    {
      console.log('get caller lcations data failed');
    });
}

function ShowRadioDataMessage(message)
{
  var tbody = document.getElementById("radioList");
  ClearElement(tbody);
  var tr = document.createElement("tr");
  var td = document.createElement("td");
  td.appendChild(document.createTextNode(message));
  td.colSpan = 4;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function FilterUnitControlUnit(input)
{
  var filter = input.value.toUpperCase();
  if (filter.length > 0)
  {
    var filtered = currentUnitControlDataList.filter(function (j) { return j.unitcode.toUpperCase().indexOf(filter) > -1; });
    CreateUnitControlDataTable(filtered);
  }
  else
  {
    CreateUnitControlDataTable(currentUnitControlDataList);
  }
}

function FilterUnitControlVehicle(input)
{
  var filter = input.value.toUpperCase();
  if (filter.length > 0)
  {
    var filtered = currentUnitControlDataList.filter(function (j) { return j.vehicle_id.toUpperCase().indexOf(filter) > -1; });
    CreateUnitControlDataTable(filtered);
  }
  else
  {
    CreateUnitControlDataTable(currentUnitControlDataList);
  }
}

function FilterUnitControlGroup(select)
{
  var filter = select.value.toUpperCase();
  if (filter !== "-1")
  {
    var filtered = currentUnitControlDataList.filter(function (j) { return j.group_name.toUpperCase().indexOf(filter) > -1; });
    CreateUnitControlDataTable(filtered);
  }
  else
  {
    CreateUnitControlDataTable(currentUnitControlDataList);
  }
}

function CreateRadioTable(radios)
{
  var tbody = document.getElementById("radioList");
  ClearElement(tbody);
  for (var i = 0; i < radios.length; i++)
  {
    var radio = radios[i];
    tbody.appendChild(CreateRadioRow(radio));
  }
}

function FilterRadioName(input)
{
  var filter = input.value.toUpperCase();  
  if (filter.length > 0)
  {
    var filtered = currentRadioList.filter(function (j) { return j.device_alias.toUpperCase().indexOf(filter) > -1; });
    CreateRadioTable(filtered);
  }
  else
  {
    CreateRadioTable(currentRadioList);
  }
}

function FilterRadioId(input)
{
  var filter = input.value.toUpperCase();
  if (filter.length > 0)
  {
    var filtered = currentRadioList.filter(function (j) { return j.device_id.toString().toUpperCase().indexOf(filter) > -1; });
    CreateRadioTable(filtered);
  }
  else
  {
    CreateRadioTable(currentRadioList);
  }
}

function ToggleRadioLayer()
{
  if (!RadioLayer.visible)
  {
    RadioLayer.show();
  }
  else
  {
    RadioLayer.hide();
  }
}

function CreateRadioRow(radio)
{
  var tr = document.createElement("tr");
  tr.appendChild(CreateRadioTableCell(radio.device_alias));
  tr.appendChild(CreateRadioTableCell(radio.device_id.toString()));
  tr.appendChild(CreateRadioTableCell(radio.timestamp_formatted));  
  tr.style.borderBottom = "1px dotted gray";
  let buttonTd = document.createElement("td");
  let mapButton = document.createElement("button");
  mapButton.onclick = function ()
  {
    // do something here with the lat/long
    ShowOnMap(radio.latitude, radio.longitude);
    if (!RadioLayer.visible) RadioLayer.show();
  };
  mapButton.appendChild(document.createTextNode("View on Map"));
  buttonTd.appendChild(mapButton);
  buttonTd.style.paddingTop = ".25em";
  buttonTd.style.paddingBottom = ".25em";
  tr.appendChild(buttonTd);
  return tr;
}

function CreateRadioTableCell(value)
{
  var td = document.createElement("td");
  td.style.paddingTop = ".25em";
  td.style.paddingBottom = ".25em";
  td.style.textAlign = "center";
  td.style.verticalAlign = "middle";
  td.appendChild(document.createTextNode(value));
  return td;
}

function ShowMessage(Message, targetdiv) {
    var t = (Message.length > 0); //If we're passing a message, we want to show the target div.  If not, we want to hide it.
    var $div = $(targetdiv);
    var $target = $(targetdiv + '_messages');
    if (!$target.length) {
        $div.prepend("<div style='padding: 1em; 1em; 1em 1em; font-size: 1.2em; font-weight: bolder;' id='" + targetdiv.replace("#", "") + "_messages'></div>");
        $target = $(targetdiv + '_messages');
    }
    $target.text(Message).toggle(t);    
}

function CreateAdvisoryLayout(data) {
    var x = ['<ol class="advisory">'];
    x.push(lidata('', 'advisorytitle', 'Title', data.Title));
    x.push(lidata('', 'advisorylocation', 'Location', data.Location));
    x.push(lidata('', 'advisorytitle', 'Date added:', data.ShortDateAdded));
    x.push(lidata('', 'advisorytitle', 'Expiration:', data.ShortExpirationDate));
    x.push(lidata('', 'advisorynotes', 'Notes', data.Notes.toProperCase()));
    x.push('</ol>');
    return x.join('');
}

function ClearElement(node)
{
  if (node === null || node === undefined) return;
  while (node.firstChild)
  {
    node.removeChild(node.firstChild);
  }
}

function CreateCallLayout(data, i, target) {
  var x = $([
      "<div id='" + data.IncidentID + "' class='Call'>",
      "<ol class='CADData"
  ]);
  //'>"
  if (callOptions.whitespace === "normal")
  {
    x.push("'>");
  }
  else
  {
    x.push(" compact'>");
  }
  // Add Mini Buttons  
  x.push("<span class='minibuttons ");
  if (callOptions.call_buttons_display !== 'mini') x.push("hide");
  x.push("'>")
  x.push("<span class='minidetailbutton' id='mini-calldetail-" + data.IncidentID + "'>D</span>");
  x.push("<span class='minihistorybutton' id='mini-calladdresshistory-" + data.IncidentID + "' title='This will show up to the last 30 calls to this address. If a lightbulb is showing, it means we have been to this address in the last 30 days.'>");
  if (data.HasRecentVisit && target !== '#historical')
  {
    x.push("<img style='height: 1.1em; width: 1.1em; margin-left: 0;' src='//static.arcgis.com/images/Symbols/PeoplePlaces/Light.png' class='recentvisit' />");
  }
  else
  {
    x.push("H");
  }
  x.push("</span>");
  //x.push("<span class='minimapbutton' onclick='ShowOnMap(&quot;" + data.Latitude + "&quot;, &quot;" + data.Longitude + "&quot;)'>M</span>");
  x.push("<span class='minimapbutton' onclick='ShowOnMap(0, 0))'>M</span>");
  x.push("</span>");
  x.push(lidata('', 'age', 'Age of Call', data.Age));
  x.push(lidata('', 'calltime', 'Calltime', data.FormattedCallTime));
  x.push(lidata('', 'district', 'District', data.District));
  x.push(lidata('', 'nature', 'Nature', data.NatureCode));
  x.push(lidataUrl('', 'street', 'Street', data.Location, data.MapURL));
  if (data.CrossStreet.length > 0) {
    x.push(lidata('', 'crossstreet', 'CrossStreet', data.CrossStreet));
  }
  if (data.BusinessName.length > 0) {
    x.push(lidata('', 'business', 'Business', data.BusinessName));
  }
  if (data.CCFR.length > 0)
  {
    x.push(lidata('', 'ccfr', 'CCFR', data.CCFR));
  }
  if (target === "#active") x.push(lidata('', 'staffdispatched', 'Staff Dispatched / Enroute', countManpower(data, ['Dispatched', 'En-Route'])));
  if (target === "#active") x.push(lidata('', 'staffarrived', 'Staff Arrived', countManpower(data, ['Arrived'])));
  if (data.CallLocationUSNG.length > 0)
  {
    if (!callOptions.show_usng)
    {
      x.push(lidata('', 'usng hide', 'USNG', data.CallLocationUSNG));
    }
    else
    {
      x.push(lidata('', 'usng', 'USNG', data.CallLocationUSNG));
    }
    
  }
  if (data.CallerLocationUSNG.length > 0)
  {
    if (!callOptions.show_caller_usng)
    {
      x.push(lidata('', 'callerusng hide', 'Caller Location', data.CallerLocationUSNG));
    }
    else
    {
      x.push(lidata('', 'callerusng', 'Caller Location', data.CallerLocationUSNG));
    }
    
    x.push(lidata('', 'callerlocationage', 'Caller Location Age', data.CallerLocationAge));
    x.push(lidata('', 'callerlocationconfidence', 'Caller Location Confidence', data.CallerLocationConfidence));
  }

  x.push("</ol>");
  x.push("<ol class='notes ");
  if (callOptions.default_notes_layout === "compact")
  {
    x.push("short");
  }
  else
  {
    x.push("long");
  }
  x.push("' id='active_notes-" + data.IncidentID + "' ");
  x.push("onclick='ToggleNotes(\"" + data.IncidentID + "\", \"active\")'>");
  //x.push("    <li class='notes'><a href='javascript:ToggleNotes();'>");
  //x.push(data.Notes.toProperCase().replace(/\[/g, "<span class='linesep'></span><span class='dispatch'>[").replace(/(?:\r\n|\r|\n)/g, "</span>"));
  //x.push("    </a></li>");
  x.push("</ol>");
  x.push("<ol class='unitlist'>");
  var units = data.Units;
  for (var j = 0; j < units.length; j++) {
    //x.push("<li class='" + units[j].UnitStatus);
    //if (target === '#active') {
    //    //var unit = '"' + units[j].UnitName + '"';
    //    x.push("' onclick='ClickUnitStatus(event)' onmouseover='HoverUnitStatus(event);' onmouseout='HideUnitStatusHover();");// 
    //} 
    //x.push("'>" + units[j].UnitName + "</li>");

    var item = units[j];
    x.push("<li class='");
    x.push(unitStatusClass(item));
    x.push("' onclick='ClickUnitStatus(event, \"" + item.UnitName + "\")' onmouseover='HoverUnitStatus(event, \"" + item.UnitName + "\");' onmouseout='HideUnitStatusHover();'>"); //e.currentTarget.innerHTML // 
    x.push(item.UnitName);
    x.push("<img src='");
    x.push(item.LocationStatus);
    x.push("' class='");
    if (item.LocationStatus.length === 0) {
      x.push("imghide");
    }
    x.push("' />");
    x.push("</li>");

  }
  x.push("</ol>");
  x.push("<ol class='CADDatabuttons ");
  if (callOptions.call_buttons_display === 'mini') x.push("hide");  
  x.push("'>");
  x.push("   <li class='detailbutton'><a id='calldetail-" + data.IncidentID + "'>Details</a></li>");
  x.push("   <li class='historybutton' title='This will show up to the last 30 calls to this address. If a lightbulb is showing, it means we have been to this address in the last 30 days.'><div class='historyhelper'><a id='calladdresshistory-" + data.IncidentID + "'>History</a>");
  if (data.HasRecentVisit && target !== '#historical')
  {
    x.push("<img src='//static.arcgis.com/images/Symbols/PeoplePlaces/Light.png' class='recentvisit' />");
  }
  x.push("</div></li>");
  //x.push("   <li class='detailbutton'><a href='javascript:ToggleDetail(&quot;" + data.IncidentID + "&quot;, &quot;" + i + "&quot;, &quot;" + target + "&quot;);'>Detail</a></li>");
  //x.push("   <li class='historybutton'><a href='javascript:ToggleHistoryByAddress(&quot;" + data.IncidentID + "&quot;, &quot;" + i + "&quot;, &quot;" + target + "&quot;);'>History</a></li>");
  //x.push("   <li class='mapbutton' id='map-" + data.IncidentID + "'><a title='Clicking this will try to bring up Google Maps for this address.' href='https://maps.google.com/maps?saddr=&z=19&maptype=satellite&daddr=" + data.MapURL + "' target='_Blank'>Map</a></li>");
  x.push("   <li class='mapbutton'><a href='javascript:ShowOnMap(&quot;" + data.Latitude + "&quot;, &quot;" + data.Longitude + "&quot;);'>Map</a></li>");
  x.push("</ol>");
  x.push("<ol class='calldetailbase' style='display: none;' id='detaillist-" + data.IncidentID + "'>");
  x.push("</ol>");
  x.push("<ol class='historybyaddressbase' style='display: none;' id='historylist-" + data.IncidentID + "'>");
  x.push("</ol>");
  x.push("</div>"); // close off this call.
  return Array.prototype.join.call(x, "");
}

function countManpower(c, status) {
  // this function will count the manpower at a call
  var m = 0;
  if (c.Units === undefined) return m;
  //console.log('status', status);
  for (var i = 0; i < c.Units.length; i++) {
    if (status.indexOf(c.Units[i].UnitStatus) > -1 || status === undefined) {
    //if (c.Units[i].UnitStatus == status || status == undefined) {
      m += countUnitManpower(c.Units[i]);
    }    
  }
  return m;
}

function countUnitManpower(u) {
  // this function will count the manpower at a call
  if (u.Staff !== null && u.Staff !== undefined) {
    return u.Staff.length;
  }  
  return 0;
}

function getVehicleSwaps(ul) {
  vehicleSwaps = [];
  for (var i = 0; i < ul.length; i++)
  {
    if (ul[i].Location.indexOf("USING") > -1)
    {
      var x = {
        main_unit: ul[i].Location.replace("USING", "").trim(),
        spare_unit: ul[i].UnitName.trim(),
        is_same_unittype: function ()
        {
          return true;
          //if (this.main_unit.length === 0 || this.spare_unit.length === 0) return true;
          //return (this.main_unit.substring(0, 1) === this.spare_unit.replace("V", "").substring(0, 1));
        }
      };
      vehicleSwaps.push(x);
    }
  }
}

function getUnitIndex(unitName) {
    var i = 0;
    for (i = 0; i < lastunitdata.Records.length; i++) {
        if (lastunitdata.Records[i].UnitName === unitName) {
            return i;
        }
    }
    return -1;
}

function getCallerLocationIndex(location_id)
{
  for (var i = 0; i < callerLocations.length; i++)
  {
    if (callerLocations[i].location_id === location_id) return i;
  }
  return -1;
}

function getCallIndex(incidentId, data) {
    var i = 0;
    for (i = 0; i < data.Records.length; i++) {
        if (data.Records[i].IncidentID === incidentId) {
            return i;
        }
    }
    return -1;
}

function timeStamp(d)
{
  // Create a date object with the current time

  var now = new Date();
  if (d !== undefined)
  {
    now = new Date(parseInt(d.replace('/Date(', '')));
  }

  // Create an array with the current month, day and time
  var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

  // Create an array with the current hour, minute and second
  var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

  // Determine AM or PM suffix based on the hour
  var suffix = (time[0] < 12) ? "AM" : "PM";

  // Convert hour from military time
  time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

  // If hour is 0, set it to 12
  time[0] = time[0] || 12;

  // If seconds and minutes are less than 10, add a zero
  for (var i = 1; i < 3; i++)
  {
    if (time[i] < 10)
    {
      time[i] = "0" + time[i];
    }
  }

  // Return the formatted string
  return date.join("/") + " " + time.join(":") + " " + suffix;
}
