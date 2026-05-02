import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

// ensure public folder
if (!fs.existsSync("public")) fs.mkdirSync("public");

// helper
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// download helper
async function download(url, path) {
  const writer = fs.createWriteStream(path);
  const res = await axios({ url, method: "GET", responseType: "stream" });

  return new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// 🎯 SCRIPT GENERATOR
function generateScript(prompt) {
  return [
    `${prompt} starts with mindset.`,
    `Consistency beats motivation.`,
    `Small steps create big wins.`,
    `Discipline builds success.`,
    `Keep going no matter what.`
  ];
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("🎯 Prompt:", prompt);

    // 1. SCRIPT
    const script = generateScript(prompt);
    console.log("🧠 Script:", script);

    // 2. FETCH VIDEOS
    const pexels = await axios.get(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=6`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY }
      }
    );

    const videos = pexels.data.videos;
    if (!videos.length) return res.json({ error: "No videos found" });

    // 3. DOWNLOAD CLIPS
    const clips = [];
    const CLIP_DURATION = 3; // seconds per clip

    for (let i = 0; i < Math.min(script.length, videos.length); i++) {
      const url = videos[i].video_files[0].link;
      const path = `public/clip_${i}.mp4`;

      console.log("⬇️ Downloading:", url);
      await download(url, path);

      // trim each clip to fixed duration
      const trimmed = `public/clip_trim_${i}.mp4`;

      await run(`
        ffmpeg -y -i ${path} -t ${CLIP_DURATION} \
        -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
        -r 30 -c:v libx264 -preset veryfast -crf 23 \
        -an ${trimmed}
      `);

      clips.push(`clip_trim_${i}.mp4`);
    }

    console.log("✅ Trimmed clips:", clips);

    // 4. CONCAT FILE
    const concat = clips.map(c => `file '${c}'`).join("\n");
    fs.writeFileSync("public/concat.txt", concat);

    // 5. MERGE VIDEO
    await run(`
      ffmpeg -y -f concat -safe 0 -i public/concat.txt \
      -c:v libx264 -preset veryfast -crf 23 \
      public/video.mp4
    `);

    console.log("🎬 Video merged");

    // 6. ADD BACKGROUND MUSIC (OPTIONAL SIMPLE VERSION)
    const finalOutput = "public/final.mp4";

    // NOTE: you can replace this with real music later
    await run(`
      ffmpeg -y -i public/video.mp4 \
      -filter:a "volume=0.3" \
      -c:v copy -c:a aac -shortest ${finalOutput}
    `);

    console.log("🎵 Audio processed");

    // 7. RESPONSE
    res.json({
      videoUrl: "/final.mp4",
      script
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

// health
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});