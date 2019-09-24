const fs = require('fs');
const request = require('request');
const is_pi = require('detect-rpi')();
var rcswitch;
if (is_pi) {
  console.log('Starting listeneing for 433MHz messages...')
  rcswitch = require('rcswitch-gpiomem3')
  rcswitch.enableReceive(2);
}

var Receiver = function() {

  const SENSORS = [
    {
      id: 0,
      name: 'weather',
      refresh: 15
    },
    {
      id: 1,
      name: 'downstairs',
      refresh: 5
    },
    {
      id: 2,
      name: 'upstairs',
      refresh: 5
    },
    {
      id: 3,
      name: 'heating',
      refresh: 5
    }
  ];

  var ctx = this;
  var configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));
  var message_timer;
  var heartbeat_timer;
  var sensor_values = {};

  this.init = function() {
    ctx.assertTables();

    var heartbeat_timer = setInterval(ctx.heartbeat, 60000); // one minute
    setTimeout(function() {
      ctx.heartbeat();
    }, 5000);

    message_timer = setInterval(ctx.checkMessageQueue, 500);
    ctx.checkMessageQueue();
  }

  this.assertTables = function() {
    var db = ctx.getDatabase();
    db.prepare('CREATE TABLE IF NOT EXISTS Readings (id INTEGER PRIMARY KEY, sensor INTEGER, temperature FLOAT, created DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
  }

  this.heartbeat = function() {

    for (var i = 1; i < SENSORS.length; i++) {
      var sensor = SENSORS[i];

      if (ctx.messageNeededForSensor(sensor)) {

        if (sensor.id == 0) {
          ctx.getWeather(function(temperature) {
            ctx.saveReading(sensor.id, temperature)
          });
        } else {
          var temperature = ctx.getMessage(sensor.id);
          ctx.saveReading(sensor.id, temperature)
          sensor_values[sensor.id.toString()] = undefined;
        }
      }
    }
  }

  this.messageNeededForSensor = function(sensor) {
    var db = ctx.getDatabase();
    var results = db.prepare('SELECT * FROM Readings WHERE sensor = ? AND created >= Datetime("now", "-' + sensor.refresh.toString() + ' minutes")').get(sensor.id);
    return results == undefined;
  }

  this.getMessage = function(sensor) {
    var temperature = sensor_values[sensor.toString()];
    if (temperature == undefined) {
      // no message queued
      return null;
    }
    return temperature;
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

  this.getWeather = function(callback) {
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
        callback(temperature);
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
