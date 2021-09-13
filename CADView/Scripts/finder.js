function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(trackingSuccess, trackingError, { maximumAge: 10000, timeout: 10000, enableHighAccuracy: true });
    } else {
        trackingMessage("Geolocation is not supported by this browser.");
        stopTracking();
    }
}
function trackingSuccess(position) {
  trackingMessage("Tracking updated - " + timeStamp());
  var td = new Tracking_Data();
  td.Latitude = position.coords.latitude;
  td.Longitude = position.coords.longitude;
  td.Accuracy = position.coords.accuracy;
  if (isNaN(position.coords.altitude) || position.coords.altitude === null) {
    td.Altitude = 0;
  } else {
    td.Altitude = position.coords.altitude;
  }
  if (isNaN(position.coords.AltitudeAccuracy) || position.coords.altitudeAccuracy === null) {
    td.AltitudeAccuracy = 0;
  } else {
    td.AltitudeAccuracy = position.coords.altitudeAccuracy;
  }
  if (isNaN(position.coords.Heading) || position.coords.heading === null) {
    td.Heading = 0;
  } else {
    td.Heading = position.coords.heading;
  }
  if (isNaN(position.coords.Speed) || position.coords.speed === null) {
    td.Speed = 0;
  } else {
    td.Speed = position.coords.speed;
  }
  td.GroupName = document.getElementById('selectedGroup').innerHTML;
  td.UserID = document.getElementById('selectedUser').innerHTML;
  //console.log(td);
  trackingData.push(td);
  updateRawTrackingData(td);
}

function updateRawTrackingData(td) {
  if (rawTrackingData.length > 10) {
    rawTrackingData.shift();
  }
  rawTrackingData.push(td);
}

function trackingError(error) {
    trackingMessage('Error recieving GPS information.');
}
function startTracking() {
    console.log('starting tracking');
    updateTrackingStatus('ON');
    //captureTrackingData();
    iTrackingCapture = setInterval(captureTrackingData, 15000);
    iSaveTracking = setInterval(saveTrackingData, 10000);
}
function updateTrackingStatus(status) {
    document.getElementById('li-tab-5').innerHTML = 'Tracking(' + status + ')';
    document.getElementById('trackingOn').innerHTML = status;
}
function stopTracking() {
  updateTrackingStatus('OFF');
  clearInterval(iTrackingCapture);
  clearInterval(iSaveTracking);
  trackingMessage('Tracking stopped.');
  rawTrackingData = [];
}
function captureTrackingData() { // This function adds the Tracking_Data object created every 15 seconds to the trackingData array
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(trackingSuccess, trackingError, { maximumAge: 10000, timeout: 10000, enableHighAccuracy: true });
    } else {
        trackingMessage("Geolocation is not supported by this browser.");
        stopTracking();
    }
}
function saveTrackingData() {
    //console.log(trackingData);
    if (trackingData.length > 4) {
        var tdMany = [];
        for (var i = 0; i < 5; i++) {
            tdMany.push(trackingData.pop());
        }
        saveMany(tdMany);
    } //else if (trackingData.length > 0) {
        //var td = trackingData.pop();
        //saveOne(td);
    //}
}
function saveOne(dataToSave) {
  $.ajax({
    contentType: "application/json",
    url: './CallData/SavePosition',
    data: dataToSave,
    type: 'POST',
    success: function () {
      trackingMessage('Record saved.');
    },
    error: function () {
      trackingData.push(dataToSave); // put the data back into the array
      trackingMessage('Error attempting to save.  Do you still have internet access?');
    },
  });
}
function saveMany(tdl) {
    //console.log('Logging saveMany');
    //console.log(tdl);
    //console.log('Logging tdl stringify');
    //console.log(JSON.stringify(tdl));
    $.ajax({
        //dataType: "application/json",
        contentType: "application/json",
        url: './CallData/SavePositionList',
        data: JSON.stringify(tdl),
        type: 'POST',
        success: function () {
            trackingMessage('Record saved.');
        },
        error: function () {
            trackingData.extend(tdl); // put the data back into the array
            trackingMessage('Error attempting to save.  Do you still have internet access?');
        },
    });
}
var tmp = document.getElementById("txtuserid");
tmp.addEventListener("keydown", function (e) {
    if (e.keyCode === 13) {  //checks whether the pressed key is "Enter"
        saveUserID();
    }
});
function Tracking_Data() {
    this.Latitude = 0;
    this.Longitude = 0;
    this.Altitude = 0;
    this.Accuracy = 0;
    this.AltitudeAccuracy = 0;
    this.Heading = 0;
    this.Speed = 0;
    this.GroupName = '';
    this.UserID = '';
    this.User_Date = new Date(); //new DateTime().formats.constants.atom;
    return this;
}

