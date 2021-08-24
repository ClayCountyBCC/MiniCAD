var locationData = [];
var locationCapture; // this is an interval flag;

function Location_Data() {
  this.Latitude = 0;
  this.Longitude = 0;
  this.Altitude = 0;
  this.Accuracy = 0;
  this.AltitudeAccuracy = 0;
  this.Heading = 0;
  this.Speed = 0;
  return this;
}

function locate() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(locateSuccess, locateError,
      { maximumAge: 10000, timeout: 10000, enableHighAccuracy: true });
  } else {
    stopLocating();
  }
}

function locateInitialMapPoint() {
  // this function is used to do the initial zoom in
  // when the user initially clicks the locate button.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(locateMapPointSuccess, locateError,
      { maximumAge: 10000, timeout: 10000, enableHighAccuracy: true });
  } else {
    stopLocating();
  }
}

function locateSuccess(position) {
  var td = new Location_Data();
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
  updateLocationData(td);
}

function updateLocationData(td) {
  if (locationData.length > 10) {
    locationData.shift();
  }
  locationData.push(td);
}

function locateError(error) {
  console.log('location error', error);
}

function startLocating() {
  firstLocationPoint = null;
  locationCapture = setInterval(locate, 15000);
  locateInitialMapPoint();
}

function stopLocating() {
  clearInterval(locationCapture);
  locationData = [];
}