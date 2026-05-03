const video = document.getElementById("video");
const audio = document.getElementById("audio");
const captions = document.getElementById("captions");
const status = document.getElementById("status");

async function generate() {
  const prompt = document.getElementById("prompt").value;

  status.innerText = "⚡ Generating...";

  try {
    const res = await fetch(
      "https://ai-reel-studio-production.up.railway.app/generate-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await res.json();

    // 🔄 Force refresh (avoid cache issues)
    const timestamp = Date.now();

    video.src = `${window.location.origin}/output.mp4?t=${timestamp}`;
    audio.src = `${data.audio}?t=${timestamp}`;

    video.load();
    audio.load();

    video.currentTime = 0;
    audio.currentTime = 0;

    // ⏳ Wait for both media to be ready
    await Promise.all([
      new Promise((resolve) => (video.onloadeddata = resolve)),
      new Promise((resolve) => (audio.oncanplaythrough = resolve)),
    ]);

    // ▶️ Start both together
    video.muted = true;

    try {
      await video.play();
      await audio.play();
    } catch {
      status.innerText = "👉 Tap to play";

      video.onclick = () => {
        video.play();
        audio.play();
      };
    }

    status.innerText = "✅ Playing";

    // 📝 Show captions
    showCaptions(data.script);
  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error generating video";
  }
}

function showCaptions(text) {
  captions.innerHTML = "";

  const words = text.split(" ");

  words.forEach((word) => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word + " "; // 👈 spacing fix
    captions.appendChild(span);
  });

  const spans = document.querySelectorAll(".word");

  let index = 0;

  const interval = setInterval(() => {
    if (index < spans.length) {
      spans[index].classList.add("active");
      index++;
    } else {
      clearInterval(interval);
    }
  }, 350); // adjust speed if needed
}