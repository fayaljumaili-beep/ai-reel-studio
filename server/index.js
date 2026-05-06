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

    // CLEAN OLD FILES
    [
      "voice.mp3",
      "clip1.mp4",
      "clip2.mp4",
      "clip3.mp4",
      "combined.mp4",
      "final.mp4",
      "list.txt"
    ].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    // =========================
    // 1. GENERATE SCRIPT
    // =========================

    const script = `
Success is built daily.
Most people quit too early.
Discipline changes everything.
Keep going even when it hurts.
`;

    const captions = [
      "SUCCESS IS BUILT DAILY",
      "MOST PEOPLE QUIT TOO EARLY",
      "DISCIPLINE CHANGES EVERYTHING",
      "KEEP GOING EVEN WHEN IT HURTS"
    ];

    // =========================
    // 2. ELEVENLABS VOICE
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
    // 3. DOWNLOAD PEXELS CLIPS
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

      // TRIM EACH CLIP TO 5 SEC
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
    // 4. COMBINE CLIPS
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
    // 5. PREMIUM CAPTIONS
    // =========================

    const drawtexts = captions
      .map((text, i) => {
        const start = i * 3;
        const end = start + 3;

        return `
drawtext=
text='${text}':
fontcolor=yellow:
fontsize=52:
borderw=5:
bordercolor=black:
box=1:
boxcolor=black@0.45:
boxborderw=20:
x=(w-text_w)/2:
y=h-th-300:
enable='between(t,${start},${end})'
`;
      })
      .join(",");

    // =========================
    // 6. FINAL VIDEO
    // =========================

    execSync(`
ffmpeg -y \
-i combined.mp4 \
-i voice.mp3 \
-vf "${drawtexts}" \
-map 0:v \
-map 1:a \
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