/*global lastactivedata, currentactivedata, lasthistoricaldata, lastunitdata, currentunit, map*/
/* exported **/

var vehicleSwaps = [];
var currentRadioList = [];
var extraMapPoints = [];
var callerLocations = [];

function ShowOnMap(lat, long) {
    if (lat == '0') {
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
    if (currentlong == -81.80 && currentlat == 29.950)
    {
      map.centerAndZoom(p, 11);
    } else
    {
      map.centerAndZoom(p, 16);
    }
    currentlat = null;
    if (mapload !== undefined)
    {
      mapload.remove();
    }
  });
}


function tabClick(tab) {
    require(["dojo/dom"], function () {
        currenttab = tab;
        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');
        $('#li-' + tab).addClass('current');
        $("#" + tab).addClass('current');
        var tText = document.getElementById('li-' + tab).innerHTML;
        if (tText === 'Map') {
            if (map === null) {
                mapInit();
            }
            if ($(window).width() > 999) {
                $("#" + tab).width('99%');
                $("#mapWindow").width('99%');
            } else {
                $(".maptab").attr("style", "");
                $("#mapWindow").css("width", "");
            }
            dijit.byId("mapWindow").resize();
            map.resize(true);
            map.reposition();

        } else {
            if ($(window).width() > 999) {
                $(".maptab").attr("style", "");
                $("#mapWindow").css("width", "");
                dijit.byId("mapWindow").resize();
                map.resize(true);
                map.reposition();
            }
        }
    });
}
//function tabClick(tab) {
//    tabClick(tab, 0, 0)
//}
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
      addGroups('#OpsGroupsList', 'Ops');
      addGroups('#EventGroupsList', 'Events');
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
        if (currentUnit.length)
        {
          //currentUnit.attr('class', item.UnitStatus).attr("onclick", "ClickUnitStatus(event)"); //, '" + item.UnitName + "'
          currentUnit.attr('class', unitStatusClass(item)).attr("onclick", "ClickUnitStatus(event, '" + item.UnitName + "')"); //, '" + item.UnitName + "'
          var $tmp = $('#img-' + item.UnitName);
          if ($tmp.length)
          {
            if (item.LocationStatus.length === 0)
            {
              $tmp.attr('class', 'imghide');
            }
            $tmp.attr("src", item.LocationStatus); //, '" + item.UnitName + "'
          }
        }

      }
      lastunitdata = data;
      UpdateUnits();
    });
}

//function HoverUnitStatus(e) {
//  //going to change this to show unit
//  console.log('hoverunitstatus e', e);
//  if (currentunit === e.currentTarget.innerHTML) {
//    HideUnitStatusHover();
//  } else {
//    HoverUnitStatus(e);
//  }
//}

