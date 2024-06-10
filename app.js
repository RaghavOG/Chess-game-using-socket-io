const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app); // Express and HTTP server are created and linked because Socket.io requires an HTTP server
const io = socket(server); // Socket.io binds to the HTTP server

const chess = new Chess();
let players = {};
let currentPlayer = "W";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
  console.log("connected ->> ID->>", uniquesocket.id);

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "W");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "B");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.on("disconnect", () => {
    if (players.white === uniquesocket.id) {
      delete players.white;
    }
    if (players.black === uniquesocket.id) {
      delete players.black;
    }
  });

  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;

      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        if (chess.in_checkmate()) {
          io.emit("gameOver", chess.turn() === "w" ? "Black" : "White");
        }
        if (chess.in_draw()) {
          io.emit("gameOver", "Draw");
        }
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        uniquesocket.emit("invalidMove", move);
      }
     

    } catch (err) {
        console.log(err);
        uniquesocket.emit("invalidMove", move);
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
