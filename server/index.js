import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI Reel Studio backend running 🚀");
});

/* =========================
   GENERATE SCRIPT
========================= */
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create a viral faceless reel script with hook, 5 short scenes, and CTA.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    res.json({ script });
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
    res.status(500).json({ error: "Script generation failed" });
  }
});

/* =========================
   GENERATE VOICE
========================= */
app.post("/voiceover", async (req, res) => {
  try {
    const { text } = req.body;

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const filePath = path.join(process.cwd(), "voiceover.mp3");
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    res.download(filePath);
  } catch (error) {
    console.error("VOICE ERROR:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

/* =========================
   GENERATE VIDEO WITH PEXELS
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const { text } = req.body;

    const outputPath = "viral-reel.mp4";
    const audioPath = "voiceover.mp3";

    // your existing voice generation stays above this

  await new Promise((resolve, reject) => {
  ffmpeg()
    .input("color=c=black:s=720x1280:d=8")
    .inputFormat("lavfi")
    .input(audioPath)
    .videoCodec("libx264")
    .audioCodec("aac")
    .audioFrequency(44100)
    .audioChannels(2)
    .outputOptions([
      "-pix_fmt yuv420p",
      "-profile:v baseline",
      "-level 3.0",
      "-movflags +faststart",
      "-shortest",
      "-r 24",
      "-b:a 128k"
    ])
    .save(outputPath)
    .on("end", resolve)
    .on("error", reject);
});

    return res.download(outputPath);
  } catch (error) {
    console.error("FINAL VIDEO ERROR:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});