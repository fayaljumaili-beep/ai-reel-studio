const API_URL = "https://ai-reel-studio-production.up.railway.app";

document.getElementById("generateBtn").addEventListener("click", generateVideo);

async function generateVideo() {
  console.log("CLICKED"); // 🧪 debug

  const idea = document.getElementById("idea").value;
  const status = document.getElementById("status");
  const result = document.getElementById("result");

  if (!idea) {
    status.innerText = "❌ Please enter an idea";
    return;
  }

  status.innerText = "⏳ Generating...";
  result.innerHTML = "";

  try {
    const res = await fetch(`${API_URL}/generate-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea }), // ✅ MUST be "idea"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed");
    }

    console.log(data);

    status.innerText = "✅ Video ready";

    // 🎬 Create video element
    const video = document.createElement("video");
    video.src = data.video;
    video.controls = true;
    video.autoplay = true;

    // 🧠 Show script (optional but cool)
    const script = document.createElement("p");
    script.innerText = data.script;

    result.appendChild(video);
    result.appendChild(script);

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error generating video";
  }
}