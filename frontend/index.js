async function generate() {
  const prompt = document.getElementById("prompt").value;
  const video = document.getElementById("video");
  const status = document.getElementById("status");

  status.innerText = "🔥 Generating viral reel...";
  video.src = "";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      status.innerText = "Error ❌";
      return;
    }

    status.innerText = "Ready 🚀";

    const ts = Date.now();
    video.src = `${data.videoUrl}?t=${ts}`;
    video.load();
    video.play();

  } catch (err) {
    console.error(err);
    status.innerText = "Error ❌";
  }
}