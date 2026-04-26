import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================
// GENERATE VIDEO
// ================================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 60 } = req.body;

    const videoPath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const voicePath = path.join(__dirname, "voice.mp3");
    const outputVideo = path.join(__dirname, "final.mp4");

    // ================================
    // 1. GENERATE SCRIPT
    // ================================
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short motivational script for a video about: "${prompt}". Keep it engaging and punchy.`,
        },
      ],
    });

    const script = scriptRes.choices[0].message.content;

    console.log("🧠 Script:", script);

    // ================================
    // 2. TEXT TO SPEECH
    // ================================
    const tts = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    fs.writeFileSync(voicePath, buffer);

    // ================================
    // 3. CREATE VIDEO WITH AUDIO
    // ================================
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .loop(duration)
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
          "-t " + duration,
          "-shortest",
        ])
        .videoFilters([
          `drawtext=text='${prompt}':fontcolor=cyan:fontsize=40:x=(w-text_w)/2:y=h-100`,
        ])
        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // ================================
    // RETURN VIDEO
    // ================================
    res.sendFile(outputVideo);
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({
      error: err.message || "FAILED",
    });
  }
});

// ================================
app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});