const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const router = express.Router();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:5500", // 프론트엔드 URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

router.get("/", (req, res) => {
  res.send("hi");
});

let rooms = {}; // 방 정보 저장

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  if (rooms.length != 0) {
    socket.emit('roomBox', rooms);
  }

  socket.on("joinGame", (room) => {
    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }
    let a = false,
      b = false,
      players = rooms[room].players;
    for (let i = 0; i < rooms[room].players.length; i++) {
      if (players[i].role === "A") {
        a = true;
      } else if (players[i].role === "B") {
        b = true;
      }
    }
    let role;
    if (!a) role = "A";
    else if (!b) role = "B";
    else role = "spector";

    rooms[room].players.push({ id: socket.id, role: role });
    socket.join(room);
    socket.emit("assignRole", role);
    io.emit('roomBox', rooms);
  });

  socket.on("placeBlock", (data) => {
    socket.to(data.room).emit("updateGrid", data);
  });

  socket.on("chatMessage", (msg) => {
    io.to(msg.room).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let room in rooms) {
      rooms[room].players = rooms[room].players.filter(
        (player) => player.id !== socket.id
      );
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      }
    }
  });
});

app.use(router);
app.use(express.static("public"));
app.use(
  cors({
    origin: "http://127.0.0.1:5500/", //배포후 netlify링크
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
