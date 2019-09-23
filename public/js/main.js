var Readings = function() {

	var ctx = this;

	this.Readings = function() {
		ctx.loadReadings();
	}

	this.loadReadings = function() {
		$.ajax({
		  url: '/readings',
			dataType:'json'
		})
	  .done(function(response) {
			ctx.organizeData(response);
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

		ctx.makeChart(weather, downstairs);
	}

	this.makeChart = function(weather, downstairs) {

		var config = {
			type: 'line',
		  data: {
				datasets: [

					{ // downstairs
						borderColor: 'rgb(255, 0, 0)',
						data: downstairs,
						label: 'Downstairs'
					},

					{ // weather
						borderColor: 'rgb(0, 0, 255)',
						data: weather,
						label: 'Weather'
					}

				]
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
		var chart = new Chart(canvasContext, config);
	}

	ctx.Readings();

}()
