import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ENV
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

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

    // ----------------------
    // 1. LONGER SCRIPT
    // ----------------------
    const script = `
If you want success, listen carefully.
Start small.
Stay consistent.
Most people quit too early.
But winners keep going.
This is how you build real success.
`;

    // ----------------------
    // 2. VOICE
    // ----------------------
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

    // ----------------------
    // 3. GET MULTIPLE CLIPS
    // ----------------------
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=3`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );

    const pexelsData = await pexelsRes.json();

    let clips = [];

    for (let i = 0; i < 3; i++) {
      const video = pexelsData.videos[i];

      const file =
        video.video_files.find((v) => v.quality === "sd") ||
        video.video_files[0];

      const videoUrl = file.link;

      const videoRes = await fetch(videoUrl);
      const videoBuffer = await videoRes.arrayBuffer();

      const filename = `clip${i}.mp4`;
      fs.writeFileSync(filename, Buffer.from(videoBuffer));

      clips.push(filename);
    }

    console.log("🎬 Clips downloaded");

    // ----------------------
    // 4. CONCAT CLIPS
    // ----------------------
    const concatList = clips.map((c) => `file '${c}'`).join("\n");
    fs.writeFileSync("list.txt", concatList);

    await run(`ffmpeg -y -f concat -safe 0 -i list.txt -c copy stitched.mp4`);

    // ----------------------
    // 5. GET AUDIO DURATION
    // ----------------------
    await run(
      `ffprobe -i voice.mp3 -show_entries format=duration -v quiet -of csv="p=0" > duration.txt`
    );

    const duration = parseFloat(
      fs.readFileSync("duration.txt", "utf-8")
    );

    // ----------------------
    // 6. INSANE CAPTIONS
    // ----------------------
    const cleanScript = script.replace(/\n/g, " ");
    const words = cleanScript.split(" ");
    const wordDuration = duration / words.length;

    let filters = [];

    words.forEach((word, i) => {
      const start = i * wordDuration;
      const end = start + wordDuration;

      // full sentence
      filters.push(
        `drawtext=text='${cleanScript}':fontcolor=white:fontsize=40:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-220:enable='between(t,${start},${end})'`
      );

      // highlighted word
      filters.push(
        `drawtext=text='${word}':fontcolor=yellow:fontsize=60:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h-150:enable='between(t,${start},${end})'`
      );
    });

    const filterComplex = filters.join(",");

    // ----------------------
    // 7. FINAL VIDEO
    // ----------------------
    await run(`
      ffmpeg -y -i stitched.mp4 -i voice.mp3 \
      -vf "${filterComplex}" \
      -c:v libx264 -c:a aac -shortest output.mp4
    `);

    console.log("✅ FINAL VIDEO READY");

    const finalVideo = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(finalVideo);
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send("Failed to generate video");
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});