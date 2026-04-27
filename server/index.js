import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

// fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// setup ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS FIX
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// =========================
// OPENAI
// =========================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =========================
// GET CLIPS FROM PEXELS
// =========================
async function getClips(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${query}&per_page=3`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  const data = await res.json();

  const clips = [];

  for (let i = 0; i < data.videos.length; i++) {
    const video = data.videos[i].video_files[0].link;
    const filePath = path.join(__dirname, `clip-${i}.mp4`);

    const response = await fetch(video);
    const buffer = await response.buffer();

    fs.writeFileSync(filePath, buffer);
    clips.push(filePath);

    console.log("📥 Downloaded:", filePath);
  }

  return clips;
}

// =========================
// GENERATE VOICE
// =========================
async function generateVoice(text) {
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text
  });

  const filePath = path.join(__dirname, "voice.mp3");
  const buffer = Buffer.from(await speech.arrayBuffer());

  fs.writeFileSync(filePath, buffer);

  console.log("🔊 Voice saved:", filePath);

  return filePath;
}

// =========================
// BUILD VIDEO (VERTICAL + CLEAN FIX)
// =========================
async function buildVideo(clips, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log("🎬 Building video...");

    const command = ffmpeg();

    // add inputs
    clips.forEach((clip) => command.input(clip));
    command.input(audioPath);

    // FIXED FILTER (no index errors)
    const filter = `
      ${clips.map((_, i) => `[${i}:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[v${i}]`).join(";")}
      ${clips.map((_, i) => `[v${i}]`).join("")}
      concat=n=${clips.length}:v=1:a=0[outv]
    `;

    command
      .complexFilter(filter, "outv")
      .outputOptions([
        "-map [outv]",
        `-map ${clips.length}:a`,
        "-shortest",
        "-movflags +faststart"
      ])
      .on("start", (cmd) => {
        console.log("🚀 FFmpeg started:", cmd);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("✅ Video built!");
        resolve();
      })
      .save(outputPath);
  });
}

// =========================
// MAIN ENDPOINT
// =========================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("📥 Request:", prompt);

    // 1. get clips
    const clips = await getClips(prompt);

    // 2. voice
    const voiceFile = await generateVoice(prompt);

    // 3. output path
    const outputPath = path.join(__dirname, "output.mp4");

    // 4. build video
    await buildVideo(clips, voiceFile, outputPath);

    // 5. send video
    res.sendFile(outputPath);

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("🚀 Server running");
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});