function ClickUnitStatus(e, currentunit) {
    //currentunit = e.currentTarget.innerHTML.split('<')[0]; // Because we're inserting an img tag into the html, we can negate it by doing this.
    var i = getUnitIndex(currentunit);
    var item = lastunitdata.Records[i];
    if (item.Latitude !== 0) {
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

function buildUnitDisplay(item, classToUse) {
  //if (item.UnitStatus.indexOf('Available') !== -1) console.log('unit', item);
  var x = [];
  x.push("<ol class='");
  x.push(classToUse);
  x.push("'><li class='" + item.UnitStatus + "'>" + item.UnitStatus + "</li>");  
  if (item.Location.length > 0) {
    x.push("<li>" + item.Location + "</li>");
  }
  x.push("<li>Station Assigned: " + item.District + "</li>");
  if (item.District !== item.HomeStation) {
    x.push("<li>Home Station: " + item.HomeStation + "</li>");
  }

  if (item.Staff.length > 0) {
    for (var j = 0; j < item.Staff.length; j++) {
      x.push("<li>" + item.Staff[j] + "</li>");
    }
  } else {
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
  var tmp = unitStatusClass(item);
  if (tmp !== item.UnitStatus) {
    var explain = unitStatusClassExplain(item);
    //console.log('explain', explain);    
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

//function UnitClick() {
//    $('ul.tabs li').removeClass('current');
//    $('.tab-content').removeClass('current');
//    $('#li-tab-1').addClass('current');
//    $('#tab-1').addClass('current');
//}

function LoadAdvisoryTable() {
    LoadCADCalls('./CallData/GetAdvisories', '#advisory');
}

function GetHistoricalCallDetail(inciid, n) {
    var jqxhr = $.getJSON("./CallData/GetCallDetail/" + inciid)
    .done(function (data) {
        lasthistoricaldata.Records[n].CallDetails = data.Records;
        ToggleDetail(inciid, n, '#historical');        
    })
    .fail(function () {
        return [];
    });
}

function GetHistoricalCallHistory(inciid, n) {
    var jqxhr = $.getJSON("./CallData/GetHistoricalCallHistory/" + inciid)
    .done(function (data) {
        lasthistoricaldata.Records[n].HistoricalCallsByAddress = data.Records;
        ToggleHistoryByAddress(inciid, n, '#historical');
    })
    .fail(function () {
        return [];
    });
}

function ToggleDetail(inciid, n, target) {
    var $detail = $('#detaillist-' + inciid);
    var $detailbool = ($detail.html().length === 0);
    if ($detailbool) {
        var cd;
        if (target === '#active') {
            // we're going to try and close the history if it's open, but we only want to do this if we're looking at the active calls.
            closeIfOpen('h', inciid);
            cd = lastactivedata.Records[n].CallDetails;
        } else if (target === '#historical') {
            if (lasthistoricaldata.Records[n].CallDetails === null || lasthistoricaldata.Records[n].CallDetails.length === 0) {
                GetHistoricalCallDetail(inciid, n);
                return;
            }
            cd = lasthistoricaldata.Records[n].CallDetails;
        }
        var x = ['<li class="detailheader"><span>Detail for Incident Id: ' + inciid + '</span></li>'];

        if (cd && cd.length > 0) {        
            for (var i = 0; i < cd.length; i++) {
                x.push(BuildDetailRow(cd[i]));
            }
        } else {// If there are no call details
            x.push("<li>No call details found!</li>");
        }
        $detail.html(x.join(''));
    } else {
        $detail.html('');
    }    
    $detail.toggle($detailbool);
}

function closeIfOpen(target, inciid) { // This function will close and hide the target if it's open. 
    if (target === 'd') { //detail
        var $detail = $('#detaillist-' + inciid);
        $detail.html('').toggle(false);

    } else if (target === 'h') { //history
        var $history = $('#historylist-' + inciid);
        $history.html('').toggle(false);
    }
}

function BuildDetailRow(detail) {
    var xx = [];
    xx.push('    <li class="detailrow"><ol class="calldetail">');
    xx.push(lidata('', 'userid', 'UserID', detail.UserID));
    xx.push(lidata('', 'desc', 'Desc', detail.Description));
    xx.push(lidata('', 'timestamp', 'Date', detail.FormattedTimestamp));
    xx.push(lidata('', 'usertyped', 'User Typed', detail.UserTyped));
    xx.push(lidata('', 'comments', 'Comments', detail.Comments));
    xx.push("</ol></li>");
    return xx.join('');
}

function lidata(idtouse, classtouse, labeltouse, data) {
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

function ToggleHistoryByAddress(inciid, n, target) {
    var $hx = $('#historylist-' + inciid);
    var $hxbool = ($hx.html().length === 0);
    if ($hxbool) {
        closeIfOpen('d', inciid);
        var data = lastactivedata;
        if (target === '#historical') {
            data = lasthistoricaldata;
            if (lasthistoricaldata.Records[n].HistoricalCallsByAddress === null || lasthistoricaldata.Records[n].HistoricalCallsByAddress === undefined) {
                GetHistoricalCallHistory(inciid, n);
                return;
            }
        }
        var h = data.Records[n].HistoricalCallsByAddress;
        var x = [];
        if (h && h.length > 0) {
            for (var i = 0; i < h.length; i++) {
                x.push('    <li class="historyrow">');
                x.push('        <ol class="CADData">');
                x.push(lidata('', 'historynature', 'Nature Code', h[i].NatureCode));
                x.push(lidata('', 'historyage', 'Calltime', h[i].LongCallTime));
                x.push('        </ol>');
                x.push('        <ol class="historynotes">');
                x.push("            <li class='historynotes'><a href='javascript:ToggleNotes();'>");
                x.push(h[i].Notes.toProperCase().replace(/\[/g, "<span class='linesep'></span><span class='dispatch'>[").replace(/(?:\r\n|\r|\n)/g, "</span>"));
                x.push("            </a></li>");
                x.push('        </ol>');
                x.push('    </li>');            }
            
        } else {// If there are no call details
            x.push("<li>No previous calls to this street address.</li>");
        }
        $hx.html(x.join(''));
    } else {
        $hx.html('');
    }
    $hx.toggle($hxbool);
}

function ToggleNotes() {
    $('.dispatch, .linesep').toggle();
    $('.linesep:nth-last-child(1), .linesep:nth-last-child(2)').css('display', 'none');
}

function UpdateActiveCallsTable() {
    var jqxhr = $.getJSON('./CallData/GetActiveCalls')
    .done(function (data) {
        currentactivedata = data;
        if (data.Records.length > 0) {
            var $active = $('#active');
            for (var i = data.Records.length - 1; i >= 0; i--) {
                UpdateActiveCall(data.Records[i], $active, i);
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
  if ($call.length) {
    $call.find('.CADDatabuttons .detailbutton a').attr('href', 'javascript:ToggleDetail("' + record.IncidentID + '","' + index + '", "' + target.selector + '")');
    $call.find('.CADDatabuttons .historybutton a').attr('href', 'javascript:ToggleHistoryByAddress("' + record.IncidentID + '","' + index + '", "#active")');
    //$call.find('.CADDatabuttons .mapbutton a').attr('href', 'https://maps.google.com/maps?saddr=&z=20&maptype=satellite&daddr=' +  record.MapURL);
    $call.find('.CADDatabuttons .mapbutton a').attr('href', 'javascript:ShowOnMap("' + record.Latitude + '","' + record.Longitude + '")');
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
    var detail = $('#detaillist-' + record.IncidentID);
    if (detail.html().length > 0) { // This returns true if the detail is currently shown.
      // we update the details pretty simply.  We compare the last data's total record count for this 
      var oldid = getCallIndex(record.IncidentID, lastactivedata);
      if (oldid > -1) {
        

        var oldcount = lastactivedata.Records[oldid].CallDetails.length;
        var newcount = record.CallDetails.length;
        if (newcount > oldcount) {
          var x = [];
          // the difference in these two will be the records we prepend to detail
          for (i = 0; i < newcount - oldcount; i++) {
            x.push(BuildDetailRow(record.CallDetails[i]));
          }
          detail.prepend(x.join(''));
        }
      }
    }
  } else {
    target.prepend(CreateCallLayout(record, index, '#active'));
    BuildNotes(record);
  }
}

function BuildNotes(record)
{
  console.log('BuildNotes record', record);  
}

function HandleClosedCalls(data) {
    // here we're going to compare the incidentIDs in lastactivedata versus data, if one is in lastactivedata but not in data, we're going to remove it
    //var $active = $('#active');
    for (var i = 0; i < lastactivedata.Records.length; i++) {
        var x = getCallIndex(lastactivedata.Records[i].IncidentID, data);
        if (x === -1) {            
            $('#' + lastactivedata.Records[i].IncidentID).remove();
        }
    }
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
        for (i = 0; i < data.Records.length; i++)
        {
          if (targetdiv === '#advisory')
          {
            calls.push(CreateAdvisoryLayout(data.Records[i]));
          } else
          {
            calls.push(CreateCallLayout(data.Records[i], i, targetdiv));
            if (targetdiv === '#historical')
            {
              data.Records[i].HistoricalCallsByAddress = null;
            }
          }
        }
        $target.html(calls.join(''));
        if (targetdiv !== '#advisory' && targetdiv !== '#historical')
        {
          for (i = 0; i < data.Records.length; i++)
          {
            BuildNotes(data.Records[i]);
          }          
        }
        
      }
      if (targetdiv === '#active')
      {
        lastactivedata = data;
        setTimeout(function () { UpdateActiveCallsMap(data); }, 3000);
      } else if (targetdiv === '#historical')
      {
        lasthistoricaldata = data;
        UpdateHistoricalCallsMap(data);
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
    .fail(function ()
    {
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

      CreateRadioTable(data.Records);
    })
    .fail(function ()
    {
      console.log('get radio data failed');
      ShowRadioDataMessage("There was an error loading the radio data.");
    });
}

//function LoadExtraMapPoints()
//{
//  var symbols = ['http://static.arcgis.com/images/Symbols/Basic/LightBlueStickpin.png', 'http://static.arcgis.com/images/Symbols/Basic/OrangeBeacon.png', 'http://static.arcgis.com/images/Symbols/Basic/RedStickpin.png', 'http://static.arcgis.com/images/Symbols/Basic/BlackStickpin.png'];
//  $.getJSON('./CallData/GetExtraMapPoints')
//    .done(function (data)
//    {
//      if (data === null || data.Records === null || data.Records.length === 0) return;
//      extraMapPoints = data.Records;
//      console.log('extra map points', extraMapPoints);
//      CalculatePoints();
//      UpdateExtraMapPointsLayer(data.Records, symbols);      

      
//    })
//    .fail(function ()
//    {
//      console.log('get extra map points data failed');      
//    });
//}

function LoadCallerLocations()
{
  
  $.getJSON('./CallData/GetCallerLocations')
    .done(function (data)
    {
      if (data === null || data.Records === null || data.Records.length === 0) return;
      callerLocations = data.Records;
      console.log('caller locations', callerLocations);
      UpdateCallerLocationsLayer(data.Records);
    })
    .fail(function ()
    {
      console.log('get caller lcations data failed');
    });
}


//function CalculatePoints()
//{
//  require(["esri/geometry/Point", "esri/SpatialReference", "esri/geometry/webMercatorUtils"],
//    function (Point, SpatialReference, webMercatorUtils)
//    {
//      for (var i = 0; i < extraMapPoints.length; i++)
//      {
//        let point = extraMapPoints[i];
//        point.base_point = null;
//        point.final_point = null;
//        point.visible_on_map = false;
//        var longitude = point.longitude;
//        var latitude = point.latitude;
//        if (longitude !== 0 && latitude !== 0)
//        {
//          point.base_point = new Point(longitude, latitude, new SpatialReference({ wkid: 4326 }));
//          point.final_point = webMercatorUtils.geographicToWebMercator(point.base_point);
//        }
//      }
//    });
//}



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
  td.appendChild(document.createTextNode(value));
  return td;
}

function ShowMessage(Message, targetdiv) {
    var t = (Message.length > 0); //If we're passing a message, we want to show the target div.  If not, we want to hide it.
    var $div = $(targetdiv);
    var $target = $(targetdiv + '_messages');
    if (!$target.length) {
        $div.prepend("<div id='" + targetdiv.replace("#", "") + "_messages'></div>");
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
      "<ol class='CADData'>"
  ]);
  x.push(lidata('', 'age', 'Age of Call', data.Age));
  x.push(lidata('', 'calltime', 'Calltime', data.FormattedCallTime));
  x.push(lidata('', 'district', 'District', data.District));
  x.push(lidata('', 'nature', 'Nature Code', data.NatureCode));
  x.push(lidataUrl('', 'street', 'Street', data.Location, data.MapURL));
  if (data.CrossStreet.length > 0) {
    x.push(lidata('', 'crossstreet', 'CrossStreet', data.CrossStreet));
  }
  if (data.BusinessName.length > 0) {
    x.push(lidata('', 'business', 'Business', data.BusinessName));
  }
  if (data.CallLocationUSNG.length > 0) {
    x.push(lidata('', 'usng', 'USNG', data.CallLocationUSNG));
  }
  if (data.CallerLocationUSNG.length > 0) {
    x.push(lidata('', 'callerusng', 'Caller Location', data.CallerLocationUSNG));
    x.push(lidata('', 'callerlocationage', 'Caller Location Age', data.CallerLocationAge));
    x.push(lidata('', 'callerlocationconfidence', 'Caller Location Confidence', data.CallerLocationConfidence));
  }
  if (data.CCFR.length > 0) {
    x.push(lidata('', 'ccfr', 'CCFR', data.CCFR));
  }
  if (target === "#active") x.push(lidata('', 'staffdispatched', 'Staff Dispatched / Enroute', countManpower(data, ['Dispatched', 'En-Route'])));
  if (target === "#active") x.push(lidata('', 'staffarrived', 'Staff Arrived', countManpower(data, ['Arrived'])));
  x.push("</ol>");
  x.push("<ol id='active_notes_short-" + data.IncidentID + "' onclick='ShowLongNotes('" + data.IncidentID + "')'>");
  //x.push("    <li class='notes'><a href='javascript:ToggleNotes();'>");
  //x.push(data.Notes.toProperCase().replace(/\[/g, "<span class='linesep'></span><span class='dispatch'>[").replace(/(?:\r\n|\r|\n)/g, "</span>"));
  //x.push("    </a></li>");
  x.push("</ol>");
  x.push("<ol id='active_notes_long-" + data.IncidentID + "' onclick='ShowShortNotes('" + data.IncidentID + "')'>");
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
  x.push("<ol class='CADDatabuttons'>");
  x.push("   <li class='detailbutton'><a href='javascript:ToggleDetail(&quot;" + data.IncidentID + "&quot;, &quot;" + i + "&quot;, &quot;" + target + "&quot;);'>Detail</a></li>");
  x.push("   <li class='historybutton'><a href='javascript:ToggleHistoryByAddress(&quot;" + data.IncidentID + "&quot;, &quot;" + i + "&quot;, &quot;" + target + "&quot;);'>History</a></li>");
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
  for (var i = 0; i < ul.length; i++) {
    if (ul[i].Location.indexOf("USING") > -1) {
      var x = {
        main_unit: ul[i].Location.replace("USING", "").trim(),
        spare_unit: ul[i].UnitName.trim(),
        is_same_unittype: function () {
          if (this.main_unit.length === 0 || this.spare_unit.length === 0) return true;
          return (this.main_unit.substring(0, 1) === this.spare_unit.replace("V", "").substring(0, 1));
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
    //console.log(d);
    now = new Date(parseInt(d.replace('/Date(', '')));
    //console.log(now);
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

function calculate_distance(compare_point, extra_map_points)
{
  if (this[compare_lookup_key] !== undefined) return this[compare_lookup_key];

  let mylocation = this;
  return require(["esri/geometry/Point", "esri/SpatialReference", "esri/geometry/webMercatorUtils"],
    function (Point, SpatialReference, webMercatorUtils)
    {
      var pt1 = new Point(mylocation.my_point.Longitude, mylocation.my_point.Latitude, new SpatialReference({ wkid: 4326 }));
      var pt2 = new Point(compare_point.Longitude, compare_point.Latitude, new SpatialReference({ wkid: 4326 }));
      var pt1_web = webMercatorUtils.geographicToWebMercator(pt1);
      var pt2_web = webMercatorUtils.geographicToWebMercator(pt2);
      let distance = esri.geometry.getLength(pt1_web, pt2_web);
      mylocation[compare_lookup_key] = distance;
      mylocation.lookup_keys.push(compare_lookup_key);
      mylocation.UpdateLocationDistances(compare_lookup_key, distance);
      return distance;
    });
}