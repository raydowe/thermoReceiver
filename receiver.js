const fs = require('fs');
const moment = require('moment');
const request = require('request');
const is_pi = require('detect-rpi')();

var Receiver = function() {

  var ctx = this;
  var configuration = JSON.parse(fs.readFileSync(__dirname + '/configuration.json'));
  var rcswitch;
  var message_timer;
  var heartbeat_timer;
  var sensor_values = {};

  this.init = function() {
    ctx.assertTables();
    ctx.startReceiving();
    var heartbeat_timer = setInterval(ctx.heartbeat, 20 * 1000); // twenty seconds minute
    setTimeout(function() {
      ctx.heartbeat();
    }, 5000);

    message_timer = setInterval(ctx.checkMessageQueue, 500);
    ctx.checkMessageQueue();
  }

  this.startReceiving = function() {
    if (is_pi) {
      ctx.log('Starting listeneing for 433MHz messages...')
      rcswitch = require('rcswitch-gpiomem3')
      rcswitch.enableReceive(2);
    } else {
      ctx.log('Not a Pi. Will only be able to gather weather.');
    }
  }

  this.assertTables = function() {
    var db = ctx.getDatabase();
    db.prepare('CREATE TABLE IF NOT EXISTS Readings (id INTEGER PRIMARY KEY, sensor INTEGER NOT NULL, temperature FLOAT NOT NULL, created DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)').run();
  }

  this.heartbeat = function() {

    // weather
    if (ctx.messageNeededForSensor(0, 15)) {
      ctx.getWeather(function(temperature) {
        ctx.saveReading(0, temperature)
      });
    }

    // downstairs
    if (ctx.messageNeededForSensor(1, 5)) {
      var temperature = ctx.getMessage(1);
      if (temperature != null) {
        ctx.saveReading(1, temperature)
        sensor_values['1'] = undefined;
      }
    }

    // upstairs
    if (ctx.messageNeededForSensor(2, 5)) {
      var temperature = ctx.getMessage(2);
      if (temperature != null) {
        ctx.saveReading(2, temperature)
        sensor_values['2'] = undefined;
      }
    }

    // heating
    /*if (ctx.messageNeededForSensor(3, 5)) {
      var temperature = ctx.getMessage(3);
      if (temperature != null) {
        ctx.saveReading(3, temperature)
        sensor_values['3'] = undefined;
      }
    }*/

  }

  this.messageNeededForSensor = function(sensor_id, frequency) {
    var db = ctx.getDatabase();
    var results = db.prepare('SELECT * FROM Readings WHERE sensor = ? AND created >= Datetime("now", "-' + frequency.toString() + ' minutes")').get(sensor_id);
    var needs_update = results == undefined;
    return needs_update;
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
      if (message.length != 6) {
        ctx.log('Bad message length: ' + message);
        return;
      }
      if (!ctx.validateMessage(message)) {
        ctx.log('Bad check digit: ' + message);
        return;
      }
      var sensor = parseInt(message.substring(0, 1));
      var temperature = parseInt(message.substring(1, 5)) / 100;
      if (sensor_values[sensor.toString()] != temperature) {
        sensor_values[sensor.toString()] = temperature;
      }
      rcswitch.resetAvailable();
    }
  }

  this.getWeather = function(callback) {
    ctx.log('Getting weather...');
    request(
  		{
        url: 'https://api.openweathermap.org/data/2.5/weather?lat=' + configuration.openweather.lat + '&lon=' + configuration.openweather.lon + '&appid=' + configuration.openweather.api_key + '&units=metric',
  			method:'GET'
  		},
  		function(error, response, body) {
        ctx.log('Response received...');
        var json = JSON.parse(body);
        var temperature = json.main.temp;
        callback(temperature);
  		}
  	);
  }

  this.saveReading = function(sensor_id, temperature) {
    ctx.log('Saving ' + sensor_id + ': ' + temperature);
    var db = ctx.getDatabase();
    db.prepare('INSERT INTO Readings (sensor, temperature) VALUES(?, ?)').run(sensor_id, temperature);
  }

  this.getDatabase = function() {
    var db = require('better-sqlite3')('./temperature.sqlite', {});
    return db;
  }

  this.validateMessage = function(message) {
    var even = 0;
    var odd = 0;
    var body = message.substring(0, message.length - 1);
    var check_digit = message.substring(message.length - 1, message.length);
    for (var i = 0; i < body.length; i++) {
      var digit = parseInt(body.substring(i, i + 1));
      if ((i + 1) % 2 == 0) {
        even += digit;
      } else {
        odd += digit;
      }
    }
    var total = (odd * 3) + even;
    var remainder = total % 10;
    var result = 10 - remainder;
    if (result == 10) {
      result = 0;
    }
    return (check_digit == result);
  }

  this.log = function(message) {
    var output = '[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + message;
    console.log(output);
  }

  ctx.init();

}()
