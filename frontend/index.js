async function generate() {
  const prompt = document.getElementById("prompt").value;
  const theme = document.getElementById("theme").value;
  const scenario = document.getElementById("scenario").value;
  const emotion = document.getElementById("emotion").value;
  const duration = document.getElementById("duration").value;

  const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      theme,
      scenario,
      emotion,
      duration
    })
  });

  const data = await res.json();

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  data.videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "video-card";

    const vid = document.createElement("video");
    vid.src = v.videoUrl;
    vid.loop = true;
    vid.muted = true;
    vid.autoplay = true;

    const overlay = document.createElement("div");
    overlay.className = "overlay";

    overlay.innerHTML = `
      <div class="hook">${v.hook || ""}</div>
      <div class="caption">${v.caption || ""}</div>
    `;

    card.appendChild(vid);
    card.appendChild(overlay);
    feed.appendChild(card);
  });

  // 🎯 AUTO PLAY ONLY ACTIVE VIDEO
  const videos = document.querySelectorAll("video");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.play();
      } else {
        entry.target.pause();
      }
    });
  }, { threshold: 0.6 });

  videos.forEach(v => observer.observe(v));
}