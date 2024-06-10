const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
    if (socket.partner) {
      socket.partner.emit("partner disconnected");
      socket.partner.partner = null;
    }
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("partner disconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
    if (waitingUser) {
      socket.partner = waitingUser;
      waitingUser.partner = socket;
      waitingUser.emit("partner found");
      socket.emit("partner found");
      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting for partner");
    }
  });

  socket.on("chat message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("chat message", { sender: "Stranger", message: msg });
      socket.emit("chat message", { sender: "You", message: msg });
    }
  });

  socket.on("signal", (data) => {
    if (socket.partner) {
      socket.partner.emit("signal", data);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
