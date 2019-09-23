var Readings = function() {

	var ctx = this;
	var chart;
	var ending = moment();
	var timespan = 'day';

	this.Readings = function() {
		$('.timespan').change(ctx.timespanChange);
		$('#previous').click(ctx.previousTime);
		$('#next').click(ctx.nextTime);
		ctx.loadReadings();
	}

	this.timespanChange = function() {
		timespan = $('input[name=timespan]:checked').val();
		ctx.loadReadings();
		return false;
	}

	this.previousTime = function() {
		var days = (timespan == 'week') ? 7 : 1 ;
		ending.add(-days, 'day');
		ctx.loadReadings();
		return false;
	}

	this.nextTime = function() {
		var days = (timespan == 'week') ? 7 : 1 ;
		ending.add(days, 'day');
		if (ending > moment()) {
			ending = moment();
		}
		ctx.loadReadings();
		return false;
	}

	this.adjustStartEnd = function() {
		var days = (timespan == 'week') ? 7 : 1 ;
		var start = ending.clone().add(-days, 'day');
		$('.start-date').html(start.format('DD/MM/YY'));
		$('.end-date').html(ending.format('DD/MM/YY'));
	}

	this.loadReadings = function() {
		$.ajax({
		  url: '/readings',
			data: {
				ending: ending.format('YYYY-MM-DD HH:mm:ss'),
				timespan: timespan
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

		if (chart != null) {
			ctx.updateChart(dataset);
		} else {
			ctx.makeChart(dataset);
		}
	}

	this.updateChart = function(datasets) {
		var count_to_remove = chart.data.datasets.length;
		for (var i = 0; i < count_to_remove; i++) {
			chart.data.datasets.pop(chart.data.datasets[0]);
		}
		for (var i = 0; i < datasets.length; i++) {
			chart.data.datasets.push(datasets[i]);
		}
		chart.update();
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
