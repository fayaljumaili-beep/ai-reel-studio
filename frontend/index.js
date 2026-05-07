const API_BASE = "https://ai-reel-studio-production.up.railway.app";

const btn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const video = document.getElementById("videoPlayer");
const status = document.getElementById("status");

let activeJobId = null;
let pollTimer = null;

btn.onclick = async () => {
  const idea = input.value.trim();

  if (!idea) {
    status.innerText = "❌ Please enter an idea";
    return;
  }

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  activeJobId = null;
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

    activeJobId = data.jobId;
    status.innerText = "⏳ Rendering...";

    const poll = async () => {
      const check = await fetch(`${API_BASE}/status/${activeJobId}`);
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

      pollTimer = setTimeout(poll, 2000);
    };

    poll();
  } catch (err) {
    console.error(err);
    status.innerText = `❌ Failed to generate video: ${err.message}`;
    btn.disabled = false;
  }
};