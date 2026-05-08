const API_BASE = "https://ai-reel-studio-production.up.railway.app";

const btn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const video = document.getElementById("videoPlayer");
const status = document.getElementById("status");

let pollTimer = null;
let currentVideoUrl = null;
let downloadBtn = null;

function ensureDownloadButton() {
  if (downloadBtn) return downloadBtn;

  downloadBtn = document.createElement("button");
  downloadBtn.id = "downloadBtn";
  downloadBtn.textContent = "⬇ Download reel";
  downloadBtn.style.display = "none";
  downloadBtn.style.marginTop = "12px";
  downloadBtn.style.padding = "10px 14px";
  downloadBtn.style.border = "none";
  downloadBtn.style.borderRadius = "10px";
  downloadBtn.style.background = "#ffffff";
  downloadBtn.style.color = "#000000";
  downloadBtn.style.cursor = "pointer";
  downloadBtn.style.fontWeight = "600";

  downloadBtn.onclick = async () => {
    if (!currentVideoUrl) return;

    downloadBtn.disabled = true;
    downloadBtn.textContent = "⏬ Preparing download...";

    try {
      const res = await fetch(currentVideoUrl);
      if (!res.ok) throw new Error("Could not fetch video");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ai-reel-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(blobUrl);
      downloadBtn.textContent = "⬇ Download reel";
    } catch (err) {
      console.error(err);
      downloadBtn.textContent = "⬇ Download reel";
      alert("Download failed. Please try again.");
    } finally {
      downloadBtn.disabled = false;
    }
  };

  status.insertAdjacentElement("afterend", downloadBtn);
  return downloadBtn;
}

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

  currentVideoUrl = null;
  const existingDownloadBtn = document.getElementById("downloadBtn");
  if (existingDownloadBtn) existingDownloadBtn.style.display = "none";

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
    status.innerText = "⏳ Rendering...";

    const poll = async () => {
      const check = await fetch(`${API_BASE}/status/${jobId}`);
      const result = await check.json();

      if (result.status === "done") {
        currentVideoUrl = `${API_BASE}${result.videoUrl}`;
        video.src = currentVideoUrl;
        video.style.display = "block";
        video.load();
        status.innerText = "✅ Video ready";
        btn.disabled = false;

        const btnEl = ensureDownloadButton();
        btnEl.style.display = "inline-block";
        btnEl.textContent = "⬇ Download reel";
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