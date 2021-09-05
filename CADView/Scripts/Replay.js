

// Get Incident Number
// Get Data
// Add Epoch Time to that data
// write function to interval through it
// create slider
// show time as time is playing

document.getElementById("slider_value").value = document.getElementById("myRange").value; // Display the default slider value


// Update the current slider value (each time you drag the slider handle)
document.getElementById("myRange").oninput = function ()
{
  document.getElementById("slider_value").value = this.value;
  console.log('slider value', this.value);
}