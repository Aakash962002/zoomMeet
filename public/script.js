const socket = io();
const PRE = "KRASH"
const SUF = "MEET"
const myPeer = new Peer(undefined, {
  host: location.hostname,
  port: location.port || (location.protocol === "https:" ? 443 : 80),
  path: "/peerjs",
});
var room_id;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var peers = {};
var myID = null;
var currentPeer = null
var screenSharing = false

const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

//add video to view

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
};


    
    myPeer.on('open', (id) => {
        console.log("Peer Connected with ID: ", id)
  
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            addVideoStream(myVideo,local_stream);

            myPeer.on('call', (call) => {
              call.answer(local_stream);
              const video = document.createElement("video");
      
              call.on('stream', (stream) => {
                addVideoStream(video,stream);
              })
              currentPeer = call;
          })



            
            socket.on("user-connected", (userID, username) => {
              connectNewUser(userID, stream);
              systemMessage(username, true);
          });
  
          socket.emit("participants");
        }, (err) => {
            console.log(err)
        })
        
    })
  









        

               




     

        //join room

        function joinRoom() {
          console.log("Joining Room")
       
          
          
          
          myPeer.on('open', (id) => {
              console.log("Connected with Id: " + id)
              getUserMedia({ video: true, audio: true }, (stream) => {
                  myVideoStream = stream;
                  addVideoStream(myVideo, myVideoStream);
                  
                  let call = myPeer.call(ROOM_ID, stream)

                  call.answer(myVideoStream);
                  const video = document.createElement("video");

                  call.on('stream', (stream) => {
                    addVideoStream(video, stream);
                  })
                  currentPeer = call;


                  socket.on("user-connected", (userID, username) => {
                    connectNewUser(userID, stream);
                    systemMessage(username, true);
                });
        
                socket.emit("participants");
              })


              }, (err) => {
                  console.log(err)
              })
      
          
      }
    //});

    //code for screen sharing oprtion
    const startBtn = document.getElementsByClassName("screen-btn");

    for (i = 0; i < startBtn.length; i++) {
      startBtn[i].addEventListener("click", startScreenShare);
    }
   
    function startScreenShare() {
      if (screenSharing) {
          stopScreenSharing()
      }
      navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
          screenStream = stream;
          let videoTrack = screenStream.getVideoTracks()[0];
          
          videoTrack.onended = () => {
              stopScreenSharing()
          }
          if (myPeer) {
              let sender = currentPeer.peerConnection.getSenders().find(function (s) {
                  return s.track.kind == videoTrack.kind;
              })
              sender.replaceTrack(videoTrack)
              screenSharing = true
          }
          console.log(screenStream)
      })
  }
  
  function stopScreenSharing() {
    if (!screenSharing) return;
    let videoTrack = local_stream.getVideoTracks()[0];
    if (myPeer) {
        let sender = currentPeer.peerConnection.getSenders().find(function (s) {
            return s.track.kind == videoTrack.kind;
        })
        sender.replaceTrack(videoTrack)
    }
    screenStream.getTracks().forEach(function (track) {
        track.stop();
    });
    screenSharing = false
}
  
   
    //recording the screen 

    const start = async()=>{
      const Recordingstream = await navigator.mediaDevices.getDisplayMedia({
          audio: true, 
          video:{
              mediaSource:"screen"
          }
      });
  
      const data =[];
  
  const mediaRecorder = new MediaRecorder(Recordingstream);
  
  mediaRecorder.ondataavailable=(e)=>{
      if (e.data.size > 0) {
          data.push(e.data);
        } 
      
  }
  mediaRecorder.start();
  mediaRecorder.onstop=(e)=>{
      saveFile(data);
      data = [];
  }
  function saveFile(data){
  
      const blob = new Blob(data, {
         type: 'video/webm'
       });
       let filename = window.prompt('Enter file name'),
           downloadLink = document.createElement('a');
       downloadLink.href = URL.createObjectURL(blob);
       downloadLink.download = `${filename}.webm`;
   
       document.body.appendChild(downloadLink);
       downloadLink.click();
       URL.revokeObjectURL(blob); // clear from memory
       document.body.removeChild(downloadLink);
   }
  }
  
  










//on user disconnect
 
socket.on("user-disconnected", (userID, username) => {
  peers[userID]?.close();
  
  systemMessage(username);
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, USERNAME);
  myID = id;
});



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
  const enabled = local_stream.getAudioTracks()[0].enabled;
  const node = document.querySelector(".mute-btn");

  if (enabled) {
    socket.emit("mute-mic");
    local_stream.getAudioTracks()[0].enabled = false;

    node.children[0].classList.remove("fa-microphone");
    node.children[0].classList.add("fa-microphone-slash");
    node.children[1].innerHTML = "Unmute";
  } else {
    socket.emit("unmute-mic");
    local_stream.getAudioTracks()[0].enabled = true;

    node.children[0].classList.remove("fa-microphone-slash");
    node.children[0].classList.add("fa-microphone");
    node.children[1].innerHTML = "Mute";
  }
};

const handleVideo = () => {
  const enabled = local_stream.getVideoTracks()[0].enabled;
  const node = document.querySelector(".video-btn");

  if (enabled) {
    socket.emit("stop-video");
    local_stream.getVideoTracks()[0].enabled = false; //stop sharing my video

    node.children[0].classList.remove("fa-video");
    node.children[0].classList.add("fa-video-slash");
    node.children[1].innerHTML = "Play Video";
  } else {
    socket.emit("play-video");
    local_stream.getVideoTracks()[0].enabled = true;

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
  

  
