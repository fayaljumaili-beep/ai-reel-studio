const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const OpenAI = require("openai");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();

// 🔐 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.options("*", cors());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Server is alive ✅");
});

// 🔥 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    // 🎤 GENERATE VOICE FROM TEXT
const speechFile = path.join(__dirname, "voice.mp3");

const mp3 = await openai.audio.speech.create({
  model: "gpt-4o-mini-tts",
  voice: "alloy",
  input: script,
});

const buffer = Buffer.from(await mp3.arrayBuffer());
fs.writeFileSync(speechFile, buffer);

console.log("Voice generated");
    
    if (!script) {
      return res.status(400).json({ error: "No script provided" });
    }

    console.log("Script:", script);

    // 📁 Paths
    const imagePath = path.join(__dirname, "assets", "image.jpg");
    const audioPath = path.join(__dirname, "voice.mp3");
    const outputPath = path.join(__dirname, `output-${Date.now()}.mp4`);

    // ✅ Check image exists
    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({
        error: "Missing image.jpg in server/assets"
      });
    }

    // 🔊 Generate AI voice
    const tts = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script
    });

    const audioBuffer = Buffer.from(await tts.arrayBuffer());
    fs.writeFileSync(audioPath, audioBuffer);

    console.log("Voice generated:", audioPath);

    // 🧠 Escape text for ffmpeg
    const safeText = script
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .replace(/,/g, "\\,");

    let responded = false;

    // 🎬 Create video
ffmpeg()
  .input(imagePath)
  .inputOptions(["-loop 1"])
  .input(audioPath)

  .videoCodec("libx264")
  .audioCodec("aac")

  // ❌ REMOVE .duration(10)

  .outputOptions([
    "-pix_fmt yuv420p",
    "-shortest",
    "-movflags +faststart"
  ])

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
    res.status(500).json({
      error: "Video generation failed",
      details: err.message
    });
  }
});

// ✅ Serve files
app.use(express.static(__dirname));

// ✅ Railway PORT fix
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});