const fs = require('fs');
const request = require('request');
const is_pi = require('detect-rpi')();
var rcswitch;
if (is_pi) {
  console.log('Starting listeneing for 433Mhz messages...')
  rcswitch = require('rcswitch-gpiomem3')
  rcswitch.enableReceive(2);
}

var Receiver = function() {

  var ctx = this;
  var configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));
  var message_timer;
  var heartbeat_timer;
  var sensor_values = {};

  this.init = function() {
    var heartbeat_timer = setInterval(ctx.heartbeat, 5 * 60 * 1000);
    setTimeout(function() {
      ctx.heartbeat();
    }, 5000);

    message_timer = setInterval(ctx.checkMessageQueue, 500);
    ctx.checkMessageQueue();
  }

  this.heartbeat = function() {
    if (ctx.messageNeededForSensor(1, '5 minutes')) {
      ctx.getMessage(1);
    }

    if (ctx.messageNeededForSensor(0, '15 minutes')) {
      ctx.getWeather();
    }
  }

  this.messageNeededForSensor = function(sensor, duration) {
    var db = ctx.getDatabase();
    var results = db.prepare('SELECT * FROM Readings WHERE sensor = ? AND created >= Datetime("now", "-' + duration + '")').get(sensor);
    return results == undefined;
  }

  this.getMessage = function(sensor) {
    var temperature = sensor_values[sensor.toString()];
    if (temperature == undefined) {
      // no message queued
      return;
    }
    ctx.saveReading(sensor, temperature)
  }

  this.checkMessageQueue = function() {
    if (is_pi && rcswitch.available()) {
      var message = rcswitch.getReceivedValue().toString();
      var sensor = message.substring(0, 1);
      var temperature = parseInt(message.substring(1, 5)) / 100;
      sensor_values[sensor.toString()] = temperature;
      rcswitch.resetAvailable();
    }
  }

  this.getWeather = function() {
    console.log('Getting weather...');
    request(
  		{
        url: 'https://api.openweathermap.org/data/2.5/weather?lat=' + configuration.openweather.lat + '&lon=' + configuration.openweather.lon + '&appid=' + configuration.openweather.api_key + '&units=metric',
  			method:'GET'
  		},
  		function(error, response, body) {
        console.log('Response received...');
        var json = JSON.parse(body);
        var sensor = 0;
        var temperature = json.main.temp;
        ctx.saveReading(sensor, temperature);
  		}
  	);
  }

  this.saveReading = function(sensor, temperature) {
    console.log('Saving ' + sensor + ': ' + temperature);
    var db = ctx.getDatabase();
    db.prepare('INSERT INTO Readings (sensor, temperature) VALUES(?, ?)').run(sensor, temperature);
  }

  this.getDatabase = function() {
    var db = require('better-sqlite3')('./temperature.sqlite', {});
    return db;
  }

  ctx.init();

}()
