//const request = require('request');
const express = require('express');
const db = require('better-sqlite3')('./temperature.sqlite', {});
const app = express();
const port = 3001;

app.use(express.static('public'))

app.get('/readings', (req, res) => {
  const db = require('better-sqlite3')('./temperature.sqlite', {});
  var readings = db.prepare('SELECT * FROM Readings').all();
	res.send(readings);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
