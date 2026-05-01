console.log("Frontend loaded");

window.onload = () => {
  console.log("DOM ready");

  const btn = document.getElementById("generateBtn");

  btn.addEventListener("click", async () => {
    console.log("Button clicked");

    const prompt = document.getElementById("prompt").value;
    const status = document.getElementById("status");
    const video = document.getElementById("video");

    if (!prompt) {
      status.innerText = "⚠️ Enter a prompt";
      return;
    }

    status.innerText = "⏳ Generating...";
    video.src = "";

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

      console.log("Response:", data);

      if (data.videoUrl) {
        video.src = data.videoUrl;
        status.innerText = "✅ Done!";
      } else {
        status.innerText = "❌ Failed";
      }
    } catch (err) {
      console.error(err);
      status.innerText = "❌ Error";
    }
  });
};