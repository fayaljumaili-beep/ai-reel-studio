const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// 🔥 HARD FIX FOR CORS (THIS is what you were missing)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "No script provided" });
    }

    const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    const audioPath = path.join(__dirname, "audio.mp3");
    const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);

    const response = await fetch(audioUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(audioPath, Buffer.from(buffer));

    ffmpeg()
      .input(audioPath)
      .inputOptions(["-loop 1"])
      .input("https://images.unsplash.com/photo-1506744038136-46273834b3fb")
      .videoCodec("libx264")
      .audioCodec("aac")
      .duration(10)
      .outputOptions(["-pix_fmt yuv420p", "-shortest"])
      .save(outputPath)
      .on("end", () => {
        res.json({
          videoUrl: `https://ai-reel-studio-production.up.railway.app/${path.basename(outputPath)}`
        });
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.use(express.static(__dirname));

app.listen(3000, () => console.log("Server running"));