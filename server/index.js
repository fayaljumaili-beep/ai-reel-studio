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
app.use(express.static("."));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (_, res) => {
  res.send("AI Reel backend running 🚀");
});

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

app.post("/voiceover", async (_, res) => {
  try {
    const voiceUrl =
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    res.json({ voiceUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Voice generation failed");
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const body = req.body || {};

    const finalAudioUrl =
      body.audioUrl ||
      body.voiceUrl ||
      body.audio ||
      body.url ||
      body.voice ||
      body.mp3;

    if (!finalAudioUrl) {
      return res.status(400).send("Missing audio URL");
    }

    const videoPath = path.join(process.cwd(), "sample.mp4");
    const outputPath = path.join("/tmp", "viral-reel.mp4");

    ffmpeg()
      .input(videoPath)
      .input(finalAudioUrl)
      .outputOptions([
  "-vf scale=720:1280",
  "-r 24",
  "-c:v libx264",
  "-preset ultrafast",
  "-crf 30",
  "-pix_fmt yuv420p",
  "-c:a aac",
  "-b:a 128k",
  "-shortest",
  "-movflags +faststart",
])
      .save(outputPath)
      .on("end", () => {
        try {
          const videoBuffer = fs.readFileSync(outputPath);

          res.setHeader("Content-Type", "video/mp4");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=viral-reel.mp4"
          );

          res.end(videoBuffer);
        } catch (error) {
          console.error("READ VIDEO ERROR:", error);
          res.status(500).send(error.message);
        }
      })
      .on("error", (err) => {
        console.error("VIDEO ERROR:", err.message);
        res.status(400).send(err.message);
      });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});