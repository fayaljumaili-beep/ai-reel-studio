const API = "https://ai-reel-studio-production.up.railway.app";

async function generate() {
  const prompt = document.getElementById("prompt").value;

  if (!prompt) return alert("Enter a topic");

  const feed = document.getElementById("feed");
  feed.innerHTML = "Loading...";

  try {
    const res = await fetch(API + "/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    feed.innerHTML = "";

    const card = document.createElement("div");
    card.className = "video-card";

    const vid = document.createElement("video");
    vid.src = data.videoUrl;
    vid.controls = true;
    vid.autoplay = true;
    vid.loop = true;

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.innerText = data.caption;

    const download = document.createElement("a");
    download.href = data.videoUrl;
    download.innerText = "⬇";
    download.className = "download";

    card.appendChild(vid);
    card.appendChild(caption);
    card.appendChild(download);

    feed.appendChild(card);

  } catch (err) {
    console.error(err);
    feed.innerHTML = "Error ❌";
  }
}

window.generate = generate;