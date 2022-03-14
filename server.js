const express = require("express");
const { request } = require("http");
const app = express();
const { v4: uuid } = require("uuid");
const server = require("http").Server(app);
const io = require("socket.io")(server);




const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: "/"
});

const port = process.env.PORT || 3030;
const users = {};

app.set("view engine", "ejs");

app.use(express.static(__dirname + '/public'));
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
    res.render("home");
})
app.get("/ragistration", (req, res) => {
    res.render("ragistration");
})
app.get("/home", (req, res) => {
    res.render("home");
})
app.get("/call", (req, res) => {
    res.redirect(`/room/${uuid()}`);
});

app.get("/room/:id", (req, res) => {
    const { id } = req.params;
    res.render("room", { roomID: id });
});
io.on("connection", (socket) => {
    socket.on("join-room", (roomID, userID, username) => {
        if (users[roomID]) users[roomID].push({ id: userID, name: username, video: true, audio: true });
        else users[roomID] = [{ id: userID, name: username, video: true, audio: true }];

        socket.join(roomID);
        socket.broadcast.to(roomID).emit("user-connected", userID, username);

        socket.on("message", (message) => {
            io.in(roomID).emit("message", message, userID, username);
        });

        io.in(roomID).emit("participants", users[roomID]);

        socket.on("mute-mic", () => {
            users[roomID].forEach((user) => {
                if (user.id === userID) return (user.audio = false);
            });
            io.in(roomID).emit("participants", users[roomID]);
        });

        socket.on("unmute-mic", () => {
            users[roomID].forEach((user) => {
                if (user.id === userID) return (user.audio = true);
            });
            io.in(roomID).emit("participants", users[roomID]);
        });

        socket.on("stop-video", () => {
            users[roomID].forEach((user) => {
                if (user.id === userID) return (user.video = false);
            });
            io.in(roomID).emit("participants", users[roomID]);
        });
        socket.on("screen-share", () => {
            socket.on("peerConnect", (currentPeer) => {
                navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
                    screenStream = stream;

                    let videoTrack = screenStream.getVideoTracks()[0];

                    if (myPeer) {
                        let sender = currentPeer.peerConnection.getSenders().find(function(s) {
                            return s.track.kind == videoTrack.kind;
                        });
                        sender.replaceTrack(videoTrack);
                        screenSharing = true;
                    }
                });
            });
        })

        socket.on("play-video", () => {
            users[roomID].forEach((user) => {
                if (user.id === userID) return (user.video = true);
            });
            io.in(roomID).emit("participants", users[roomID]);
        });

        socket.on("disconnect", () => {
            socket.broadcast.to(roomID).emit("user-disconnected", userID, username);
            users[roomID] = users[roomID].filter((user) => user.id !== userID);
            if (users[roomID].length === 0) delete users[roomID];
            else io.in(roomID).emit("participants", users[roomID]);
        });
    });
});

server.listen(port, () => console.log("App is listening on port", port));