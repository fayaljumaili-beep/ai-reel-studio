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

aasync function generate() {
  const video = document.getElementById("video");
  const audio = document.getElementById("audio");
  const status = document.getElementById("status");
  const btn = document.getElementById("generateBtn");

  btn.disabled = true;
  status.innerText = "Generating...";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video");
    const data = await res.json();

    console.log("DATA:", data); // 👈 debug

    const ts = Date.now();

    video.src = `${data.video}?t=${ts}`;
    audio.src = `${data.audio}?t=${ts}`;

    video.style.display = "block"; // 👈 make sure visible

    await video.load();
    await audio.load();

    status.innerText = "Done ✅";

  } catch (err) {
    console.error(err); // 👈 SEE REAL ERROR
    status.innerText = "Error generating";
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