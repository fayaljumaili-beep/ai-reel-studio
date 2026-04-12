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
app.use(express.json({ limit: "10mb" }));

const port = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.send("🚀 AI Reel backend running");
});

/**
 * Generate script
 */
app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Write a viral faceless reel script with hook, scenes, CTA, and voiceover.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script =
      completion.choices?.[0]?.message?.content ||
      "No script generated";

    res.json({ script });
  } catch (error) {
    console.error("Generate route error:", error);
    res.status(500).json({
      error: "Script generation failed",
      details: error.message,
    });
  }
});

/**
 * Generate voice
 */
app.post("/generate-voice", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script?.trim()) {
      return res.status(400).json({ error: "Script required" });
    }

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = path.join(__dirname, "voiceover.mp3");

    fs.writeFileSync(audioPath, audioBuffer);

    res.json({
      success: true,
      audioUrl: "/voiceover.mp3",
    });
  } catch (error) {
    console.error("Voice route error:", error);
    res.status(500).json({
      error: "Voice generation failed",
      details: error.message,
    });
  }
});

/**
 * Static MP3 serving
 */
app.get("/voiceover.mp3", (req, res) => {
  const audioPath = path.join(__dirname, "voiceover.mp3");

  if (!fs.existsSync(audioPath)) {
    return res.status(404).send("Voice file not found");
  }

  res.sendFile(audioPath);
});

/**
 * Generate narrated MP4
 */
app.post("/generate-video", async (req, res) => {
  try {
    const audioPath = path.join(__dirname, "voiceover.mp3");
    const imagePath = path.join(__dirname, "black.png");
    const outputPath = path.join(__dirname, "viral-reel.mp4");

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({
        error: "Generate voice before video",
      });
    }

    // create a tiny valid black PNG once
    if (!fs.existsSync(imagePath)) {
      const blackPixel = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0XcAAAAASUVORK5CYII=",
        "base64"
      );
      fs.writeFileSync(imagePath, blackPixel);
    }

    ffmpeg()
      .input(imagePath)
      .loop(8)
      .input(audioPath)
      .outputOptions([
        "-shortest",
        "-vf scale=720:1280",
        "-c:v libx264",
        "-preset ultrafast",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-c:a aac",
        "-b:a 96k",
        "-threads 1"
      ])
      .output(outputPath)
      .on("end", () => {
        console.log("✅ FINAL REAL PNG-BASED MP4 READY");
        return res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("PNG VIDEO ERROR:", err);
        return res.status(500).json({
          error: "Video generation failed",
          details: err.message,
        });
      })
      .run();

  } catch (error) {
    console.error("Video route crash:", error);
    return res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});