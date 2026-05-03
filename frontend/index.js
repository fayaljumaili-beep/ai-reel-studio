const video = document.getElementById("video");
const audio = document.getElementById("audio");
const captions = document.getElementById("captions");
const status = document.getElementById("status");
const btn = document.getElementById("generateBtn");

async function waitForMedia(video, audio, timeout = 5000) {
  return new Promise((resolve) => {
    let loaded = 0;

    function done() {
      loaded++;
      if (loaded >= 2) resolve();
    }

    video.onloadeddata = done;
    audio.oncanplaythrough = done;

    setTimeout(() => {
      console.warn("Media timeout → forcing start");
      resolve();
    }, timeout);
  });
}

async function generate() {
  const prompt = document.getElementById("prompt").value;

  btn.disabled = true;
  status.innerText = "⚡ Generating...";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    const ts = Date.now();

    video.src = `${data.video}?t=${ts}`;
    audio.src = `${data.audio}?t=${ts}`;

    video.load();
    audio.load();

    await waitForMedia(video, audio);

    video.currentTime = 0;
    audio.currentTime = 0;

    try {
      await audio.play();
      await video.play();
    } catch {
      status.innerText = "👉 Tap video to play";
      video.onclick = () => {
        video.play();
        audio.play();
      };
    }

    status.innerText = "▶ Playing";

    startCaptions(data.script);

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Error generating";
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

  audio.ontimeupdate = () => {
    const index = Math.floor(audio.currentTime * 2.5);

    spans.forEach((span, i) => {
      span.classList.toggle("active", i === index);

      // show only nearby words (clean UI)
      span.style.display =
        i >= index - 3 && i <= index + 3 ? "inline" : "none";
    });
  };
}