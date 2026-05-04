async function generate() {
  const prompt = document.getElementById("prompt").value;
  const status = document.getElementById("status");
  const container = document.getElementById("videos");
  const btn = document.getElementById("generateBtn");

  container.innerHTML = "";
  status.innerText = "Generating viral reels...";
  btn.disabled = true;

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (!data.videos) {
      throw new Error("No videos returned");
    }

    data.videos.forEach(v => {
      const card = document.createElement("div");
      card.className = "card";

      const video = document.createElement("video");
      video.src = v.videoUrl;
      video.controls = true;

      const caption = document.createElement("p");
      caption.className = "caption";
      caption.innerText = v.caption;

      const download = document.createElement("a");
      download.href = v.videoUrl;
      download.innerText = "Download";
      download.className = "download";
      download.download = "reel.mp4";

      card.appendChild(video);
      card.appendChild(caption);
      card.appendChild(download);

      container.appendChild(card);
    });

    status.innerText = "Done 🚀";
    btn.disabled = false;

  } catch (err) {
    console.error(err);
    status.innerText = "Error generating video ❌";
    btn.disabled = false;
  }
}