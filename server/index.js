import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

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

    // -----------------------------
    // SCRIPT
    // -----------------------------
    const script =
      "If you want success, listen carefully. Most people quit too early. Stay disciplined. Keep showing up even when it's hard. Success is built daily.";

    // -----------------------------
    // VOICE
    // -----------------------------
    const voiceRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
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

    // -----------------------------
    // GET MULTIPLE CLIPS
    // -----------------------------
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=3`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    const pexelsData = await pexelsRes.json();

    const clips = pexelsData.videos.slice(0, 3);

    for (let i = 0; i < clips.length; i++) {
      const videoUrl = clips[i].video_files[0].link;

      const videoRes = await fetch(videoUrl);

      const buffer = await videoRes.arrayBuffer();

      fs.writeFileSync(`clip${i}.mp4`, Buffer.from(buffer));
    }

    console.log("🎬 Clips downloaded:", clips.length);

    // -----------------------------
    // COMBINE CLIPS
    // -----------------------------
    fs.writeFileSync(
      "inputs.txt",
      `
file 'clip0.mp4'
file 'clip1.mp4'
file 'clip2.mp4'
`
    );

    await run(
      `ffmpeg -y -f concat -safe 0 -i inputs.txt -c copy combined.mp4`
    );

    console.log("📎 Clips combined");

    // -----------------------------
    // INSANE CAPTIONS
    // -----------------------------
    const words = script.split(" ");

    let filters = [];

    words.forEach((word, i) => {
      const start = (i * 0.8).toFixed(2);
      const end = ((i + 1) * 0.8).toFixed(2);

      const cleanWord = word
        .replace(/'/g, "\\\\'")
        .replace(/:/g, "\\:")
        .replace(/,/g, "\\,");

      // white word
      filters.push(
        `drawtext=text='${cleanWord}':fontcolor=white:fontsize=48:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h/2):enable='between(t\\,${start}\\,${end})'`
      );

      // highlighted word
      filters.push(
        `drawtext=text='${cleanWord}':fontcolor=yellow:fontsize=60:borderw=6:bordercolor=black:x=(w-text_w)/2:y=(h/2)+60:enable='between(t\\,${start}\\,${end})'`
      );
    });

    const filterGraph = filters.join(",");

    fs.writeFileSync("filters.txt", filterGraph);

    // -----------------------------
    // FINAL VIDEO
    // -----------------------------
    await run(`
ffmpeg -y \
-i combined.mp4 \
-i voice.mp3 \
-filter_complex_script filters.txt \
-map 0:v \
-map 1:a \
-shortest \
output.mp4
`);

    console.log("✅ FINAL VIDEO READY");

    const video = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");

    res.send(video);
  } catch (err) {
    console.error("❌ ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});