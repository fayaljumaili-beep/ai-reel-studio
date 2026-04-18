const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ✅ CORS FIX (keep this)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ PREVENT preflight issues
app.options("*", cors());

// 🔥 VIDEO ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "No script provided" });
    }

    // ✅ FILE PATHS (IMPORTANT)
    const audioPath = path.join(__dirname, "assets", "bg.mp4");
    const imagePath = path.join(__dirname, "assets", "image.jpg");
    const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);

    // ✅ DEBUG LOGS (CRITICAL)
    console.log("Audio path:", audioPath);
    console.log("Image path:", imagePath);
    console.log("Audio exists:", fs.existsSync(audioPath));
    console.log("Image exists:", fs.existsSync(imagePath));

    // ❌ HARD FAIL if files missing
    if (!fs.existsSync(audioPath) || !fs.existsSync(imagePath)) {
      return res.status(500).json({
        error: "Missing media files",
        audioExists: fs.existsSync(audioPath),
        imageExists: fs.existsSync(imagePath)
      });
    }

   let responded = false;

ffmpeg()
  .input(imagePath)
  .inputOptions(["-loop 1"])
  .input(audioPath)
  .videoCodec("libx264")
  .audioCodec("aac")
  .duration(10)
  .outputOptions(["-pix_fmt yuv420p", "-shortest"])

  .on("error", (err) => {
    console.error("FFmpeg error:", err);
    if (!responded) {
      responded = true;
      return res.status(500).json({ error: "FFmpeg failed" });
    }
  })

  .on("end", () => {
    console.log("Video created:", outputPath);
    if (!responded) {
      responded = true;
      return res.json({
        videoUrl: `https://ai-reel-studio-production.up.railway.app/${path.basename(outputPath)}`
      });
    }
  })

  .save(outputPath);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Video generation failed", details: err.message });
  }
});

// ✅ SERVE FILES
app.use(express.static(__dirname));

app.listen(3000, () => console.log("🚀 Server running"));