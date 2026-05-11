import { connect } from "https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.min.js";

let room = null;
let emotionInterval = null;
let emotionHistory = [];
let interviewActive = false;

const startBtn = document.getElementById("start");
const endBtn = document.getElementById("end");
const exportBtn = document.getElementById("export");
const emotionSpan = document.getElementById("emotion");
const video = document.getElementById("video");

// Simple mock emotion detection using webcam + random labels
async function startEmotionDetection() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;

    const emotions = ["Calm", "Stressed", "Engaged", "Bored", "Neutral"];

    emotionInterval = setInterval(() => {
      if (!interviewActive) return;
      const emotion = emotions[Math.floor(Math.random() * emotions.length)];
      const timestamp = new Date().toLocaleTimeString();
      emotionSpan.textContent = `${emotion} (${timestamp})`;
      emotionHistory.push({ emotion, timestamp });
    }, 3000);
  } catch (err) {
    console.error("Could not access camera:", err);
    emotionSpan.textContent = "Camera unavailable";
  }
}

function stopEmotionDetection() {
  if (emotionInterval) clearInterval(emotionInterval);
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}

// Start Interview
startBtn.addEventListener("click", async () => {
  try {
    startBtn.disabled = true;
    emotionSpan.textContent = "Connecting...";

    // 1. Get a token from LiveKit
    const token = await getToken();

    // 2. Connect to your LiveKit room
    room = await connect(
      "wss://exit-interview-agent-1lo01a7d.livekit.cloud",
      token
    );

    console.log("Connected to room:", room.name);

    // 3. Dispatch the agent through your backend
    await fetch("http://localhost:8000/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: "Interview_Agent",
        identity: "exit-agent",
        roomName: room.name
      })
    });

    console.log("Agent dispatched!");
    interviewActive = true;
    endBtn.disabled = false;
    exportBtn.disabled = false;

    // 4. Start mock emotion detection
    await startEmotionDetection();
  } catch (err) {
    console.error(err);
    emotionSpan.textContent = "Error starting interview";
    startBtn.disabled = false;
  }
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
  if (emotionHistory.length === 0) {
    doc.text("No emotion data recorded.", 10, y);
  } else {
    emotionHistory.forEach((entry) => {
      doc.text(`${entry.timestamp} - ${entry.emotion}`, 10, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
  }

  doc.save("exit-interview-summary.pdf");
});

// Function to get a LiveKit token
async function getToken() {
  const res = await fetch(
    "https://exit-interview-agent-1lo01a7d.livekit.cloud/api/rooms/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_PUBLIC_LIVEKIT_TOKEN"
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

