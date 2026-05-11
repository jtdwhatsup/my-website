import {
  connect,
  RoomEvent,
  createLocalVideoTrack
} from "https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.min.js";

let room = null;
let emotionInterval = null;
let emotionHistory = [];
let interviewActive = false;

const startBtn = document.getElementById("start");
const endBtn = document.getElementById("end");
const exportBtn = document.getElementById("export");
const emotionSpan = document.getElementById("emotion");
const localVideo = document.getElementById("localVideo");
const agentVideo = document.getElementById("agentVideo");

// Connect to LiveKit
async function connectToRoom() {
  const token = await getToken();

  room = await connect(
    "wss://exit-interview-agent-1lo01a7d.livekit.cloud",
    token
  );

  console.log("Connected to room:", room.name);

  // Show agent video when they join
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (participant.identity === "exit-agent" && track.kind === "video") {
      track.attach(agentVideo);
    }
  });

  // Publish your camera
  const videoTrack = await createLocalVideoTrack();
  localVideo.srcObject = new MediaStream([videoTrack.mediaStreamTrack]);
  await room.localParticipant.publishTrack(videoTrack);

  return room.name;
}

// Start mock emotion detection
function startEmotionDetection() {
  const emotions = ["Calm", "Stressed", "Engaged", "Neutral", "Bored"];

  emotionInterval = setInterval(() => {
    if (!interviewActive) return;
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const timestamp = new Date().toLocaleTimeString();
    emotionSpan.textContent = `${emotion} (${timestamp})`;
    emotionHistory.push({ emotion, timestamp });
  }, 3000);
}

function stopEmotionDetection() {
  if (emotionInterval) clearInterval(emotionInterval);
}

// Start Interview
startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;

  const roomName = await connectToRoom();

  // Dispatch agent through backend
  await fetch("http://localhost:8000/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentName: "Interview_Agent",
      identity: "exit-agent",
      roomName
    })
  });

  console.log("Agent dispatched!");

  interviewActive = true;
  endBtn.disabled = false;
  exportBtn.disabled = false;

  startEmotionDetection();
});

// End Interview
endBtn.addEventListener("click", async () => {
  interviewActive = false;
  endBtn.disabled = true;

  if (room) {
    await room.disconnect();
    room = null;
  }

  stopEmotionDetection();
  emotionSpan.textContent = "Interview ended";
  startBtn.disabled = false;
});

// Export PDF Summary
exportBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Exit Interview Summary", 10, 20);

  doc.setFontSize(12);
  doc.text("Emotion Timeline:", 10, 35);

  let y = 45;
  emotionHistory.forEach((entry) => {
    doc.text(`${entry.timestamp} - ${entry.emotion}`, 10, y);
    y += 7;
  });

  doc.save("exit-interview-summary.pdf");
});

// Get LiveKit token
async function getToken() {
  const res = await fetch(
    "https://exit-interview-agent-1lo01a7d.livekit.cloud/api/rooms/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer APIfyhwkLhJHKjX"
      },
      body: JSON.stringify({
        roomName: "exit-interview",
        identity: "user-" + Math.floor(Math.random() * 10000)
      })
    }
  );

  const data = await res.json();
  return data.token;
}
