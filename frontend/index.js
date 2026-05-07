const API_URL = "https://ai-reel-studio-production.up.railway.app/generate-video";

const btn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const video = document.getElementById("videoPlayer");
const status = document.getElementById("status");

btn.onclick = async () => {
  const idea = input.value.trim();

  if (!idea) {
    status.innerText = "❌ Please enter an idea";
    return;
  }

  status.innerText = "⏳ Generating...";
  video.style.display = "none";
  video.removeAttribute("src");
  video.load();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: idea }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed request");
    }

    const videoUrl = new URL(data.videoUrl, API_URL).href;

    video.src = videoUrl;
    video.style.display = "block";
    video.load();

    status.innerText = "✅ Video ready";
  } catch (err) {
    console.error(err);
    status.innerText = `❌ Failed to generate video: ${err.message}`;
  }
};