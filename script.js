import { connect } from "https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.min.js";

document.getElementById("start").addEventListener("click", async () => {
  console.log("Starting interview...");

  // 1. Get a token from LiveKit
  const token = await getToken();

  // 2. Connect to your LiveKit room
  const room = await connect(
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
      roomName: "exit-interview"
    })
  });

  console.log("Agent dispatched!");
});

// Function to get a LiveKit token
async function getToken() {
  const res = await fetch(
    "https://exit-interview-agent-1lo01a7d.livekit.cloud/api/rooms/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "APIfyhwkLhJHKjX"
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
