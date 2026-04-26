import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===============================
// DOWNLOAD FILE
// ===============================
async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// ===============================
// GET VIDEOS FROM PEXELS
// ===============================
async function getPexelsVideos(query, count = 6) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${query}&per_page=${count}`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const data = await res.json();

  return data.videos.map((v, i) => ({
    url: v.video_files[0].link,
    file: path.join(__dirname, `scene_${i}.mp4`),
  }));
}

// ===============================
// GENERATE SCRIPT
// ===============================
async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Write a short, punchy motivational TikTok script under 90 seconds. Use short impactful lines.",
      },
      { role: "user", content: prompt },
    ],
  });

  return completion.choices[0].message.content;
}

// ===============================
// GENERATE VOICE
// ===============================
async function generateVoice(text) {
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(__dirname, "voice.mp3");

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

// ===============================
// MAIN ROUTE
// ===============================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🎬 Generating:", prompt);

    // 1. SCRIPT + VOICE
    const script = await generateScript(prompt);
    const voicePath = await generateVoice(script);

    console.log("🧠 Script:", script);

    // 2. DOWNLOAD VIDEOS
    const videos = await getPexelsVideos(prompt);

    for (const v of videos) {
      await downloadFile(v.url, v.file);
    }

    // 3. CONCAT FILE
    const concatFile = path.join(__dirname, "concat.txt");

    fs.writeFileSync(
      concatFile,
      videos.map((v) => `file '${v.file}'`).join("\n")
    );

    // 4. MERGE VIDEO
    const mergedVideo = path.join(__dirname, "merged.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(mergedVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // 5. ADD AUDIO (FIXED ✅)
    const finalVideo = path.join(__dirname, "final.mp4");
    const musicPath = path.join(__dirname, "assets/music.mp3");

    await new Promise((resolve, reject) => {
      ffmpeg(mergedVideo)
        .input(voicePath)
        .input(musicPath)
        .complexFilter([
          "[1:a]volume=1[a1]",
          "[2:a]volume=0.3[a2]",
          "[a1][a2]amix=inputs=2:duration=longest[aout]",
        ])
        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-shortest",
        ])
        .save(finalVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // 6. RETURN VIDEO
    res.sendFile(finalVideo);

  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    res.status(500).json({ error: err.message || "FAILED" });
  }
});

// ===============================
app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});