import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

app.get("/", (_, res) => {
  res.send("🚀 AI Reel backend running");
});

// 1) Generate script
app.post("/generate-script", async (req, res) => {
  try {
    const prompt = req.body?.prompt || "Unlock Your Success!";

    const script = `
🎬 Viral Faceless Reel Script: "${prompt}"

1. Hook (0–3s)
Show an emotional opener related to the topic.

2. Main Point (3–8s)
Reveal the first powerful lesson.

3. Value (8–15s)
Show transformation, proof, or insight.

4. CTA (15–20s)
Ask users to follow for more.
`;

    res.json({ script });
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
    res.status(500).send("Script generation failed");
  }
});

// 2) Voiceover route (serves stable MP3)
app.post("/voiceover", async (_, res) => {
  try {
    const voiceUrl = `${process.env.RAILWAY_PUBLIC_DOMAIN || "https://your-domain.up.railway.app"}/voice.mp3`;
    res.json({ voiceUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Voice generation failed");
  }
});

// 3) Generate final narrated video
app.post("/generate-video", async (req, res) => {
  try {
    const caption = (req.body?.caption || "Unlock Your Success!")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'");

    const samplePath = path.join(__dirname, "..", "sample.mp4");
    const voicePath = path.join(__dirname, "..", "voice.mp3");
    const outputPath = path.join(__dirname, "..", "viral-reel.mp4");

    if (!fs.existsSync(samplePath)) {
      return res.status(400).send("sample.mp4 missing");
    }

    if (!fs.existsSync(voicePath)) {
      return res.status(400).send("voice.mp3 missing");
    }

    ffmpeg()
      .input(samplePath)
      .input(voicePath)
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        `-vf scale=720:1280,drawtext=text='${caption}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h-140`,
        "-r 30",
        "-c:v libx264",
        "-profile:v main",
        "-level 3.1",
        "-pix_fmt yuv420p",
        "-preset medium",
        "-movflags +faststart",
        "-c:a aac",
        "-b:a 192k",
        "-ar 44100",
        "-ac 2",
        "-shortest"
      ])
      .on("end", () => {
        try {
           try {
          const videoBuffer = fs.readFileSync(outputPath);
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="viral-reel.mp4"'
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
      })
      .save(outputPath);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});