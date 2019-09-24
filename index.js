//const request = require('request');
const express = require('express');
const app = express();
const port = 3001;

app.use(express.static('public'))

app.get('/readings', (req, res) => {
  var db = require('better-sqlite3')('./temperature.sqlite', {});
  var ending = req.query.ending;
  var days = req.query.days;
  var sql = 'SELECT * FROM Readings WHERE created >= datetime("' + ending + '", "-' + days + ' days") AND created <= datetime("' + ending + '") ORDER BY created ASC';
  var readings = db.prepare(sql).all();
	res.send(readings);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
