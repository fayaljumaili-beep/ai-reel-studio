const video = document.getElementById("video");
const audio = document.getElementById("audio");
const captions = document.getElementById("captions");
const status = document.getElementById("status");

async function generate() {
  const prompt = document.getElementById("prompt").value;

  status.innerText = "⚡ Generating...";

  const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();

  // load assets
  video.src = `${window.location.origin}/output.mp4?t=${Date.now()}`;
  audio.src = data.audio;

  video.load();
  audio.load();

  video.currentTime = 0;
  audio.currentTime = 0;

  await Promise.all([
    new Promise(r => video.onloadeddata = r),
    new Promise(r => audio.oncanplaythrough = r)
  ]);

  try {
    video.muted = true;
    await video.play();
    await audio.play();
  } catch {
    status.innerText = "Tap to play";
    video.onclick = () => {
      video.play();
      audio.play();
    };
  }

  status.innerText = "✅ Playing";

  showCaptions(data.script);
}

function showCaptions(text) {
  captions.innerHTML = "";

  const words = text.split(" ");

  words.forEach(word => {
    const span = document.createElement("span");
    span.className = "word";
    span.innerText = word + " ";
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