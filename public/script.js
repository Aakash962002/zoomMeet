const socket = io();
const myPeer = new Peer(undefined, {
  host: location.hostname,
  port: location.port || (location.protocol === "https:" ? 443 : 80),
  path: "/peerjs",
});

var peers = {};
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
var myID = "";
var myVideoStream;

var activeSreen = "";

const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
var myStream;
//user Camera And Voice for Video Confernce
navigator.mediaDevices.getUserMedia({video: true,audio: true,}).then((stream) => 
{
      myVideoStream = stream;
      myStream = myVideoStream;
      addVideoStream(myVideo, stream);
    
      myPeer.on("call", (call) => {
        call.answer(myVideoStream);
        const video = document.createElement("video");

        call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
        });
      });

    
});
    
//code for screen sharing

const startBtn = document.getElementsByClassName("screen-btn");
   
for (i = 0; i < startBtn.length; i++) {
  startBtn[i].addEventListener("click", startScreenShare);
}
function startScreenShare() 
{
      navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true })
      .then((stream) => 
      {
        
        myStream = stream;
        addVideoStream(myVideo, myStream);
        
      
            myPeer.on("call", (call) => 
            {
              call.answer(myStream);
              const video = document.createElement("video");

                call.on("stream", (userVideoStream) => {
                addVideoStream(video, userVideoStream);
                  });
              });
    
              
      
              //change display video settings
      
              myVideo.style.width = "100%";
              myVideo.style.height = "90vh";
              myVideo.style.transform = "rotateY(0deg)";

              //store stream in variable
              let videoTrack = screenStream.getVideoTracks()[0];
              //on stop sharing
                  videoTrack.onended = () => 
                  {
                      alert("Screen Stoped");
                      socket.emit("play-video");
                      //screen user camera and audio
                      navigator.mediaDevices
                      .getUserMedia({ video: true, audio: true })
                      .then((stream) => 
                      {
                          myVideo.style.width = "";
                          myVideo.style.height = "";
                          myVideo.style.transform = "rotateY(180deg)";
                          addVideoStream(myVideo, stream);
                          myVideoStream = stream;
                          myStream = myVideoStream;
                          myPeer.on("call", (call) => {
                           call.answer(myVideoStream);
                            const video = document.createElement("video");

                            call.on("stream", (userVideoStream) => {
                            addVideoStream(video, userVideoStream);
                            });
                          });
          
             
                        
                      }).catch((e) => {});
              }            
       })
}
//sharing stream to other users
socket.on("user-connected", (userID, username) => {
  connectNewUser(userID,myStream);
  systemMessage(username, true);
  });

  socket.emit("participants");

//on user disconnect
 
socket.on("user-disconnected", (userID, username) => {
  peers[userID]?.close();
  systemMessage(username);
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, USERNAME);
  myID = id;
});

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
};

const connectNewUser = (userID, stream) => {
  const call = myPeer.call(userID, stream);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on("close", () => {
    video.remove();
  });

  peers[userID] = call;
};

const msg = document.getElementById("chat-message");
const btn = document.getElementById("send-btn");
const lists = document.getElementById("messages");

const sendMessage = (message) => {
  if (message) socket.emit("message", stripHTML(message));
  msg.value = "";
  msg.focus();
};

msg.addEventListener("keypress", (e) => {
  if (e.key == "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(msg.value);
  }
});

btn.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage(msg.value);
});

socket.on("message", (message, userID, username) => {
  const container = document.querySelector(".main__chat__box");
  const list = document.createElement("li");
  list.className = userID === myID ? "message-right" : "message-left";
  list.innerHTML = `
        ${
          userID !== myID
            ? "<div class='message__avatar'>" +
              username[0].toUpperCase() +
              "</div>"
            : ""
        }
        <div class="message__content">
            ${userID !== myID ? "<span>" + username + "</span>" : ""}
            <div class="message__text"><span>${message}<span></div>
        </div>`;

  lists.append(list);
  container.scrollTop = container.scrollHeight;
});

socket.on("participants", (users) => {
  // const container = document.querySelector(".main__users__box");
  const lists = document.getElementById("users");
  lists.innerHTML = "";
  lists.textContent = "";

  users.forEach((user) => {
    const list = document.createElement("li");
    list.className = "user";
    list.innerHTML = `
            <div class="user__avatar">${user.name[0].toUpperCase()}</div>
            <span class="user__name">${user.name}${
      user.id == myID ? " (You)" : ""
    }</span>
            <div class="user__media">
                <i class="fas fa-microphone${
                  user.audio === false ? "-slash" : ""
                }"></i>
                <i class="fas fa-video${
                  user.video === false ? "-slash" : ""
                }"></i>
            </div>
        `;

    lists.append(list);
  });
});

const handleMicrophone = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  const node = document.querySelector(".mute-btn");

  if (enabled) {
    socket.emit("mute-mic");
    myVideoStream.getAudioTracks()[0].enabled = false;

    node.children[0].classList.remove("fa-microphone");
    node.children[0].classList.add("fa-microphone-slash");
    node.children[1].innerHTML = "Unmute";
  } else {
    socket.emit("unmute-mic");
    myVideoStream.getAudioTracks()[0].enabled = true;

    node.children[0].classList.remove("fa-microphone-slash");
    node.children[0].classList.add("fa-microphone");
    node.children[1].innerHTML = "Mute";
  }
};

const handleVideo = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  const node = document.querySelector(".video-btn");

  if (enabled) {
    socket.emit("stop-video");
    myVideoStream.getVideoTracks()[0].enabled = false; //stop sharing my video

    node.children[0].classList.remove("fa-video");
    node.children[0].classList.add("fa-video-slash");
    node.children[1].innerHTML = "Play Video";
  } else {
    socket.emit("play-video");
    myVideoStream.getVideoTracks()[0].enabled = true;

    node.children[0].classList.remove("fa-video-slash");
    node.children[0].classList.add("fa-video");
    node.children[1].innerHTML = "Stop Video";
  }
};

const systemMessage = (username, join = false) => {
  const date = new Date();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  const format = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  const container = document.querySelector(".main__chat__box");
  const list = document.createElement("li");
  list.className = "system-message";
  list.innerHTML = `<span>${hours}:${minutes}${format}</span><span>${username} has ${
    join ? "joined" : "left"
  } the meeting</span>`;

  lists.append(list);
  container.scrollTop = container.scrollHeight;
};

const handleInvite = () => {
  alert(
    `Invite people to your room:\n\nRoom ID: ${ROOM_ID}\nCopy this link to join: ${window.location.href}`
  );
};
























///test
   //user Screen Sharing
  

  
