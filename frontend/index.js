const API = "https://ai-reel-studio-production.up.railway.app";

async function generate() {
  const prompt = document.getElementById("prompt").value;

  if (!prompt) return alert("Enter a topic");

  const feed = document.getElementById("feed");
  feed.innerHTML = "<div class='loading'>Generating...</div>";

  try {
    const res = await fetch(API + "/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    feed.innerHTML = "";

    data.results.forEach(item => {
      const card = document.createElement("div");
      card.className = "video-card";

      const vid = document.createElement("video");
      vid.src = item.videoUrl;
      vid.muted = true;
      vid.loop = true;

      const caption = document.createElement("div");
      caption.className = "caption";
      caption.innerText = item.caption;

      const download = document.createElement("a");
      download.href = item.videoUrl;
      download.innerText = "⬇";
      download.className = "download";

      card.appendChild(vid);
      card.appendChild(caption);
      card.appendChild(download);

      feed.appendChild(card);
    });

    setupAutoPlay();

  } catch (err) {
    console.error(err);
    feed.innerHTML = "Error ❌";
  }
}

function setupAutoPlay() {
  const videos = document.querySelectorAll("video");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.play();
        } else {
          entry.target.pause();
        }
      });
    },
    { threshold: 0.6 }
  );

  videos.forEach(video => observer.observe(video));
}

window.generate = generate;