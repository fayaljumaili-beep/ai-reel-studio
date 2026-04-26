import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// MAIN ENDPOINT
// ===============================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating:", prompt);

    // ===============================
    // 1. GET STOCK VIDEOS (PEXELS)
    // ===============================
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const pexelsData = await pexelsRes.json();

    const clips = pexelsData.videos
      .map(v => v.video_files[0].link)
      .slice(0, 3);

    if (clips.length === 0) {
      throw new Error("No clips found");
    }

    // ===============================
    // 2. DOWNLOAD CLIPS
    // ===============================
    const clipPaths = [];

    for (let i = 0; i < clips.length; i++) {
      const response = await fetch(clips[i]);
      const buffer = await response.arrayBuffer();

      const filePath = path.join(__dirname, `clip${i}.mp4`);
      fs.writeFileSync(filePath, Buffer.from(buffer));

      clipPaths.push(filePath);
    }

    // ===============================
    // 3. GENERATE SCRIPT (AI)
    // ===============================
    const scriptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Write a viral TikTok script. Short punchy lines. High energy. No fluff.",
          },
          {
            role: "user",
            content: `Create a ${duration} second script about: ${prompt}`,
          },
        ],
      }),
    });

    const scriptData = await scriptRes.json();
    const script = scriptData.choices[0].message.content;

    console.log("🧠 SCRIPT:", script);

    // ===============================
    // 4. GENERATE VOICE
    // ===============================
    const voiceRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: script,
      }),
    });

    const voiceBuffer = Buffer.from(await voiceRes.arrayBuffer());
    const voicePath = path.join(__dirname, "voice.mp3");
    fs.writeFileSync(voicePath, voiceBuffer);

    // ===============================
    // 5. CONCAT CLIPS
    // ===============================
    const concatFile = path.join(__dirname, "concat.txt");

    fs.writeFileSync(
      concatFile,
      clipPaths.map(p => `file '${p}'`).join("\n")
    );

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

    // ===============================
    // 6. ADD VOICE + MUSIC
    // ===============================
    const finalVideo = path.join(__dirname, "final.mp4");
    const musicPath = path.join(__dirname, "assets/music.mp3");

    await new Promise((resolve, reject) => {
      ffmpeg(mergedVideo)
        .input(voicePath)
        .input(musicPath)
        .complexFilter([
          "[1:a]volume=1[a1]",
          "[2:a]volume=0.3[a2]",
          "[a1][a2]amix=inputs=2:duration=longest",
        ])
        .outputOptions([
          "-map 0:v",
          "-map [a]",
          "-shortest",
          "-c:v libx264",
          "-c:a aac",
        ])
        .save(finalVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // ===============================
    // 7. SEND VIDEO
    // ===============================
    res.sendFile(finalVideo);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

// ===============================
app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});