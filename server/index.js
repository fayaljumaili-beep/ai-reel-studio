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
    const { script, audioUrl, prompt } = req.body;

    // Use prompt for Pexels search instead of huge script
    const searchQuery = prompt || "success motivation";

    // 1) Fetch stock video from Pexels
    const pexelsResponse = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const pexelsVideoUrl =
      pexelsResponse.data.videos?.[0]?.video_files?.[0]?.link;

    if (!pexelsVideoUrl) {
      return res.status(500).json({ error: "No Pexels video found" });
    }

    // 2) Download audio
    const audioPath = "./voice.mp3";
   if (!audioUrl || !audioUrl.startsWith("http")) {
  return res.status(400).json({
    error: "Invalid or missing audioUrl from frontend",
  });
}

const audioResponse = await axios({
  method: "GET",
  url: audioUrl,
  responseType: "stream",
});

    const writer = fs.createWriteStream(audioPath);
    audioResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // 3) Generate final reel
    const outputPath = "./viral-reel.mp4";
    const videoUrl = pexelsVideoUrl;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoUrl)
        .input(audioPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset ultrafast",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-shortest",
          "-vf",
          "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='Success starts now':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-220",
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // 4) Download result
    return res.download(outputPath);
  } catch (error) {
    console.error("PEXELS VIDEO ERROR:", error);
    return res.status(500).json({
      error: error.message || "Video generation failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});