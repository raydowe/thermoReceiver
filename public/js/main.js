var Readings = function() {

	const sensors = [
		{
			'id':0,
			'name':'weather',
			'color':'rgb(0, 157, 255)'
		},
		{
			'id':1,
			'name':'downstairs',
			'color':'rgb(77, 255, 0)'
		},
		{
			'id':2,
			'name':'upstairs',
			'color':'rgb(255, 0, 255)'
		},
		{
			'id':3,
			'name':'heating',
			'color':'rgb(255, 0, 0)'
		}
	];

	var ctx = this;
	var chart;
	var starting;
	var ending;
	var days;
	var offset;

	this.Readings = function() {
		var params = new URLSearchParams(window.location.search);
		days = 1;
		if (params.has('days')) {
			days = parseInt(params.get('days'));
		}
		$('.timespan[value=' + days + ']').attr('checked', 'checked');
		offset = 0;
		if (params.has('offset')) {
			offset = parseInt(params.get('offset'));
		}
		ending = moment().add(-offset, 'days').endOf('day');
		starting = ending.clone().add(-days, 'days').add(1, 'milliseconds');
		$('.timespan').change(ctx.timespanChange);
		$('#previous').click(ctx.previousTime);
		$('#next').click(ctx.nextTime);
		ctx.loadReadings();
	}

	this.timespanChange = function() {
		days = $('input[name=timespan]:checked').val();
		ctx.navigate();
		return false;
	}

	this.previousTime = function() {
		offset += days;
		ctx.navigate();
		return false;
	}

	this.nextTime = function() {
		offset -= days;
		if (offset < 0) {
			offset = 0;
		}
		ctx.navigate();
		return false;
	}

	this.navigate = function() {
		window.location = '?offset=' + offset.toString() + '&days=' + days.toString();
	}

	this.adjustStartEnd = function() {
		$('.start-date').html(starting.format('DD/MM/YY'));
		$('.end-date').html(ending.format('DD/MM/YY'));
	}

	this.loadReadings = function() {
		var ending_datetime = ending.utc().format('YYYY-MM-DD HH:mm:ss');
		console.log(ending_datetime);
		$.ajax({
		  url: '/readings',
			data: {
				ending: ending_datetime,
				days: days
			},
			dataType:'json',
		})
	  .done(function(response) {
			ctx.organizeData(response);
			ctx.adjustStartEnd();
		});
	}

	this.organizeData = function(response) {
		var datapoints = {};
		var current_temps = {};
		for (var i = 0; i < response.length; i++) {
			var response_datapoint = response[i];
			var datapoint = {};
			datapoint.x = moment.utc(response_datapoint.created);
			datapoint.y = response_datapoint.temperature;
			var sensor_key = response_datapoint.sensor.toString();
			if (datapoints[sensor_key] == null) {
				datapoints[sensor_key] = [];
			}
			datapoints[sensor_key].push(datapoint);
			current_temps[sensor_key] = response_datapoint.temperature;
		}

		var datasets = ctx.makeDatasets(datapoints);

		ctx.makeChart(datasets);
		ctx.currentTemperatures(current_temps);
	}

	this.makeDatasets = function(datapoints) {
		var datasets = [];
		var keys = Object.keys(datapoints);
		for (var i = 0; i < keys.length; i++) {

			var key = parseInt(keys[i]);

			var sensor;
			for (var j = 0; j < sensors.length; j++) {
				if (sensors[j].id == key)
				sensor = sensors[j];
			}

			if (sensor != null) {
				var dataset = {
					borderColor: sensor.color,
					data: datapoints[key],
					label: sensor.name.charAt(0).toUpperCase() + sensor.name.slice(1)
				}
				datasets.push(dataset);
			}
		}
		return datasets;
	}

	this.makeChart = function(datasets) {

		var config = {
			type: 'line',
		  data: {
				datasets: datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio:false,
				scales: {
					xAxes: [{
						gridLines: {
							display:true,
							color: 'rgba(255,255,255,0.2)',
						},
						type: 'time',
						time: {
							unit: 'hour'
						},
						ticks: {
							source: 'auto',
							autoSkip: true
						},
						scaleLabel: {
							display: true,
							labelString: 'Date'
						}
					}],
					yAxes: [{
						gridLines: {
							display:true,
							color: 'rgba(255,255,255,0.2)',
						},
						ticks: {
							stepSize: 1,
							callback: function(value, index, values) {
								return value + '°';
							}
						},
						scaleLabel: {
							display: true,
							labelString: 'Temperature'
						}
					}]
				}
			}
		}

		var canvasContext = document.getElementById('chart-canvas').getContext('2d');
		chart = new Chart(canvasContext, config);
	}

	this.currentTemperatures = function(current_temps) {
		console.log(current_temps);
		var html = '';
		var sensor_ids = Object.keys(current_temps);
		for (var i = 0; i < sensor_ids.length; i++) {
			var sensor_id = parseInt(sensor_ids[i]);
			var temp = current_temps[sensor_id];
			var sensor;
			for (var k = 0; k < sensors.length; k++) {
				if (sensors[k].id == sensor_id) {
					sensor = sensors[k];
				}
			}
			html += '<span class="sensor-' + sensor.name + '">' + sensor.name + '<span class="temp" style="color:' + sensor.color + '">' + temp + '&deg;</span>';
		}
		$('.current').html(html);
	}

	ctx.Readings();

}()
