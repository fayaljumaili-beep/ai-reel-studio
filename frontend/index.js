const video = document.getElementById("video");
const audio = document.getElementById("audio");
const captions = document.getElementById("captions");
const status = document.getElementById("status");

async function generate() {
  const prompt = document.getElementById("prompt").value;

  status.innerText = "⚡ Generating...";

  try {
    // 🔥 CALL YOUR BACKEND
    const res = await fetch(
      "https://ai-reel-studio-production.up.railway.app/generate-video",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await res.json();

    // 🔥 FORCE REFRESH (VERY IMPORTANT)
    const timestamp = Date.now();

    video.src =
      "https://ai-reel-studio-production.up.railway.app/output.mp4?" +
      timestamp;

    audio.src = data.audio + "?" + timestamp;

    video.load();
    audio.load();

    // 🔥 WAIT UNTIL BOTH READY
    await Promise.all([
      new Promise((res) => (video.onloadeddata = res)),
      new Promise((res) => (audio.oncanplaythrough = res)),
    ]);

    // 🔥 START TOGETHER
    video.currentTime = 0;
    audio.currentTime = 0;

    await audio.play();
    await video.play();

    status.innerText = "✅ Playing";

    showCaptions(data.script);
  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error generating video";
  }
}

// 🎯 CAPTIONS (FIXED SPACING)
function showCaptions(text) {
  captions.innerHTML = "";

  const words = text.split(" ");

  let currentLine = document.createElement("div");
  currentLine.className = "line";
  captions.appendChild(currentLine);

  const spans = [];

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word;
    currentLine.appendChild(span);
    spans.push(span);

    // 🔥 break line every 6 words (TikTok style)
    if ((index + 1) % 6 === 0) {
      currentLine = document.createElement("div");
      currentLine.className = "line";
      captions.appendChild(currentLine);
    }
  });

  let i = 0;

  const interval = setInterval(() => {
    if (i < spans.length) {
      spans[i].classList.add("active");

      // 🔥 auto scroll effect (only show recent lines)
      if (i > 6) {
        spans[i - 6].classList.remove("active");
      }

      i++;
    } else {
      clearInterval(interval);
    }
  }, 300);
}