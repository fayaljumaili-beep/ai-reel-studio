async function generate() {
  const prompt = document.getElementById("prompt").value;
  const status = document.getElementById("status");
  const container = document.getElementById("results");

  status.innerText = "Generating...";
  container.innerHTML = "";

  try {
    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    console.log(data); // 👈 IMPORTANT (debug)

    data.results.forEach(item => {
      const div = document.createElement("div");

      div.innerHTML = `
        <video controls width="250">
          <source src="${item.videoUrl}" type="video/mp4">
        </video>
        <p>${item.caption}</p>
        <a href="${item.videoUrl}" download>Download</a>
      `;

      container.appendChild(div);
    });

    status.innerText = "Done 🚀";

  } catch (err) {
    console.error(err);
    status.innerText = "Error generating video ❌";
  }
}