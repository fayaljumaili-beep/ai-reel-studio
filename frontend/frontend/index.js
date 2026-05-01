async function generate() {
  const prompt = document.getElementById("prompt").value;
  const status = document.getElementById("status");
  const video = document.getElementById("video");

  if (!prompt) {
    status.innerText = "⚠️ Enter a prompt";
    return;
  }

  status.innerText = "⏳ Generating video...";
  video.src = "";

  try {
    const response = await fetch(
      "https://ai-reel-studio-production.up.railway.app/generate-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = await response.json();

    console.log("Response:", data);

    if (!data.videoUrl) {
      throw new Error("No videoUrl returned");
    }

    video.src = data.videoUrl;
    status.innerText = "✅ Done";

  } catch (error) {
    console.error("ERROR:", error);
    status.innerText = "❌ Failed: " + error.message;
  }
}