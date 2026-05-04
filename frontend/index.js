const API = "https://ai-reel-studio-production.up.railway.app";

async function generate() {
  const prompt = document.getElementById("prompt").value;
  const scenario = document.getElementById("scenario").value;
  const theme = document.getElementById("theme").value;
  const voice = document.getElementById("voice").value;

  const feed = document.getElementById("feed");

  feed.innerHTML = "Generating...";

  const res = await fetch(`${API}/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, scenario, theme, voice })
  });

  const data = await res.json();
  feed.innerHTML = "";

  data.results.forEach(item => {
    const card = document.createElement("div");
    card.className = "video-card";

    const vid = document.createElement("video");
    vid.src = item.videoUrl;
    vid.controls = true;

    const hook = document.createElement("div");
    hook.className = "hook";
    hook.innerText = item.hook;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerText = item.caption;

    card.appendChild(vid);
    card.appendChild(hook);
    card.appendChild(meta);

    feed.appendChild(card);
  });
}

window.generate = generate;