const fs = require('fs');
const request = require('request');
const isPi = require('detect-rpi');
const rcswitch = (isPi()) ? require('rcswitch-gpiomem3') : null;

var configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));

if (isPi()) {
  rcswitch.enableReceive(2);
  var last_message;
  var receive_timer = setInterval(function () {
    if (rcswitch.available()) {
      var message = rcswitch.getReceivedValue().toString();
      if (last_message != message) {
        last_message = message;
        var sensor = message.substring(0, 1);
        var temperature = parseInt(message.substring(1, 5)) / 100;
        console.log(sensor + ': ' + temperature);
        var db = require('better-sqlite3')('./temperature.sqlite', {});
        db.prepare('INSERT INTO Readings (sensor, temperature) VALUES(?, ?)').run(sensor, temperature);
      }
      rcswitch.resetAvailable();
    }
  }, 500);
}


function getWeather() {
  request(
		{
      url: 'https://api.openweathermap.org/data/2.5/weather?lat=' + configuration.openweather.lat + '&lon=' + configuration.openweather.lon + '&appid=' + configuration.openweather.api_key + '&units=metric',
			method:'GET'
		},
		function(error, response, body) {
      var json = JSON.parse(body);
      var sensor = 0;
      var temperature = json.main.temp;
      console.log(sensor + ': ' + temperature);
      var db = require('better-sqlite3')('./temperature.sqlite', {});
      db.prepare('INSERT INTO Readings (sensor, temperature) VALUES(?, ?)').run(sensor, temperature);
		}
	);
}

var weather_timer = setInterval(getWeather, 1000 * 60 * 5);
getWeather();
