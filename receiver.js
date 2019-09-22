const rcswitch = require('rcswitch-gpiomem3'); // Might throw an error if wiring pi init failed, or exit process if no root (must work on that)

rcswitch.enableReceive(2);
var last_message;
var timer = setInterval(function () {
  if (rcswitch.available()) {
    var message = rcswitch.getReceivedValue().toString();
    if (last_message != message) {
      last_message = message;
      var id = message.substring(0, 1);
      var temperature = parseInt(message.substring(1, 5)) / 100;
      console.log(id + ': ' + temperature);
      var db = require('better-sqlite3')('./temperature.sqlite', {});
      db.prepare('INSERT INTO Readings (sensor, temperature) VALUES(?, ?)').run(id, temperature);
    }
    rcswitch.resetAvailable();
  }
}, 500);
