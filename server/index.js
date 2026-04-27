import express from "express";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 5000;

ffmpeg.setFfmpegPath(ffmpegPath);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ==============================
// 🎥 GET CLIPS FROM PEXELS
// ==============================
async function getClips(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${query}&per_page=3`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const data = await res.json();

  return data.videos.map((video, i) => {
    const file = video.video_files[0].link;
    const filePath = path.join(__dirname, `clip-${i}.mp4`);
    return { url: file, path: filePath };
  });
}


// ==============================
// ⬇️ DOWNLOAD FILE
// ==============================
async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log("⬇️ Downloaded:", outputPath);
}


// ==============================
// 🎙 GENERATE VOICE
// ==============================
async function generateVoice(text) {
  console.log("🎙 Generating voice...");

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const filePath = path.join(__dirname, "voice.mp3");
  const buffer = Buffer.from(await response.arrayBuffer());

  fs.writeFileSync(filePath, buffer);

  console.log("🔊 Voice saved:", filePath);
  return filePath;
}


// ==============================
// 🎬 BUILD VIDEO (FULL UPGRADE)
// ==============================
async function buildVideo(clips, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log("🎬 Building viral video...");

    const command = ffmpeg();

    // 🎥 add clips
    clips.forEach((clip) => command.input(clip));

    // 🎙 voice
    command.input(audioPath);

    // 🎵 optional music
    const musicPath = path.join(__dirname, "music.mp3");
    const hasMusic = fs.existsSync(musicPath);

    if (hasMusic) {
      command.input(musicPath);
      console.log("🎵 Music detected");
    }

    const hook = "YOU'RE DOING THIS WRONG";
    const caption = "SUCCESS IS A CHOICE";

    const filters = [
      // 🎥 concat clips
      {
        filter: "concat",
        options: { n: clips.length, v: 1, a: 0 },
        inputs: clips.map((_, i) => `[${i}:v]`),
        outputs: "base",
      },

      // 📱 vertical format
      {
        filter: "scale",
        options: "720:1280:force_original_aspect_ratio=decrease",
        inputs: "base",
        outputs: "scaled",
      },
      {
        filter: "pad",
        options: "720:1280:(ow-iw)/2:(oh-ih)/2",
        inputs: "scaled",
        outputs: "padded",
      },

      // 🔥 hook (top, first 2 sec)
      {
        filter: "drawtext",
        options: {
          text: hook,
          fontsize: 50,
          fontcolor: "white",
          x: "(w-text_w)/2",
          y: "80",
          box: 1,
          boxcolor: "black@0.6",
          boxborderw: 20,
          enable: "lt(t,2)",
        },
        inputs: "padded",
        outputs: "hooked",
      },

      // 🧠 caption (bottom)
      {
        filter: "drawtext",
        options: {
          text: caption,
          fontsize: 60,
          fontcolor: "white",
          x: "(w-text_w)/2",
          y: "h-150",
          box: 1,
          boxcolor: "black@0.5",
          boxborderw: 20,
        },
        inputs: "hooked",
        outputs: "vout",
      },
    ];

    // 🎵 AUDIO MIX
    const voiceIndex = clips.length;
    const musicIndex = clips.length + 1;

    if (hasMusic) {
      filters.push({
        filter: "amix",
        options: {
          inputs: 2,
          duration: "shortest",
        },
        inputs: [`[${voiceIndex}:a]`, `[${musicIndex}:a]`],
        outputs: "aout",
      });
    }

    command
      .complexFilter(filters)
      .outputOptions([
        "-map [vout]",
        hasMusic ? "-map [aout]" : `-map ${voiceIndex}:a`,
        "-shortest",
        "-movflags +faststart",
      ])
      .on("start", (cmd) => console.log("🚀 FFmpeg:", cmd))
      .on("end", () => {
        console.log("✅ Video built!");
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}


// ==============================
// 🚀 API ROUTE
// ==============================
app.post("/generate-video", async (req, res) => {
  try {
    const prompt = req.body.prompt || "success mindset";
    console.log("📥 Prompt:", prompt);

    // 1. get clips
    const clipsData = await getClips(prompt);

    // 2. download
    const clipPaths = [];
    for (const clip of clipsData) {
      await downloadFile(clip.url, clip.path);
      clipPaths.push(clip.path);
    }

    // 3. voice
    const voiceFile = await generateVoice(prompt);

    // 4. output
    const outputPath = path.join(__dirname, "output.mp4");

    // 5. build
    await buildVideo(clipPaths, voiceFile, outputPath);

    // 6. send
    res.sendFile(outputPath);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==============================
// ❤️ HEALTH CHECK
// ==============================
app.get("/", (req, res) => {
  res.send("🚀 Server running");
});


// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});