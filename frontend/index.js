const API_URL = "https://ai-reel-studio-production.up.railway.app";

async function generateVideo() {
  const idea = document.getElementById("idea").value;
  const status = document.getElementById("status");
  const result = document.getElementById("result");

  status.innerText = "⏳ Generating...";
  result.innerHTML = "";

  try {
    const res = await fetch(`${API_URL}/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    status.innerText = "✅ Video ready";

    const video = document.createElement("video");
    video.src = data.video;
    video.controls = true;
    video.width = 300;

    const script = document.createElement("p");
    script.innerText = data.script;

    result.appendChild(video);
    result.appendChild(script);

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Failed";
  }
}