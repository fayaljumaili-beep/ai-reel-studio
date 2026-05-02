import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import cors from "cors";
import { exec } from "child_process";

const app = express();
app.use(express.json());
app.use(cors());

// serve video files
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

/* =========================
   🎙️ VOICE GENERATION
========================= */
async function generateVoice(script) {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.log("⚠️ No ElevenLabs key, skipping voice...");
    return;
  }

  console.log("🎙️ Generating voice...");

  const response = await axios({
    method: "POST",
    url: "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    data: {
      text: script,
      model_id: "eleven_monolingual_v1",
    },
    responseType: "arraybuffer",
  });

  fs.writeFileSync("public/voice.mp3", response.data);
}

/* =========================
   🎬 MAIN ROUTE
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("📩 Prompt:", prompt);

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    /* =========================
       🧠 SIMPLE SCRIPT (MVP)
    ========================= */
    const script = `A cinematic reel about ${prompt}. Success, luxury, lifestyle, motivation, and ambition.`;

    /* =========================
       🎥 FETCH VIDEOS (PEXELS)
    ========================= */
    console.log("🔎 Fetching videos...");

    const pexels = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        prompt
      )}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = pexels.data.videos;

    if (!videos || videos.length === 0) {
      return res.json({ error: "No videos found" });
    }

    /* =========================
       ⬇️ DOWNLOAD CLIPS
    ========================= */
    console.log("⬇️ Downloading clips...");

    const clips = [];

    for (let i = 0; i < Math.min(videos.length, 5); i++) {
      const url = videos[i].video_files[0].link;
      const filePath = `public/clip_${i}.mp4`;

      const response = await axios({
        method: "GET",
        url,
        responseType: "stream",
      });

      await new Promise((resolve) => {
        const stream = fs.createWriteStream(filePath);
        response.data.pipe(stream);
        stream.on("finish", resolve);
      });

      clips.push(filePath);
    }

    /* =========================
       📄 CREATE CONCAT FILE
    ========================= */
    const concatFile = clips.map((c) => `file '${c}'`).join("\n");
    fs.writeFileSync("public/concat.txt", concatFile);

    /* =========================
       🎬 MERGE CLIPS
    ========================= */
    console.log("🎬 Merging clips...");

    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -f concat -safe 0 -i public/concat.txt -c copy public/final.mp4`,
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    /* =========================
       🎙️ VOICE
    ========================= */
    await generateVoice(script);

    /* =========================
       🎬 FINAL VIDEO (VOICE + CAPTIONS + VERTICAL)
    ========================= */
    console.log("🎬 Creating final video...");

    const hasVoice = fs.existsSync("public/voice.mp3");

    const ffmpegCommand = hasVoice
      ? `
      ffmpeg -y \
      -i public/final.mp4 \
      -i public/voice.mp3 \
      -vf "scale=1080:1920,drawtext=text='${script
        .replace(/:/g, "\\:")
        .slice(0, 80)}...':x=50:y=H-100:fontsize=36:fontcolor=white" \
      -c:v libx264 \
      -c:a aac \
      -shortest \
      public/output.mp4
    `
      : `
      ffmpeg -y \
      -i public/final.mp4 \
      -vf "scale=1080:1920" \
      public/output.mp4
    `;

    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    console.log("✅ FINAL VIDEO READY");

    /* =========================
       🎉 RESPONSE
    ========================= */
    res.json({
      videoUrl: "/output.mp4",
    });
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   🚀 START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});