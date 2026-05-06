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
    // 1. SCRIPT (longer)
    // ----------------------
    const script = `If you want success, listen carefully. Start small. Stay consistent. Most people quit too early. The difference between winners and losers is discipline. Keep going even when it's hard. Success is built daily.`;

    // ----------------------
    // 2. VOICE (ElevenLabs)
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
    const searchRes = await fetch(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=3`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    const data = await searchRes.json();
    const videos = data.videos.slice(0, 3);

    let clipFiles = [];

    for (let i = 0; i < videos.length; i++) {
      const file =
        videos[i].video_files.find((v) => v.quality === "sd") ||
        videos[i].video_files[0];

      const url = file.link;
      const resClip = await fetch(url);
      const buffer = await resClip.arrayBuffer();

      const filename = `clip${i}.mp4`;
      fs.writeFileSync(filename, Buffer.from(buffer));
      clipFiles.push(filename);
    }

    console.log("🎬 Clips downloaded:", clipFiles.length);

    // ----------------------
    // 4. CONCAT CLIPS
    // ----------------------
    fs.writeFileSync(
      "list.txt",
      clipFiles.map((c) => `file '${c}'`).join("\n")
    );

    await run(
      "ffmpeg -y -f concat -safe 0 -i list.txt -c copy combined.mp4"
    );

    console.log("🔗 Clips combined");

    // ----------------------
    // 5. GET AUDIO DURATION
    // ----------------------
    const duration = script.split(" ").length * 0.45;

    // ----------------------
    // 6. TIKTOK CAPTIONS
    // ----------------------
    const words = script.split(" ");
    const chunkSize = 3;
    let chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    const chunkDuration = duration / chunks.length;

    let filters = [];

    chunks.forEach((chunk, i) => {
      const start = i * chunkDuration;
      const end = start + chunkDuration;

      const safe = chunk.replace(/:/g, "\\:").replace(/'/g, "\\'");

      // main text
      filters.push(
        `drawtext=text='${safe}':fontcolor=white:fontsize=48:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h/2):enable='between(t,${start},${end})'`
      );

      // highlight last word
      const lastWord = chunk.split(" ").slice(-1)[0];

      filters.push(
        `drawtext=text='${lastWord}':fontcolor=yellow:fontsize=60:borderw=5:bordercolor=black:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,${start},${end})'`
      );
    });

    const filterComplex = filters.join(",");

    // ----------------------
    // 7. FINAL VIDEO
    // ----------------------
    await run(
      `ffmpeg -y -i combined.mp4 -i voice.mp3 -vf "${filterComplex}" -map 0:v -map 1:a -shortest output.mp4`
    );

    console.log("✅ FINAL VIDEO READY");

    // ----------------------
    // 8. RETURN VIDEO
    // ----------------------
    const videoBuffer = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");
    res.send(videoBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to generate video" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));