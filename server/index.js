import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import OpenAI from "openai";
import axios from "axios";
import { fileURLToPath } from "url";

console.log("🔥 NEW VERSION DEPLOYED");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔑 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🎬 helper to run ffmpeg
const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFMPEG ERROR:", stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });

app.get("/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt || "how to be successful";
    console.log("🎯 Prompt:", prompt);

    // =========================
    // 🤖 STEP 1: AI SCRIPT
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You create short viral TikTok/Reels scripts with strong hooks, short sentences, and emotional impact.",
        },
        {
          role: "user",
          content: `Create a 20-30 second viral video script about: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    console.log("🔥 SCRIPT:\n", script);

    // =========================
    // 🎤 STEP 2: VOICE (ElevenLabs)
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
        text: script,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      },
    });

    fs.writeFileSync(audioFile, voice.data);

    // =========================
    // 📁 STEP 3: VIDEO CLIPS
    // =========================
    const clips = [
      path.join(__dirname, "assets/videos/clip-0.mp4"),
      path.join(__dirname, "assets/videos/clip-1.mp4"),
      path.join(__dirname, "assets/videos/clip-2.mp4"),
    ];

    const normalized = clips.map((_, i) =>
      path.join(__dirname, `temp${i}.mp4`)
    );

    // normalize clips to same format
    for (let i = 0; i < clips.length; i++) {
      await run(
        `ffmpeg -y -i "${clips[i]}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -r 30 -preset ultrafast "${normalized[i]}"`
      );
    }

    // =========================
    // 📄 STEP 4: CONCAT
    // =========================
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
    // 🔊 STEP 5: ADD AUDIO
    // =========================
    const finalOutput = path.join(__dirname, "output.mp4");

    await run(
      `ffmpeg -y -i "${mergedVideo}" -i "${audioFile}" -c:v copy -c:a aac -shortest "${finalOutput}"`
    );

    // =========================
    // 🧹 CLEANUP
    // =========================
    normalized.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
    fs.existsSync(listFile) && fs.unlinkSync(listFile);
    fs.existsSync(audioFile) && fs.unlinkSync(audioFile);
    fs.existsSync(mergedVideo) && fs.unlinkSync(mergedVideo);

    // =========================
    // 🚀 RESPONSE
    // =========================
    res.sendFile(finalOutput);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});