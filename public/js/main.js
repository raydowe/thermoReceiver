var Readings = function() {

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
		var datasets = [];

		var weather = [];
		var downstairs = [];

		for (var i = 0; i < response.length; i++) {
			var response_datapoint = response[i];
			var datapoint = {};
			datapoint.x = moment.utc(response_datapoint.created);
			datapoint.y = response_datapoint.temperature;
			if (response_datapoint.sensor == 0) {
				weather.push(datapoint);
			}
			if (response_datapoint.sensor == 1) {
				downstairs.push(datapoint);
			}
		}

		var dataset = [{
				// downstairs
				borderColor: 'rgb(255, 0, 0)',
				data: downstairs,
				label: 'Downstairs'
			},{
				// weather
				borderColor: 'rgb(0, 0, 255)',
				data: weather,
				label: 'Weather'
			}];

		var min = starting;
		var max = ending;

		ctx.makeChart(dataset, min, max);
	}

	this.makeChart = function(datasets, min, max) {

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
							unit: 'hour',
							min: min,
							max: max
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

	ctx.Readings();

}()
