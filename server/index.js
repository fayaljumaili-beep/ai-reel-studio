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
    const text = req.body.prompt || "success mindset";

    const pexels = await axios.get(
      "https://api.pexels.com/videos/search",
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query: text,
          per_page: 1,
        },
      }
    );

    const clipUrl =
      pexels.data.videos?.[0]?.video_files?.find(
        (v) => v.quality === "sd"
      )?.link;

    if (!clipUrl) {
      return res.status(500).json({ error: "No stock video found" });
    }

    const clipPath = path.join(process.cwd(), "stock.mp4");
    const audioPath = path.join(process.cwd(), "voice.mp3");
    const outputPath = path.join(process.cwd(), "viral-reel.mp4");

    const clipResponse = await axios.get(clipUrl, {
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(clipPath);
      clipResponse.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const voice = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const voiceBuffer = Buffer.from(await voice.arrayBuffer());
    fs.writeFileSync(audioPath, voiceBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(clipPath)
        .input(audioPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
         "-vf",
"scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,drawtext=text='Success starts now':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-220", "-movflags +faststart",
          "-shortest",
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    return res.download(outputPath);
  } catch (error) {
    console.error("PEXELS VIDEO ERROR:", error);
    return res.status(500).json({ error: "Video generation failed" });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});