function trackingMessage(message) {
    var x = document.getElementById('trackingMessage');
    x.innerHTML = message;
}
function ToggleTracking() {
    var group = document.getElementById('selectedGroup').innerHTML;
    var user = document.getElementById('selectedUser').innerHTML;
    var istracking = (document.getElementById('trackingOn').innerHTML === 'ON');
    if (!istracking) {
        // tracking is currently turned off
        // Let's check to make sure they filled out the group / user id
        if (group.toUpperCase() == "NONE" || user.toUpperCase() == "NONE") {
            showGroups();
        } else {
            // Tracking is off and we apparently have right info filled out
            captureTrackingData();
            startTracking();
        }
    } else {
        stopTracking();
        //trackingMessage('Tracking is active.');
    }
}

function saveUserID() {
    var t = $.trim($('#txtuserid').val().toUpperCase());
    if (t === 'NONE' || t.length === 0) {
        trackingMessage('Please choose a valid user identifier, like your first name or an ID number.');
        document.getElementById('txtuserid').focus();
    } else {
        trackingMessage('Attempting to start tracking.');
        var seluser = document.getElementById('selectedUser');
        seluser.innerHTML = t;
        seluser.className = 'clickable';
        hide('chooseUserID');
        if (document.getElementById('trackingOn').innerHTML === 'OFF') {
            ToggleTracking();
        }
    }
}

function showUserIDChoice() {
    trackingMessage('Waiting on a valid User Identification to be entered.');
    show('chooseUserID');
    hide('chooseGroups');
    document.getElementById('txtuserid').focus();
}

function chooseGroup(e) {
    var groupchosen = e.currentTarget.innerHTML;
    var selgroup = document.getElementById('selectedGroup');
    selgroup.innerHTML = groupchosen;
    selgroup.className = 'clickable';
    showUserIDChoice();
}

function show(e) {
    var ele = document.getElementById(e);
    ele.style.display = "block";
    ele.style.visibility = "visible";
    return ele;
}

function hide(e) {
    var ele = document.getElementById(e);
    ele.style.display = "none";
    ele.style.visibility = "hidden";
    return ele;
}

function showGroups() {
    trackingMessage('Please select one of the groups below');
    hide('startTracking');
    show('chooseGroups');
}

function addGroups(target, classtouse) {
    // We're going to look at all of the fieldsets in the unit status and pull out all of the li's
    var li = $('#unit fieldset ol li');
    var $tracking = $(target);
    var a = ['<ol>'];
    for (var i = 0; i < li.length; i++) {

        if (classtouse === 'Ops') {
            a.push(createGroupli(li[i].id, classtouse, li[i].id));
            //a.push('<li id="Group' + li[i].id + '" class="' + classtouse + '">' + li[i].id + '</li>');
        } else {

            //a.push('<li id="Group' + i + 1 + '" class="' + classtouse + '">Group ');
            var g = 'Group ';
            if (i < 9) {
                g = g + '0';
            }
            a.push(createGroupli((i + 1), classtouse, g + (i + 1)));
            //a.push(i + 1 + '</li>');
        }
    }
    a.push('</ol>');
    $tracking.html(a.join(''));
}

function createGroupli(id, classtouse, displayname) {
    return '<li id="Group' + id + '" class="' + classtouse + '" onclick="chooseGroup(event);">' + displayname + '</li>';
}
