



/* CREATING COMMON PATH (URL) FOR DOCTORS AND PATIENTS */
if (!location.hash) {
  //location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  location.hash = "drpt";

}

/* SET HASH PATH */
const commonHashUrl = location.hash.substring(1);

/* Creating object of ScaleDrone JS */
const drone = new ScaleDrone('T5gCUPYd3dFuimGa');

/* Setting STUN as communication server */
const roomName = 'observable-' + commonHashUrl;
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};
let room;
let pc;

/* Delecting Succuss or Error */
function onSuccess() {};
function onError(error) {
  console.error(error);
};

drone.on('open', error => {
  if (error) {
    return console.error(error);
  }

  /* Opening socket and subcribe to the room */
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });
  
  /* Offering connection to two members */
  room.on('members', members => {
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

/* Publishing via Scaledrone */
function sendMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {
  pc = new RTCPeerConnection(configuration);

  
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
  }

  /* Displaying the remote video stream */
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  /* Taking premission to access of the media */
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    // Display local video in #localVideo element (video tag in html)
    localVideo.srcObject = stream;
    

    // sending stream to the peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);

 
  
  // Signaling from Scaledragon
  room.on('data', (message, client) => {
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      
      /* Ansering to peer */
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        
        /* Checking before answering */
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new remote connection
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }
  });
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}
