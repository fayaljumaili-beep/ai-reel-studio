const API = "https://ai-reel-studio-production.up.railway.app/generate-video";

async function generate() {
  console.log("🔥 Generate clicked");

  const promptEl = document.getElementById("prompt");
  const scenarioEl = document.getElementById("scenario");
  const toneEl = document.getElementById("tone");
  const feed = document.getElementById("feed");

  const prompt = promptEl?.value || "";
  const scenario = scenarioEl?.value || "";
  const tone = toneEl?.value || "";

  const fullPrompt = `${prompt} in a ${scenario} style with ${tone} tone`;

  // 🧠 UI loading state
  feed.innerHTML = `
    <div style="color:white; text-align:center; padding:20px;">
      ⏳ Generating viral video...
    </div>
  `;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!res.ok) {
      throw new Error("Server error");
    }

    const data = await res.json();

    console.log("✅ Response:", data);

    renderVideo(data);

  } catch (err) {
    console.error("❌ ERROR:", err);

    feed.innerHTML = `
      <div style="color:red; text-align:center;">
        ❌ Failed to generate video
      </div>
    `;
  }
}

function renderVideo(data) {
  const feed = document.getElementById("feed");

  feed.innerHTML = "";

  const card = document.createElement("div");
  card.style.marginTop = "20px";

  // 🎬 VIDEO
  const video = document.createElement("video");
  video.src = data.video;
  video.controls = true;
  video.autoplay = true;
  video.loop = true;
  video.style.width = "100%";
  video.style.borderRadius = "12px";

  // 📝 SCRIPT TEXT
  const script = document.createElement("p");
  script.innerText = data.script || "";
  script.style.color = "white";
  script.style.marginTop = "10px";
  script.style.fontSize = "14px";
  script.style.lineHeight = "1.5";

  card.appendChild(video);
  card.appendChild(script);

  feed.appendChild(card);
}