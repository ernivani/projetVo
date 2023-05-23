const express = require("express");
const mysql2 = require("mysql2");
const WebSocket = require("ws");
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

// Initialize a WebSocket server instance
const wss = new WebSocket.Server({ noServer: true });

let clients = new Map(); // To hold all the active clients

let nextId = 0; // To assign each connection a unique ID

wss.on("connection", (ws, request) => {
    const id = nextId++;
    clients.set(id, ws); // Add the new connection to the clients map

    console.log("Client connected :", id);

    ws.on("message", async (message) => {
        const data = JSON.parse(message);

        if (data.type === "sentenceCheck") {
            const query = "SELECT * FROM `vo_table` WHERE `phrase` = ?";
            try {
                const [rows, fields] = await connection
                    .promise()
                    .query(query, [data.payload]);

                // if there are no rows, then the sentence is not in the database, and we assume it's correct
                if (rows.length === 0) {
                    ws.send(
                        JSON.stringify({
                            type: "sentenceCheck",
                            payload: { correct: 1 },
                        })
                    );
                } else {
                    const result = rows[0]; // assume that there will be at most one row
                    if (result.correct) {
                        // the sentence is correct
                        ws.send(
                            JSON.stringify({
                                type: "sentenceCheck",
                                payload: { correct: 1 },
                            })
                        );
                    } else {
                        // the sentence is incorrect
                        console.log(result);
                        ws.send(
                            JSON.stringify({
                                type: "sentenceCheck",
                                payload: {
                                    correct: 0,
                                    incorrect_word: result.mot_erreur,
                                },
                            })
                        );
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }
        if (data.type === "sentenceCheckAnswer") {
            // add to the database the sentence with the answerWord
            console.log(data.payload);
            let date = new Date(); // gets the current date and time
            const { sentence, answerWord } = data.payload;
            const query =
                "INSERT INTO `vo_table` (`Date`,`phrase`, `mot_erreur`, `correcte`) VALUES (?, ?, ?, ?)";
            try {
                await connection
                    .promise()
                    .query(query, [date, sentence, answerWord, 0]);
            } catch (err) {
                console.log(err);
            }
        }
    });

    ws.on("close", () => {
        clients.delete(id); // Remove the connection from the clients map
        console.log("Client disconnected :", id);
    });
});

// get /
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/src/index.html");
});

app.get("/stats", (req, res) => {
    // send json all the values in the database
    const query = "SELECT * FROM `vo_table`";
    try {
        connection.query(query, (err, rows, fields) => {
            if (err) throw err;
            res.json(rows);
        });
    } catch (err) {
        console.log(err);
    }
});

const server = app.listen(3000, () => {
    console.log("Example app listening on port 3000!");
});

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});
