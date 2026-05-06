import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("AI Reel Generator Running");
});

app.post("/generate-video", async (req, res) => {
  try {
    const prompt = req.body.prompt || "success mindset";

    console.log("🔥 START:", prompt);

    // =========================
    // CLEAN FILES
    // =========================

    [
      "voice.mp3",
      "clip1.mp4",
      "clip2.mp4",
      "clip3.mp4",
      "combined.mp4",
      "final.mp4",
      "list.txt"
    ].forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // =========================
    // SCRIPT
    // =========================

    const script = `
Success is built daily.
Most people quit too early.
Discipline changes everything.
Keep going even when it hurts.
`;

    // =========================
    // ANIMATED CAPTIONS
    // =========================

    const captions = [
      { text: "SUCCESS", start: 0, end: 1 },
      { text: "IS BUILT", start: 1, end: 2 },
      { text: "DAILY", start: 2, end: 3 },

      { text: "MOST PEOPLE", start: 3, end: 4 },
      { text: "QUIT TOO", start: 4, end: 5 },
      { text: "EARLY", start: 5, end: 6 },

      { text: "DISCIPLINE", start: 6, end: 7 },
      { text: "CHANGES", start: 7, end: 8 },
      { text: "EVERYTHING", start: 8, end: 9 },

      { text: "KEEP GOING", start: 9, end: 10 },
      { text: "EVEN WHEN", start: 10, end: 11 },
      { text: "IT HURTS", start: 11, end: 12 }
    ];

    // =========================
    // ELEVENLABS VOICE
    // =========================

    const voiceResponse = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer",
      data: {
        text: script,
        model_id: "eleven_multilingual_v2"
      }
    });

    fs.writeFileSync("voice.mp3", voiceResponse.data);

    console.log("🎤 Voice ready");

    // =========================
    // GET PEXELS VIDEOS
    // =========================

    const pexels = await axios.get(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    const videos = pexels.data.videos;

    if (!videos.length) {
      return res.status(400).json({
        error: "No videos found"
      });
    }

    // =========================
    // DOWNLOAD + TRIM CLIPS
    // =========================

    for (let i = 0; i < 3; i++) {
      const videoUrl = videos[i].video_files[0].link;

      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(`clip${i + 1}.mp4`);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      execSync(`
ffmpeg -y \
-i clip${i + 1}.mp4 \
-t 5 \
-r 24 \
-s 720x1280 \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
clip${i + 1}_trim.mp4
`);

      fs.renameSync(`clip${i + 1}_trim.mp4`, `clip${i + 1}.mp4`);
    }

    console.log("📎 Clips downloaded + trimmed");

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

    execSync(`
ffmpeg -y \
-f concat \
-safe 0 \
-i list.txt \
-c copy \
combined.mp4
`);

    console.log("📦 Clips combined");

    // =========================
    // PREMIUM CAPTIONS
    // =========================

    const drawtexts = captions
      .map((caption) => {
        return `
drawtext=
text='${caption.text}':
fontcolor=yellow:
fontsize=52:
borderw=6:
bordercolor=black:
box=1:
boxcolor=black@0.5:
boxborderw=30:
x=(w-text_w)/2:
y=h-th-260:
enable='between(t,${caption.start},${caption.end})'
`;
      })
      .join(",");

    // =========================
    // FINAL VIDEO + MUSIC MIX
    // =========================

    execSync(`
ffmpeg -y \
-i combined.mp4 \
-i voice.mp3 \
-i music.mp3 \
-filter_complex "[1:a]volume=1[a1];[2:a]volume=0.15[a2];[a1][a2]amix=inputs=2:duration=shortest[audio]" \
-vf "${drawtexts}" \
-map 0:v \
-map "[audio]" \
-shortest \
-r 24 \
-s 720x1280 \
-c:v libx264 \
-preset ultrafast \
-crf 32 \
-c:a aac \
-b:a 128k \
final.mp4
`);

    console.log("✅ FINAL VIDEO READY");

    res.sendFile(process.cwd() + "/final.mp4");

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Video generation failed",
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});