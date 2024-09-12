const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const viewerCountDisplay = document.getElementById('viewer-count');
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001',
  debug: 3 // Enable detailed debugging for PeerJS
});

const myVideo = document.createElement('video');
myVideo.muted = true; // Mute the local video stream
const peers = {};
let streamRole = 'viewer'; // Default role as viewer

// Function to get user media
async function getUserMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    console.log('Stream obtained:', stream); // Log the stream to check if it's being captured
    addVideoStream(myVideo, stream, true); // Show your own video stream
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    alert('Could not access camera or microphone. Please check your permissions or ensure no other application is using the camera.');
    return null;
  }
}

getUserMedia().then(stream => {
  if (!stream) return; // Exit if there was an error

  myPeer.on('call', call => {
    console.log('Incoming call from:', call.peer); // Log the peer ID of the incoming call
    call.answer(stream); // Answer the call with your stream (only for streamer)
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    call.on('error', error => {
      console.error('Error in call:', error);
    });
  });

  socket.on('user-connected', userId => {
    console.log("USER CONNECTED", userId);
    connectToNewUser(userId, stream);
  });

  socket.on('update-viewer-count', count => {
    viewerCountDisplay.innerText = `Viewers: ${count}`;
  });
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
  console.log(`USER DISCONNECTED ${userId}`);
});

myPeer.on('open', id => {
  console.log('Peer ID:', id);
  socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  if (streamRole === 'viewer') {
    console.log('Attempting to call user:', userId);
    const call = myPeer.call(userId, null); // Viewers do not send their stream

    if (call) { // Check if call is not undefined
      console.log('Call object created successfully for user:', userId);
      const video = document.createElement('video');
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
      });
      call.on('close', () => {
        video.remove();
      });
      call.on('error', error => {
        console.error('Error in call with user:', userId, error);
      });
      peers[userId] = call;
    } else {
      console.error('Failed to initiate call with user:', userId);
    }
  }
}

function addVideoStream(video, stream, isLocal = false) {
  if (isLocal) {
    video.muted = true; // Mute only the local video stream (for the streamer)
  } else {
    video.muted = false; // Ensure remote video (viewer/streamer) has audio enabled
  }

  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play().catch(error => {
      console.error('Error playing video:', error);
    });
  });

  videoGrid.append(video);
}
