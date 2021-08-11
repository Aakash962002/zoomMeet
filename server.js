const express = require("express");
const { request } = require("http");
const app = express();
const { v4: uuidv4 } = require("uuid");
const server = require("http").Server(app);
const io = require("socket.io")(server);

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


const users ={}

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/call", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { room_id: req.params.room });
});

io.on("connection", (socket) => {

  socket.on('new-chat-user',user => {
    users[socket.id] = user;
    socket.broadcast.emit('user-connected-chat',user);
    console.log(user);
  });
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userId);

    socket.on("SentMessage", message => {
      io.emit("createMessage",{ message: message, name:users[socket.id] });
    });
  });
  

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', users[socket.id]);
    delete users[socket.id]
  })
});



server.listen(process.env.PORT || 3030);