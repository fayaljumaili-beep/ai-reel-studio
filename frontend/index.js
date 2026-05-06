const API_URL = "https://ai-reel-studio-production.up.railway.app/generate-video";

const btn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const video = document.getElementById("videoPlayer");
const status = document.getElementById("status");

btn.onclick = async () => {
  const idea = input.value;

  status.innerText = "⏳ Generating...";
  video.style.display = "none";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea }),
    });

    if (!res.ok) throw new Error("Failed request");

    // 🔥 THIS IS THE FIX
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    video.src = url;
    video.style.display = "block";

    status.innerText = "✅ Video ready";

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Failed to generate video";
  }
};