import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔐 ENV KEYS
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID; // put your voice id

// helper
const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;
    console.log("🔥 START:", idea);

    // ------------------------
    // 1. SCRIPT (simple for now)
    // ------------------------
    const script = `If you want success, listen carefully. Start small. Stay consistent. This is how you win.`;

    // ------------------------
    // 2. VOICE (ElevenLabs)
    // ------------------------
    const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_monolingual_v1",
        }),
      }
    );

    const voiceBuffer = await voiceRes.arrayBuffer();
    fs.writeFileSync("voice.mp3", Buffer.from(voiceBuffer));
    console.log("🎤 Voice ready");

    // ------------------------
    // 3. GET VIDEO (PEXELS)
    // ------------------------
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=3`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    const pexelsData = await pexelsRes.json();
    const videos = pexelsData.videos;

    if (!videos || videos.length === 0) {
      throw new Error("No videos found");
    }

    // pick SMALL clip (important!)
    const file =
      videos[0].video_files.find((v) => v.quality === "sd") ||
      videos[0].video_files[0];

    const videoUrl = file.link;

    const videoRes = await fetch(videoUrl);
    const videoBuffer = await videoRes.arrayBuffer();
    fs.writeFileSync("clip.mp4", Buffer.from(videoBuffer));
    console.log("🎬 Clip downloaded");

    // ------------------------
    // 4. MERGE + CAPTIONS
    // ------------------------
    const cmd = `
    ffmpeg -y -i clip.mp4 -i voice.mp3 \
    -vf "scale=720:-2,
    drawtext=text='IF YOU WANT SUCCESS':fontcolor=white:fontsize=60:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-300,
    drawtext=text='LISTEN CAREFULLY':fontcolor=yellow:fontsize=65:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-220:enable='between(t,2,4)',
    drawtext=text='START SMALL':fontcolor=white:fontsize=60:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-150:enable='between(t,4,6)',
    drawtext=text='STAY CONSISTENT':fontcolor=yellow:fontsize=65:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-80:enable='between(t,6,8)'
    " \
    -map 0:v -map 1:a -shortest -c:v libx264 -c:a aac final.mp4
    `;

    await run(cmd);
    console.log("✅ FINAL VIDEO READY");

    // ------------------------
    // 5. RETURN VIDEO
    // ------------------------
    res.sendFile(`${process.cwd()}/final.mp4`);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send("Error generating video");
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});