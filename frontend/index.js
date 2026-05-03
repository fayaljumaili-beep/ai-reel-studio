async function generate() {
  const prompt = document.getElementById("prompt").value;
  const video = document.getElementById("video");
  const status = document.getElementById("status");
  const btn = document.getElementById("generateBtn");

  btn.disabled = true;
  status.innerText = "Generating...";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    console.log("DATA:", data);

    if (!data.videoUrl) {
      throw new Error("No video URL returned");
    }

    const ts = Date.now();

    video.src = `https://ai-reel-studio-production.up.railway.app${data.videoUrl}?t=${ts}`;
    video.load();

    video.onloadeddata = () => {
      video.play();
      status.innerText = "Done ✅";
      btn.disabled = false;
    };

  } catch (err) {
    console.error(err);
    status.innerText = "Error ❌";
    btn.disabled = false;
  }
}