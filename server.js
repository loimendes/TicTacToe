var connections = {};
var games = {};
var url = require('url');
const mqtt = require('mqtt');

// Créer une instance du client MQTT
const client = mqtt.connect('http://127.0.0.1'); // Remplacez par l'URL de votre broker MQTT

// Événement lorsqu'une connexion est établie
client.on('connect', function () {
    console.log('Connecté au broker MQTT');
    
    // Publier un message sur un topic
    client.publish('topic', 'Hello MQTT');
});

// Gestion des messages entrants
client.on('message', function (topic, message) {
    // Traiter les messages reçus
    console.log('Message reçu:', message.toString());
});

// S'abonner à un topic
client.subscribe('topic');

var send = function(res, data){
	headers = {
		'Content-type': 'application/json',
		'Access-Control-Allow-Headers': 'Content-type',
		'Access-Control-Allow-Origin': '*'
	}
	message = JSON.stringify(data);
	headers['Contnent-length'] = message.length;
	
	res.writeHead(200, headers);
	res.end(message);
}

var on_request = function(request,response){
	var body = '';
	if (request.method != 'POST') {
		send(response, null);
		return;
	}
	request.on('data', function (data) {
		body += data;
	});
	request.on('end', function(){
		var params = JSON.parse(body);
	
		var room = params.room;
		connections[room] = connections[room] || [];
		games[room] = games[room] || false;
		if (params.command == 'init') {
			if (connections[room].length == 1) {
				games[room] = true;
				send(connections[room][0], {player: 1});
				send(response, {player: 2});

				return;
			}
			if (games[room]) {
				send(response, {player: -1});
			}
		}
		// received command other than init, so game must be started
		games[room] = true; 
		if (params.command == 'set') {
			for (var i = connections[room].length -1; i >= 0; i--) {
				res = connections[room][i];

				//create array to save row, cell and symbol from the last player
				var postionArray = [];

				//Push json values into the array with the order : row, cell, symbol
				for(const [type, value] of Object.entries(params.value)){
					postionArray.push(value);
				};

				//format data for sending by mqtt
				var matrix = formatMatrix(postionArray[0], postionArray[1]);
				var symbol = formatSymbol(postionArray[2]);
				var message = matrix + "." + symbol;

				//publish data to mqtt
				client.publish('topic', message);

				send(res, params);
				connections[room].splice(i,1);
			}
		}
		connections[room].push(response);
	});
}

//Format matrix for sending mqtt request
function formatMatrix(row, cell){
	switch (row) {
		case '0':
			if(cell == '0'){
				return "0";
			} else if (cell == '1'){
				return "1";
			} else{
				return "2";
			}

		case '1':
			if(cell == '0'){
				return "3";
			} else if (cell == '1'){
				return "4";
			} else{
				return "5";
			}

		case '2':
			if(cell == '0'){
				return "6";
			} else if (cell == '1'){
				return "7";
			} else{
				return "8";
			}

		default:
			return "9";
	}
}

//Format symbol for sending mqtt request
function formatSymbol(symbol){
	switch (symbol) {
		case 'X':
			return "1";
		case 'O':
			return "2";
		default:
			return "0";
	}
}

var http = require('http').createServer(on_request).listen(8080);