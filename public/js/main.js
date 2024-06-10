const socket = io();

const chat = document.getElementById('chat');
const messageInput = document.getElementById('message');
const sendButton = document.getElementById('send');
const nextButton = document.getElementById('next');
const loader = document.getElementById('loader');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream = new MediaStream();
let peerConnection;

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

async function startVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        socket.emit('next');
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    socket.emit('chat message', message);
    messageInput.value = '';
});

nextButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    chat.innerHTML = '';
    loader.style.display = 'block';
    socket.emit('next');
});

socket.on('chat message', (data) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${data.sender}: ${data.message}`;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;
});

socket.on('waiting for partner', () => {
    loader.style.display = 'block';
});

socket.on('partner found', () => {
    loader.style.display = 'none';
    const messageElement = document.createElement('div');
    messageElement.textContent = 'Connected to a new partner.';
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;

    if (!peerConnection) createPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
});

socket.on('partner disconnected', () => {
    const messageElement = document.createElement('div');
    messageElement.textContent = 'Partner has disconnected.';
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    loader.style.display = 'block';
    socket.emit('next');
});

socket.on('signal', async (data) => {
    if (data.type === 'new-peer') {
        if (!peerConnection) createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { type: 'offer', offer });
    } else if (data.type === 'offer') {
        if (!peerConnection) createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { type: 'answer', answer });
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'ice-candidate') {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
            console.error('Error adding received ice candidate', error);
        }
    }
});

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { type: 'ice-candidate', candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        remoteStream.addTrack(event.track);
        remoteVideo.srcObject = remoteStream;
    };
}

startVideo();
