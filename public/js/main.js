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
			datapoint.x = moment(response_datapoint.created);
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

					// weather
					{
						borderColor: 'rgb(0, 0, 255)',
						data: weather,
						label: 'Weather'
					},


					// burndown
					{
						//steppedLine: true,
						borderColor: 'rgb(255, 0, 0)',
						data: downstairs,
						//pointBackgroundColor: fillColors,
						label: 'Downstairs'
					}/*,

					// ideal line
					{
						borderColor: 'rgb(100, 100, 100)',
						data: ideal_data,
						lineTension: '0',
						label: 'Ideal'
					}*/
				]
			},

			options: {
				responsive: true,
				maintainAspectRatio:false,
				/*legend: {
            display: false
       	}*/ //,
				scales: {
					xAxes: [{
						gridLines: {
							display:true,
							color: 'rgba(255,255,255,0.2)',
						},
						type: 'time',
						time: {
							unit: 'day'
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
							display: false,
							labelString: 'Story Points'
						},
						//ticks: {
							//beginAtZero:true
						//}
					}]
				}
			}
		}

		var canvasContext = document.getElementById('chart-canvas').getContext('2d');
		var chart = new Chart(canvasContext, config);
	}

	ctx.Readings();

}()
