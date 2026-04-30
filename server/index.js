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
    const prompt = req.query.prompt || "how to be successful";
    console.log("🎯 Prompt:", prompt);

    // =========================
    // 🤖 1. AI SCRIPT
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create a viral TikTok script. ONLY return spoken dialogue. No scene directions, no brackets, no labels.",
        },
        {
          role: "user",
          content: `Create a 20-30 second viral video script about: ${prompt}`,
        },
      ],
    });

    const rawScript = completion.choices[0].message.content;

    // =========================
    // 🧼 CLEAN SCRIPT (CRITICAL FIX)
    // =========================
    const cleanScript = rawScript
      .replace(/\[.*?\]/g, "")        // remove [scene stuff]
      .replace(/\*\*.*?\*\*/g, "")    // remove **markdown**
      .replace(/Speaker:|Host:/gi, "") 
      .replace(/\n+/g, " ")
      .trim();

    console.log("🔥 CLEAN SCRIPT:\n", cleanScript);

    // =========================
    // 🎤 2. VOICE
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
    // 📝 3. CREATE SUBTITLES
    // =========================
    const subtitleFile = path.join(__dirname, "subtitles.srt");

    let lines = cleanScript.split(/[.!?]/).filter((l) => l.trim());

    if (lines.length === 0) lines = [cleanScript];

    const duration = 30;
    const perLine = duration / lines.length;

    let srt = "";

    const format = (t) => {
      const h = String(Math.floor(t / 3600)).padStart(2, "0");
      const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
      const s = String(Math.floor(t % 60)).padStart(2, "0");
      return `${h}:${m}:${s},000`;
    };

    lines.forEach((line, i) => {
      const start = i * perLine;
      const end = (i + 1) * perLine;

      srt += `${i + 1}\n`;
      srt += `${format(start)} --> ${format(end)}\n`;
      srt += `${line.trim()}\n\n`;
    });

    fs.writeFileSync(subtitleFile, srt);

    // =========================
    // 🎬 4. VIDEO CLIPS
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
      await run(
        `ffmpeg -y -i "${clips[i]}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -r 30 -preset ultrafast "${normalized[i]}"`
      );
    }

    // =========================
    // 📄 5. CONCAT
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
    // 🔊 6. FINAL VIDEO (AUDIO + SUBS)
    // =========================
    const finalOutput = path.join(__dirname, "output.mp4");

    await run(
      `ffmpeg -y -i "${mergedVideo}" -i "${audioFile}" -vf "subtitles=${subtitleFile}:force_style='Fontsize=32,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=3,Alignment=2'" -c:v libx264 -c:a aac -shortest "${finalOutput}"`
    );

    // =========================
    // 🧹 CLEANUP
    // =========================
    normalized.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
    fs.existsSync(listFile) && fs.unlinkSync(listFile);
    fs.existsSync(audioFile) && fs.unlinkSync(audioFile);
    fs.existsSync(mergedVideo) && fs.unlinkSync(mergedVideo);
    fs.existsSync(subtitleFile) && fs.unlinkSync(subtitleFile);

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