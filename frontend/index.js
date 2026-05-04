const API = "https://ai-reel-studio-production.up.railway.app";

async function generate() {
  const prompt = document.getElementById("prompt").value;
  const feed = document.getElementById("feed");

  feed.innerHTML = "Loading...";

  const res = await fetch(`${API}/generate-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();

  feed.innerHTML = "";

  // 🔥 HANDLE BOTH CASES (single OR multiple)
  const videos = data.videos || [data];

  videos.forEach(video => {
    const card = document.createElement("div");
    card.className = "video-card";

    const vid = document.createElement("video");
    vid.src = video.videoUrl;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = false;
    vid.playsInline = true;

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.innerText = video.caption;

    const download = document.createElement("a");
    download.className = "download";
    download.href = video.videoUrl;
    download.innerText = "⬇";
    download.download = "";

    card.appendChild(vid);
    card.appendChild(caption);
    card.appendChild(download);

    feed.appendChild(card);
  });
}}