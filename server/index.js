const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ serve static files
app.use(express.static(path.join(__dirname, "public")));

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 🔥 simple script generator (replace later with AI)
    const script = `Here's the truth about ${prompt}. It doesn't happen overnight. Every successful person started with nothing but consistency. Keep going.`;

    // ✅ ensure files exist
    const videoPath = path.join(__dirname, "public/output.mp4");
    const audioPath = path.join(__dirname, "public/audio.mp3");

    if (!fs.existsSync(videoPath) || !fs.existsSync(audioPath)) {
      return res.status(500).json({ error: "Missing media files" });
    }

    // ✅ send full URLs
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    res.json({
      script,
      video: `${baseUrl}/output.mp4`,
      audio: `${baseUrl}/audio.mp3`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});