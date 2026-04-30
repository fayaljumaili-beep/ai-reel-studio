import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import OpenAI from "openai";
import axios from "axios";
import { fileURLToPath } from "url";

console.log("🔥 HOOK SYSTEM VERSION DEPLOYED");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ffmpeg runner
const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFMPEG ERROR:", stderr);
        reject(err);
      } else resolve(stdout);
    });
  });

app.get("/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt || "success mindset";
    console.log("🎯 Prompt:", prompt);

    // =========================
    // 🧠 HOOK SYSTEM (NEW)
    // =========================
    const hooks = [
      "Stop scrolling. This will change how you think.",
      "Nobody tells you this, but listen closely.",
      "You're wasting time if you don't understand this.",
      "This is exactly why you're stuck right now.",
      "If you hear this, pay attention.",
    ];

    const randomHook =
      hooks[Math.floor(Math.random() * hooks.length)];

    // =========================
    // 🤖 AI SCRIPT
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You create viral TikTok scripts.

RULES:
- First line MUST be a strong hook
- Short punchy lines
- No scene directions
- No brackets
- Only spoken dialogue
          `,
        },
        {
          role: "user",
          content: `${randomHook} Continue with a viral 20-30 second script about: ${prompt}`,
        },
      ],
    });

    const rawScript = completion.choices?.[0]?.message?.content || "";

    if (!rawScript) throw new Error("No script generated");

    const cleanScript = rawScript
      .replace(/\[.*?\]/g, "")
      .replace(/\*\*.*?\*\*/g, "")
      .replace(/Speaker:|Host:/gi, "")
      .replace(/\n+/g, " ")
      .trim();

    console.log("🔥 CLEAN SCRIPT:\n", cleanScript);

    // =========================
    // 🎤 VOICE
    // =========================
    const audioFile = path.join(__dirname, "voice.mp3");

    const voice = await axios({
      method: "POST",
      url: "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      data: {
        text: cleanScript,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      },
    });

    fs.writeFileSync(audioFile, voice.data);

    // =========================
    // 🧠 SUBTITLES (chunk style)
    // =========================
    const subtitleFile = path.join(__dirname, "subtitles.srt");

    const words = cleanScript.split(/\s+/);
    const chunkSize = 3;
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" ").toUpperCase());
    }

    const totalDuration = 30;
    const perChunk = totalDuration / chunks.length;

    const format = (t) => {
      const h = String(Math.floor(t / 3600)).padStart(2, "0");
      const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
      const s = String(Math.floor(t % 60)).padStart(2, "0");
      const ms = String(Math.floor((t % 1) * 1000)).padStart(3, "0");
      return `${h}:${m}:${s},${ms}`;
    };

    let srt = "";

    chunks.forEach((chunk, i) => {
      const start = i * perChunk;
      const end = (i + 1) * perChunk;

      srt += `${i + 1}\n`;
      srt += `${format(start)} --> ${format(end)}\n`;
      srt += `${chunk}\n\n`;
    });

    fs.writeFileSync(subtitleFile, srt);

    // =========================
    // 🎬 VIDEO
    // =========================
    const clips = [
      path.join(__dirname, "assets/videos/clip-0.mp4"),
      path.join(__dirname, "assets/videos/clip-1.mp4"),
      path.join(__dirname, "assets/videos/clip-2.mp4"),
    ];

    const normalized = clips.map((_, i) =>
      path.join(__dirname, `temp${i}.mp4`)
    );

    for (let i = 0; i < clips.length; i++) {
      if (!fs.existsSync(clips[i])) {
        throw new Error(`Missing video file: ${clips[i]}`);
      }

      await run(
        `ffmpeg -y -i "${clips[i]}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -r 30 -preset ultrafast "${normalized[i]}"`
      );
    }

    const listFile = path.join(__dirname, "list.txt");

    fs.writeFileSync(
      listFile,
      normalized.map((f) => `file '${f}'`).join("\n")
    );

    const mergedVideo = path.join(__dirname, "merged.mp4");

    await run(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${mergedVideo}"`
    );

    // =========================
    // 🔊 FINAL OUTPUT
    // =========================
    const finalOutput = path.join(__dirname, "output.mp4");

    const safeSubtitle = subtitleFile
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:");

    await run(
      `ffmpeg -y -i "${mergedVideo}" -i "${audioFile}" -vf "subtitles='${safeSubtitle}':force_style='Fontsize=44,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=5,Alignment=2'" -c:v libx264 -c:a aac -shortest "${finalOutput}"`
    );

    // =========================
    // CLEANUP
    // =========================
    [audioFile, mergedVideo, subtitleFile, listFile, ...normalized].forEach(
      (f) => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    );

    res.sendFile(finalOutput);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});