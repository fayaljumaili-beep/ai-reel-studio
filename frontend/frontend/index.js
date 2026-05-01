console.log("Frontend loaded ✅");

const button = document.getElementById("generateBtn");

button.addEventListener("click", generate);

async function generate() {
  console.log("Button clicked 🔥");

  const prompt = document.getElementById("prompt").value;
  const status = document.getElementById("status");
  const video = document.getElementById("video");

  if (!prompt) {
    status.innerText = "⚠️ Please enter a prompt";
    return;
  }

  status.innerText = "⏳ Generating...";
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

    console.log("Response status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const data = await response.json();

    console.log("Response data:", data);

    video.src = data.videoUrl;
    status.innerText = "✅ Done";

  } catch (error) {
    console.error(error);
    status.innerText = "❌ " + error.message;
  }
}