const API_BASE = "https://ai-reel-studio-production.up.railway.app";

const btn = document.getElementById("generateBtn");
const input = document.getElementById("ideaInput");
const video = document.getElementById("videoPlayer");
const status = document.getElementById("status");

let pollTimer = null;
let currentVideoUrl = null;
let downloadBtn = null;

function setStatus(message) {
  status.innerText = message;
}

function ensureDownloadButton() {
  if (downloadBtn) return downloadBtn;

  downloadBtn = document.createElement("button");
  downloadBtn.id = "downloadBtn";
  downloadBtn.textContent = "⬇ Download reel";
  downloadBtn.style.display = "none";
  downloadBtn.style.marginTop = "14px";
  downloadBtn.style.padding = "12px 16px";
  downloadBtn.style.border = "none";
  downloadBtn.style.borderRadius = "14px";
  downloadBtn.style.background = "linear-gradient(135deg, #ff4fd8, #8b5cf6)";
  downloadBtn.style.color = "#fff";
  downloadBtn.style.cursor = "pointer";
  downloadBtn.style.fontWeight = "700";
  downloadBtn.style.boxShadow = "0 18px 40px rgba(139, 92, 246, 0.25)";

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

function hideDownloadButton() {
  const existing = document.getElementById("downloadBtn");
  if (existing) {
    existing.style.display = "none";
  }
}

function showDownloadButton() {
  const btnEl = ensureDownloadButton();
  btnEl.style.display = "inline-block";
  btnEl.textContent = "⬇ Download reel";
}

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.getAttribute("data-preset") || "";
    input.value = preset;
    input.focus();
  });
});

btn.onclick = async () => {
  const idea = input.value.trim();

  if (!idea) {
    setStatus("❌ Please enter an idea");
    return;
  }

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  currentVideoUrl = null;
  hideDownloadButton();

  btn.disabled = true;
  setStatus("⏳ Generating...");
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
    setStatus("⏳ Rendering...");

    const poll = async () => {
      const check = await fetch(`${API_BASE}/job/${jobId}`);
      const result = await check.json();

      if (result.status === "done") {
        const separator = result.videoUrl.includes("?") ? "&" : "?";
        currentVideoUrl = `${API_BASE}${result.videoUrl}${separator}t=${Date.now()}`;

        video.src = currentVideoUrl;
        video.style.display = "block";
        video.load();

        video.onloadeddata = () => {
          video.play().catch(() => {});
        };

        setStatus("✅ Video ready");
        btn.disabled = false;
        showDownloadButton();
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
    setStatus(`❌ Failed to generate video: ${err.message}`);
    btn.disabled = false;
  }
};