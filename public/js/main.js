const socket = io('http://localhost:3000');
let myPeer;
let myStream;
let userStream;
const myVideo = document.getElementById('my-video');
const userVideo = document.getElementById('user-video');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const nextButton = document.getElementById('next-button');

async function init() {
  myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  myVideo.srcObject = myStream;
  myPeer = new SimplePeer({
    initiator: true,
    stream: myStream,
    trickle: false
  });

  myPeer.on('signal', data => {
    socket.emit('send-signal', roomId, data);
  });

  myPeer.on('stream', stream => {
    userVideo.srcObject = stream;
  });

  socket.on('receive-signal', signal => {
    myPeer.signal(signal);
  });

  socket.on('user-connected', userId => {
    myPeer = new SimplePeer({
      initiator: false,
      stream: myStream,
      trickle: false
    });

    myPeer.on('signal', data => {
      socket.emit('send-signal', roomId, data);
    });

    myPeer.on('stream', stream => {
      userVideo.srcObject = stream;
    });
  });

  socket.on('receive-message', message => {
    const msgElement = document.createElement('div');
    msgElement.textContent = message;
    chatBox.appendChild(msgElement);
  });

  sendButton.addEventListener('click', () => {
    const message = chatInput.value;
    socket.emit('send-message', roomId, message);
    chatInput.value = '';
    const msgElement = document.createElement('div');
    msgElement.textContent = 'You: ' + message;
    chatBox.appendChild(msgElement);
  });

  nextButton.addEventListener('click', () => {
    location.reload();
  });
}

const roomId = 'some-room-id';
socket.emit('join-room', roomId, socket.id);
init();
