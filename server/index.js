const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// ✅ CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.options("*", cors());

// ✅ HEALTH CHECK (VERY IMPORTANT)
app.get("/", (req, res) => {
  res.send("Server is alive ✅");
});

// 🔥 MAIN ROUTE (MATCH THIS IN HOPPSCOTCH)
app.post("/generate", (req, res) => {
  console.log("==== HIT /generate ====");
  console.log("Body:", req.body);

  return res.json({
    message: "Route works ✅",
    received: req.body
  });
});

    // ✅ FIXED FILE PATHS
    const audioPath = path.join(__dirname, "assets", "voice.mp3"); // ✅ MUST be mp3
    const imagePath = path.join(__dirname, "assets", "image.jpg");
    const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);

    console.log("Audio exists:", fs.existsSync(audioPath));
    console.log("Image exists:", fs.existsSync(imagePath));

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
      res.status(500).json({ error: "FFmpeg failed" });
    }
  })

  .on("end", () => {
    console.log("Video created:", outputPath);
    if (!responded) {
      responded = true;
      res.json({
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

// ✅ SERVE OUTPUT FILES
app.use(express.static(__dirname));

// ✅ CRITICAL FIX FOR RAILWAY
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));