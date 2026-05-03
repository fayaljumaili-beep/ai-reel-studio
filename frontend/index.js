async function generate() {
  const prompt = document.getElementById("prompt").value;
  const video = document.getElementById("video");
  const status = document.getElementById("status");

  status.innerText = "Rendering...";
  video.src = "";

  try {
    const res = await fetch("https://YOUR-RAILWAY-URL/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      status.innerText = "Error ❌";
      console.error(data);
      return;
    }

    status.innerText = "Done ✅";

    const ts = Date.now(); // prevent caching
    video.src = `${data.videoUrl}?t=${ts}`;
    video.load();
    video.play();

  } catch (err) {
    console.error(err);
    status.innerText = "Error ❌";
  }
}