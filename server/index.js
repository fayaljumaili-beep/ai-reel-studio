const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// 🚀 MAIN ROUTE
app.get("/generate-video", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // ✅ Correct file paths
    const videoPath = path.join(__dirname, "public", "output.mp4");
    const audioPath = path.join(__dirname, "public", "audio.mp3");

    console.log("📦 Checking files...");
    console.log("Video path:", videoPath);
    console.log("Audio path:", audioPath);

    // ❌ If files missing → return error
    if (!fs.existsSync(videoPath)) {
      console.error("❌ Missing output.mp4");
      return res.status(500).json({ error: "Missing output.mp4" });
    }

    if (!fs.existsSync(audioPath)) {
      console.error("❌ Missing audio.mp3");
      return res.status(500).json({ error: "Missing audio.mp3" });
    }

    // ✅ Build URLs
    const videoUrl = `${baseUrl}/output.mp4`;
    const audioUrl = `${baseUrl}/audio.mp3`;

    console.log("✅ Sending response");

    res.json({
      script: "Generated script placeholder",
      video: videoUrl,
      audio: audioUrl,
    });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});