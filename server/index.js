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
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });

app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;

    console.log("🔥 START:", idea);

    // cleanup
    const files = [
      "clip1.mp4",
      "clip2.mp4",
      "clip3.mp4",
      "combined.mp4",
      "voice.mp3",
      "output.mp4",
      "list.txt",
    ];

    files.forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    // =========================
    // SCRIPT
    // =========================

    const script = `
Success is built daily.
Most people quit too early.
Discipline changes everything.
Keep going.
`;

    // =========================
    // ELEVENLABS VOICE
    // =========================

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

    // =========================
    // PEXELS VIDEOS
    // =========================

    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        idea
      )}&per_page=3`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    const pexelsData = await pexelsRes.json();

    if (!pexelsData.videos || pexelsData.videos.length === 0) {
      return res.status(500).json({
        error: "No videos found",
      });
    }

    // download clips
    for (let i = 0; i < 3; i++) {
      const video = pexelsData.videos[i];

      if (!video) continue;

      const videoUrl = video.video_files[0].link;

      const clipRes = await fetch(videoUrl);

      const clipBuffer = await clipRes.arrayBuffer();

      fs.writeFileSync(`clip${i + 1}.mp4`, Buffer.from(clipBuffer));
    }

    console.log("🎬 Clips downloaded: 3");

    // =========================
    // COMBINE CLIPS
    // =========================

    fs.writeFileSync(
      "list.txt",
      `
file 'clip1.mp4'
file 'clip2.mp4'
file 'clip3.mp4'
`
    );

    await run(`
ffmpeg -y \
-f concat \
-safe 0 \
-i list.txt \
-c copy \
combined.mp4
`);

    console.log("📎 Clips combined");

    // =========================
    // CAPTIONS + EFFECTS
    // =========================

    const captions = [
      "SUCCESS IS BUILT DAILY",
      "MOST PEOPLE QUIT TOO EARLY",
      "DISCIPLINE CHANGES EVERYTHING",
      "KEEP GOING"
    ];

    let captionFilters = [];

    captions.forEach((text, i) => {
      const start = i * 3;
      const end = start + 3;

      // BIG MAIN TEXT
      captionFilters.push(
        `drawtext=text='${text}':fontcolor=yellow:fontsize=72:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h-260:enable='between(t\\,${start}\\,${end})'`
      );

      // TOP TEXT
      captionFilters.push(
        `drawtext=text='MINDSET':fontcolor=white:fontsize=32:borderw=3:bordercolor=black:x=(w-text_w)/2:y=120:enable='between(t\\,${start}\\,${end})'`
      );
    });

    const finalFilter = `
scale=720:1280,
zoompan=z='min(zoom+0.0008,1.08)':d=1:
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)',
${captionFilters.join(",")}
`;

    // =========================
    // FINAL VIDEO
    // =========================

    await run(`
ffmpeg -y \
-i combined.mp4 \
-i voice.mp3 \
-vf "${finalFilter}" \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
-r 24 \
-c:a aac \
-b:a 128k \
-shortest \
output.mp4
`);

    console.log("✅ FINAL VIDEO READY");

    // =========================
    // SEND VIDEO
    // =========================

    const videoBuffer = fs.readFileSync("output.mp4");

    res.setHeader("Content-Type", "video/mp4");

    res.send(videoBuffer);

  } catch (err) {
    console.log("❌ ERROR:", err);

    res.status(500).json({
      error: "Failed to generate video",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});