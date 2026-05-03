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

  words.forEach((word) => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word + " "; // 🔥 THIS FIXES YOUR SPACING
    captions.appendChild(span);
  });

  const spans = document.querySelectorAll(".word");

  let i = 0;

  const interval = setInterval(() => {
    if (i < spans.length) {
      spans[i].classList.add("active");
      i++;
    } else {
      clearInterval(interval);
    }
  }, 350);
}