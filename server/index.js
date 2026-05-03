import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ helper: generate real script (NOT bullet points)
function generateScript(prompt) {
  return `Here's the truth about ${prompt}.

It doesn't happen overnight.

Every successful person you admire started with nothing but an idea and the willingness to keep going.

There will be days when you feel stuck, when nothing seems to work, and when giving up feels easier.

But consistency is what separates winners from everyone else.

The small actions you take daily might not feel like much, but over time, they build something powerful.

Stay focused, stay disciplined, and trust the process.

Because if you keep showing up, success becomes inevitable.`;
}

// ✅ health check
app.get("/", (req, res) => {
  res.send("AI Reel Studio Backend Running ✅");
});

// ✅ MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🎯 Prompt:", prompt);

    // ✅ generate script
    const scriptText = generateScript(prompt);

    // ✅ FAKE video for now (replace later with ffmpeg pipeline)
    const videoPath = path.join("public", "output.mp4");

    // if no video exists, just keep previous one OR skip creation
    if (!fs.existsSync(videoPath)) {
      console.log("⚠️ No video found, using placeholder");
    }

    // ✅ ALWAYS return safe response
    res.json({
      videoUrl: "https://ai-reel-studio-production.up.railway.app/output.mp4",
      script: scriptText
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);

    res.status(500).json({
      error: err.message || "Server error"
    });
  }
});

// ✅ start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});