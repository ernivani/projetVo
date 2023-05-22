const express = require("express");
const mysql2 = require("mysql2");
const WebSocket = require("ws");
const fs = require("fs");

const app = express();

// initialize the connection to the database
const connection = mysql2.createConnection({
	host: "localhost",
	user: "root",
	password: "ernicani",
	database: "projetVo",
});

// connect to the database
connection.connect((err) => {
	if (err) throw err;
	console.log("Connected to the database!");
});

// Data preprocessing
function preprocessData(data) {
	if (!Array.isArray(data)) {
		// Handle the case when data is not an array
		console.error("Data is not an array:", data);
		return [];
	}

	// Implement your data preprocessing steps here
	// For example, let's assume you want to normalize the data
	const processedData = data.map((value) => value / 255); // Normalize values between 0 and 1
	return processedData;
}

// Model training
function trainModel(data) {
	// Implement your model training algorithm here
	// For example, let's assume you want to train a simple linear regression model
	const learningRate = 0.01;
	const trainingIterations = 100;
	let model = Math.random(); // Initialize the model with a random value

	for (let i = 0; i < trainingIterations; i++) {
		let error = 0;

		for (let j = 0; j < data.length; j++) {
			const prediction = model * data[j];
			const target = data[j]; // Assuming the target value is the same as the input value

			const delta = prediction - target;
			model -= learningRate * delta;

			error += delta ** 2;
		}

		const mse = error / data.length; // Mean Squared Error
		console.log(`Iteration ${i + 1} - MSE: ${mse}`);
	}

	return model;
}

// Model prediction
function predict(model, newData) {
	// Implement your model prediction algorithm here
	// For example, let's assume you want to make binary predictions based on a threshold
	const threshold = 0.5;
	const predictions = newData.map((value) => (value > threshold ? 1 : 0));
	return predictions;
}

// Path for model file
const modelFilePath = "model.json";

// Function to save the model
function saveModel(model) {
	const modelData = JSON.stringify(model);
	fs.writeFileSync(modelFilePath, modelData);
	console.log("Model saved successfully.");
}

// Function to load the saved model
function loadModel() {
	if (fs.existsSync(modelFilePath)) {
		const modelData = fs.readFileSync(modelFilePath, "utf8");
		const model = JSON.parse(modelData);
		console.log("Model loaded successfully.");
		return model;
	} else {
		console.log("No saved model found. Training a new model...");
		return trainModel(preprocessData(data)); // Re-train the model if no saved model is found
	}
}

// Function to save the data
async function saveData(sentence, answerWord) {
	const query =
		"INSERT INTO `vo_table` (`Date`, `phrase`, `mot_erreur`, `correcte`) VALUES (NOW(), ?, ?, ?)";
	try {
		await connection.promise().query(query, [sentence, answerWord, 0]);
		console.log("Data saved successfully.");
	} catch (err) {
		console.log(err);
	}
}

// Your existing code modified with the machine learning implementation
const wss = new WebSocket.Server({ noServer: true });

let clients = new Map(); // To hold all the active clients

let nextId = 0; // To assign each connection a unique ID

wss.on("connection", (ws, request) => {
	const id = nextId++;
	clients.set(id, ws); // Add the new connection to the clients map

	console.log("Client connected:", id);

	ws.on("message", async (message) => {
		const data = JSON.parse(message);

		if (data.type === "sentenceCheck") {
			const processedData = preprocessData(data.payload);
			const model = loadModel();
			const predictions = predict(model, processedData);

			// Handle the predictions and send appropriate responses
			// based on the machine learning model output
			if (predictions === 1) {
				ws.send(
					JSON.stringify({
						type: "sentenceCheck",
						payload: { correct: 1 },
					})
				);
			} else {
				ws.send(
					JSON.stringify({
						type: "sentenceCheck",
						payload: { correct: 0, incorrect_word: "error" },
					})
				);
			}
		} else if (data.type === "sentenceCheckAnswer") {
			// Handle sentence check answer and database updates
			console.log(data.payload);
			const { sentence, answerWord } = data.payload;
			await saveData(sentence, answerWord);
		}
	});

	ws.on("close", () => {
		clients.delete(id); // Remove the connection from the clients map
		console.log("Client disconnected:", id);
	});
});

const server = app.listen(3000, () => {
	console.log("Example app listening on port 3000!");
});

server.on("upgrade", (request, socket, head) => {
	wss.handleUpgrade(request, socket, head, (ws) => {
		wss.emit("connection", ws, request);
	});
});
