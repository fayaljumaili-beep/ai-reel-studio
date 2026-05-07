const API_BASE = "https://ai-reel-studio-production.up.railway.app";

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

  btn.disabled = true;
  status.innerText = "⏳ Generating...";
  video.style.display = "none";
  video.removeAttribute("src");
  video.load();

  try {
    const res = await fetch(`${API_BASE}/generate-video`, {
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

    const jobId = data.jobId;

    const poll = async () => {
      const check = await fetch(`${API_BASE}/status/${jobId}`);
      const result = await check.json();

      if (result.status === "done") {
        video.src = `${API_BASE}${result.videoUrl}`;
        video.style.display = "block";
        video.load();
        status.innerText = "✅ Video ready";
        btn.disabled = false;
        return;
      }

      if (result.status === "error") {
        throw new Error(result.error || "Render failed");
      }

      setTimeout(poll, 3000);
    };

    poll();
  } catch (err) {
    console.error(err);
    status.innerText = `❌ Failed to generate video: ${err.message}`;
    btn.disabled = false;
  }
};