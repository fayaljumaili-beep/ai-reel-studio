import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __dirname = new URL(".", import.meta.url).pathname;

// ===============================
// 🎤 GENERATE AI VOICE
// ===============================
async function generateVoice(script) {
  const filePath = path.join(__dirname, "voice.mp3");

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: script,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

// ===============================
// 🧠 WORD TIMESTAMPS
// ===============================
async function getWordTimestamps(audioPath) {
  const res = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "gpt-4o-transcribe",
    response_format: "verbose_json",
  });

  return res.words || [];
}

// ===============================
// 🛡️ ESCAPE TEXT FOR FFMPEG
// ===============================
function escapeText(text) {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

// ===============================
// 🎬 BUILD WORD-BY-WORD CAPTIONS
// ===============================
function buildDrawtextFilter(words) {
  return words
    .map((w) => {
      const word = escapeText(w.word);

      return `drawtext=text='${word}':fontcolor=white:fontsize=48:borderw=2:bordercolor=black:x=(w-text_w)/2:y=(h-200):enable='between(t,${w.start},${w.end})'`;
    })
    .join(",");
}

// ===============================
// 🎬 GENERATE VIDEO
// ===============================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 60 } = req.body;

    // 1️⃣ Generate script
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create a viral short-form video script (~${duration}s) about: ${prompt}`,
        },
      ],
    });

    const script = scriptRes.choices[0].message.content;

    console.log("🧠 SCRIPT:", script);

    // 2️⃣ Voice
    const voicePath = await generateVoice(script);

    // 3️⃣ Word timestamps
    const words = await getWordTimestamps(voicePath);

    console.log("📝 WORDS SAMPLE:", words.slice(0, 5));

    // 4️⃣ Build caption filter
    const textFilter = buildDrawtextFilter(words);

    // 5️⃣ Paths
    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets/music.mp3");
    const outputVideo = path.join(__dirname, "final.mp4");

    // 6️⃣ FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)
        .input(voicePath)
        .input(musicPath)
        .complexFilter([
          "[1:a]volume=1[a1]",
          "[2:a]volume=0.25[a2]",
          "[a1][a2]amix=inputs=2:duration=longest[aout]",
        ])
        .videoFilters(textFilter)
        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-t " + duration,
          "-shortest",
        ])
        .save(outputVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // 7️⃣ Send video
    res.sendFile(outputVideo);
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ error: err.message || "FAILED" });
  }
});

// ===============================
app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});