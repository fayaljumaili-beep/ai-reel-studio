async function generate() {
  const prompt = document.getElementById("prompt").value;
  const video = document.getElementById("video");
  const status = document.getElementById("status");
  const btn = document.getElementById("generateBtn");

  btn.disabled = true;
  status.innerText = "Generating...";

  try {
    const res = await fetch(
      "https://ai-reel-studio-production.up.railway.app/generate-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await res.json();
    console.log("DATA:", data);

    // 🔥 KEY FIX
    video.src = data.videoUrl;

    video.load();

    video.onloadeddata = () => {
      video.play();
      status.innerText = "Done ✅";
      btn.disabled = false;
    };

  } catch (err) {
    console.error(err);
    status.innerText = "Error generating video ❌";
    btn.disabled = false;
  }
}