//const request = require('request');
const express = require('express');
const app = express();
const port = 3001;

app.use(express.static('public'))

app.get('/readings', (req, res) => {
  var db = require('better-sqlite3')('./temperature.sqlite', {});
  var timespan = req.query.timespan;
  var age = '1 days';
  if (timespan == 'week') {
      age = '7 days';
  }
  var sql = 'SELECT * FROM Readings WHERE created >= datetime("now", "-' + age + '") ORDER BY created ASC';
  var readings = db.prepare(sql).all();
	res.send(readings);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
