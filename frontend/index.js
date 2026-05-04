const API = "https://ai-reel-studio-production.up.railway.app";

async function generate() {
  const prompt = document.getElementById("prompt").value;
  const feed = document.getElementById("feed");

  feed.innerHTML = "<p style='text-align:center'>Generating...</p>";

  const res = await fetch(`${API}/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();

  feed.innerHTML = "";

  data.results.forEach(item => {
    const card = document.createElement("div");
    card.className = "video-card";

    const vid = document.createElement("video");
    vid.src = item.videoUrl;
    vid.controls = true;
    vid.autoplay = true;
    vid.loop = true;

    const hook = document.createElement("div");
    hook.className = "hook";
    hook.innerText = item.hook;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerText = item.caption;

    const download = document.createElement("a");
    download.href = item.videoUrl;
    download.innerText = "⬇";
    download.className = "download";

    card.appendChild(vid);
    card.appendChild(hook);
    card.appendChild(meta);
    card.appendChild(download);

    feed.appendChild(card);
  });
}

// IMPORTANT FIX
window.generate = generate;