const express = require("express");
const path = require('path');
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '/views')));

app.use("/js", express.static(__dirname + "/js/"));
app.use("/img", express.static(__dirname + "/img/"));

app.use(
    "/io",
    express.static(__dirname + "/node_modules/socket.io/client-dist/")
);

server.listen(3000, () => {
    console.log("Server started on port 3000");
});

const fs = require('fs');
const filePath = 'json/futsu_ga_ichiban.json';

const players = {};
let ready = 0;

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('ファイルの読み込みエラー:', err);
        return;
    }

    const jsonData = JSON.parse(data);

    io.on("connection", (socket) => {
        const playerID = socket.id;
        let x = 32;
        let y = 32;

        players[playerID] = {
            x: x,
            y: y
        };

        socket.emit("assignPlayerIdPos", { pid: playerID, y: y, x: x });

        socket.on("ready", () => {
            ready++;
            if (ready == 2) {
                io.emit("startGame", jsonData);
                ready = 0;
            }
        });

        //socket.emit("playerUpdate", players);

        socket.on("playerMove", (data) => {
            players[playerID] = data;
            io.emit("playerUpdate", players);
        });


        socket.on("disconnecting", () => {
            // プレイヤー情報を削除
            console.log(players[playerID], `このプレイヤーが消えたよ:${playerID}`);
            delete players[playerID];
            io.emit("playerUpdate", players);
            io.emit('reload');
        });

    });
});