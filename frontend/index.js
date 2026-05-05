// 🔥 CONFIG — YOUR BACKEND URL
const API_URL = "https://ai-reel-studio-production.up.railway.app/generate-video";

// 🎯 ELEMENTS
const generateBtn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const videoContainer = document.getElementById("videoContainer");
const statusText = document.getElementById("statusText");

// 🎬 CLICK HANDLER
generateBtn.addEventListener("click", async () => {
  const idea = input.value.trim();

  if (!idea) {
    alert("Enter an idea first");
    return;
  }

  console.log("🔥 Sending prompt:", idea);

  // UI reset
  statusText.innerText = "⏳ Generating video...";
  videoContainer.innerHTML = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: idea // ✅ FIXED KEY
      })
    });

    console.log("📡 Status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Server error:", errText);
      statusText.innerText = "❌ Failed to generate video";
      return;
    }

    const data = await res.json();
    console.log("✅ Response:", data);

    if (!data.videoUrl) {
      statusText.innerText = "❌ No video returned";
      return;
    }

    // 🎥 CREATE VIDEO
    const video = document.createElement("video");
    video.src = data.videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.muted = true; // autoplay fix
    video.playsInline = true;
    video.style.width = "100%";
    video.style.borderRadius = "12px";

    videoContainer.innerHTML = "";
    videoContainer.appendChild(video);

    statusText.innerText = "✅ Video ready";

  } catch (err) {
    console.error("❌ Fetch error:", err);
    statusText.innerText = "❌ Network error";
  }
});