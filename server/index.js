import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (_, res) => {
  res.send("AI Reel backend running 🚀");
});

// 1) Generate script
app.post("/generate-script", async (req, res) => {
  try {
    const { prompt } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Write viral faceless reel scripts with hook, 5 scenes, CTA, and captions.",
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
    console.error(error);
    res.status(500).send("Script generation failed");
  }
});

// 2) Generate voice (temporary mock that returns your provided URL)
app.post("/voiceover", async (req, res) => {
  try {
    const { script } = req.body;

    // TODO: replace with ElevenLabs/TTS provider
    // For now frontend can pass any working mp3 URL
    const voiceUrl = process.env.DEMO_VOICE_URL;

    if (!voiceUrl) {
      return res.status(400).send("Missing DEMO_VOICE_URL in Railway vars");
    }

    res.json({ voiceUrl, script });
  } catch (error) {
    console.error(error);
    res.status(500).send("Voice generation failed");
  }
});

// 3) Generate final reel video
app.post("/generate-video", async (req, res) => {
  try {
    const body = req.body || {};

console.log("VIDEO BODY:", body);

const finalAudioUrl =
  body.audioUrl ||
  body.voiceUrl ||
  body.audio ||
  body.url ||
  body.voice ||
  body.mp3;
  
    if (!finalAudioUrl) {
      return res.status(400).send("Missing voice URL");
    }

    const stockVideoPath = path.resolve("server/sample.mp4");
    const outputPath = `/tmp/viral-reel-${Date.now()}.mp4`;
  
    if (!fs.existsSync(stockVideoPath)) {
      return res.status(400).send("Missing stock video file");
    }

    ffmpeg()
      .input(stockVideoPath)
      .input(finalAudioUrl)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset veryfast",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .size("720x1280")
      .on("end", () => {
        console.log("VIDEO CREATED SUCCESSFULLY");
        res.download(outputPath);
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err);
        res.status(400).send(`FFmpeg failed: ${err.message}`);
      })
      .save(outputPath);
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    res.status(400).send(`Route failed: ${error.message}`);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});