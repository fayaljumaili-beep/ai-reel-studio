async function generate() {
  const idea = document.getElementById("idea").value;
  const status = document.getElementById("status");
  const video = document.getElementById("video");

  status.innerText = "⏳ Generating...";
  video.src = "";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    video.src = data.video;
    status.innerText = "✅ Done";

  } catch (err) {
    status.innerText = "❌ " + err.message;
  }
}