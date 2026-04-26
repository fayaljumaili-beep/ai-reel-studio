import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🚀 START REQUEST");

    const { prompt = "how to become rich and successful" } = req.body;

    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const voicePath = path.join(__dirname, "voice.mp3");
    const outputVideo = path.join(__dirname, "output.mp4");

    // 🧠 STEP 1 — GENERATE VIRAL SCRIPT
    console.log("🧠 Generating script...");

    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You create short viral video scripts. Format: Hook sentence. Body sentence. CTA sentence."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    const script = scriptRes.choices[0].message.content;
    console.log("🧠 SCRIPT:", script);

    // 🎤 STEP 2 — GENERATE VOICE
    console.log("🎤 Generating voice...");

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync(voicePath, buffer);

    console.log("✅ Voice saved");

    // ⏱️ DURATION (safe fixed for Railway)
    const duration = 12;

    const words = script.split(" ");
    const wordDuration = duration / words.length;

    const filters = [];

    // 🎬 ZOOM (cinematic movement)
    filters.push(
      "zoompan=z='min(zoom+0.0008,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=720x1280"
    );

    // 🔥 HOOK (top text)
    const hook = script.split(".")[0];

    filters.push(
      `drawtext=text='${hook}':
       fontcolor=yellow:
       fontsize=80:
       x=(w-text_w)/2:
       y=100`
    );

    // 🔥 WORD-BY-WORD CAPTIONS
    words.forEach((word, i) => {
      const start = i * wordDuration;
      const end = start + wordDuration;

      filters.push(
        `drawtext=text='${word.toUpperCase()}':
         fontcolor=white:
         fontsize=72:
         borderw=4:
         bordercolor=black:
         x=(w-text_w)/2:
         y=(h-text_h)/2:
         enable='between(t,${start},${end})'`
      );
    });

    // 🔥 SUBTITLE (bottom)
    filters.push(
      `drawtext=text='${script}':
       fontcolor=white:
       fontsize=40:
       x=(w-text_w)/2:
       y=h-120`
    );

    // 🎬 STEP 3 — FFMPEG
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        // 🎤 VOICE
        .input(voicePath)

        // 🎵 MUSIC
        .input(musicPath)
        .complexFilter([
          "[2:a]volume=0.15[a2]",
          "[1:a][a2]amix=inputs=2:duration=longest[aout]"
        ])

        .videoFilters(filters)

        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-t " + duration,
          "-preset ultrafast",
          "-crf 30",
          "-pix_fmt yuv420p",
          "-shortest"
        ])

        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("🎬 VIDEO READY");

    res.sendFile(outputVideo);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ error: err.message || "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});