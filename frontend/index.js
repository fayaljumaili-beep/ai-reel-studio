const API = "https://ai-reel-studio-production.up.railway.app/generate-video";

async function generate() {
  const prompt = document.getElementById("prompt").value;
  const scenario = document.getElementById("scenario").value;
  const tone = document.getElementById("tone").value;

  const fullPrompt = `${prompt} in a ${scenario} style with ${tone} tone`;

  const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
  prompt: fullPrompt,
  tone: selectedTone,
  length: 30
})
  });

  const data = await res.json();

  renderVideo(data);
}

function renderVideo(data) {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  const card = document.createElement("div");
  card.className = "video-card";

  const vid = document.createElement("video");
  vid.src = `${data.video}`;
  vid.controls = true;
  vid.autoplay = true;

  const caption = document.createElement("div");
  caption.className = "caption";
  caption.innerText = data.script;

  card.appendChild(vid);
  card.appendChild(caption);

  feed.appendChild(card);
}