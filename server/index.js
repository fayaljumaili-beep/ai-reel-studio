const express = require("express");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

const ASSETS_DIR = path.join(__dirname, "assets");
const VIDEOS_DIR = path.join(ASSETS_DIR, "videos");
const AUDIO_PATH = path.join(ASSETS_DIR, "music.mp3");

// 🔹 Ensure videos folder exists (prevents Railway crash)
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// 🔹 Get random background video
function getRandomVideo() {
  const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith(".mp4"));

  if (!files.length) {
    throw new Error("No videos found in /assets/videos");
  }

  const random = files[Math.floor(Math.random() * files.length)];
  return path.join(VIDEOS_DIR, random);
}

// 🔹 Clean text for FFmpeg
function sanitizeText(text) {
  return text
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/,/g, "")
    .replace(/\n/g, " ")
    .slice(0, 120); // prevent overflow
}

// 🔹 Build video
function buildVideo({ text, duration, output }) {
  return new Promise((resolve, reject) => {
    const safeText = sanitizeText(text);
    const videoInput = getRandomVideo();

    // delete old file if exists
    if (fs.existsSync(output)) {
      fs.unlinkSync(output);
    }

    console.log("Using video:", videoInput);
console.log("Text:", safeText);

    ffmpeg()
      .input(videoInput)
      .inputOptions(["-stream_loop -1"]) // loop background
      .input(AUDIO_PATH)
      .outputOptions([
        `-t ${duration}`,

        // ⚠️ IMPORTANT: split args correctly
        "-vf",
`drawtext=text='${safeText}':fontcolor=white:fontsize=30:x=20:y=20`
        "-pix_fmt yuv420p",
        "-c:v libx264",
        "-preset ultrafast",
        "-crf 32",
        "-s 720x1280",
        "-c:a aac",
        "-b:a 96k",
        "-shortest"
      ])
      .on("end", () => resolve(output))
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .save(output);
  });
}

// 🔹 Route
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const videoDuration =
      duration === "30 sec" ? 30 :
      duration === "60 sec" ? 60 :
      duration === "90 sec" ? 90 : 8;

    const outputPath = path.join(__dirname, "output.mp4");

    const video = await buildVideo({
      text: prompt,
      duration: videoDuration,
      output: outputPath
    });

    res.sendFile(video);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// 🔹 Health check
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});