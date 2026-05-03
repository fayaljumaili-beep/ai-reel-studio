const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ MIDDLEWARE
app.use(express.json());

// 🔥 FIX CORS (this solves your current error)
app.use(cors({
  origin: "*", // allow all (safe for now)
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ SERVE STATIC FILES
app.use(express.static(path.join(__dirname, "public")));

// 🔍 HEALTH CHECK (optional but useful)
app.get("/", (req, res) => {
  res.send("🚀 AI Reel Studio backend is running");
});

// 🎬 GENERATE VIDEO ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🧠 Prompt:", prompt);

    // 🔥 TEMP SCRIPT (replace later with OpenAI)
    const script = `Here's the truth about ${prompt}. It doesn't happen overnight. Every successful person you admire started with nothing but consistency. Stay focused, stay disciplined, and keep going.`;

    // 📁 FILE PATHS
    const videoPath = path.join(__dirname, "public/output.mp4");
    const audioPath = path.join(__dirname, "public/audio.mp3");

    // ❌ SAFETY CHECK
    if (!fs.existsSync(videoPath)) {
      console.error("❌ Missing output.mp4");
      return res.status(500).json({ error: "Video file missing" });
    }

    if (!fs.existsSync(audioPath)) {
      console.error("❌ Missing audio.mp3");
      return res.status(500).json({ error: "Audio file missing" });
    }

    // 🌐 BUILD FULL URLS
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const videoUrl = `${baseUrl}/output.mp4`;
    const audioUrl = `${baseUrl}/audio.mp3`;

    console.log("✅ Sending response");

    // 🚀 RESPONSE
    res.json({
      script,
      video: videoUrl,
      audio: audioUrl
    });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});