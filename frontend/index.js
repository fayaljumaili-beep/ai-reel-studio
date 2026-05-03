const video = document.getElementById("video");
const audio = document.getElementById("audio");
const captions = document.getElementById("captions");
const status = document.getElementById("status");
const btn = document.getElementById("generateBtn");

async function generate() {
  const prompt = document.getElementById("prompt").value;

  btn.disabled = true;
  status.innerText = "⚡ Generating...";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    // FORCE refresh (avoid cache)
    const ts = Date.now();

    video.src = `${window.location.origin}/output.mp4?t=${ts}`;
    audio.src = `${data.audio}?t=${ts}`;

    video.load();
    audio.load();

    // WAIT until both are ready
    await Promise.all([
      new Promise(res => video.onloadeddata = res),
      new Promise(res => audio.oncanplaythrough = res)
    ]);

    video.currentTime = 0;
    audio.currentTime = 0;

    await audio.play();
    await video.play();

    status.innerText = "▶ Playing";

    startCaptions(data.script);

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error";
  }

  btn.disabled = false;
}

function startCaptions(text) {
  captions.innerHTML = "";

  const words = text.split(" ");

  words.forEach(word => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word + " ";
    captions.appendChild(span);
  });

  const spans = document.querySelectorAll(".word");

  // 🔥 REAL SYNC USING AUDIO TIME
  audio.ontimeupdate = () => {
    const time = audio.currentTime;

    // adjust this divisor to control speed
    const index = Math.floor(time * 2.5);

    spans.forEach((span, i) => {
      span.classList.toggle("active", i === index);
    });

    // OPTIONAL: show only last few words (clean look)
    spans.forEach((span, i) => {
      span.style.display =
        i >= index - 3 && i <= index + 3 ? "inline" : "none";
    });
  };
}