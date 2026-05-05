import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 Serve videos publicly
app.use(express.static(process.cwd()));

const PORT = process.env.PORT || 8080;

// ===== CONFIG =====
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// ===== HELPER: download video =====
async function downloadVideo(url, filename) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(filename);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}

// ===== MAIN ROUTE =====
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const prompt = req.body.prompt || "luxury lifestyle";

    const scenes = [
      prompt,
      "coffee aesthetic",
      "luxury car"
    ];

    const clips = [];

    // ===== DOWNLOAD CLIPS =====
    for (let i = 0; i < scenes.length; i++) {
      const query = scenes[i];
      console.log(`🔎 searching: ${query}`);

      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
        {
          headers: { Authorization: PEXELS_API_KEY },
        }
      );

      const data = await response.json();

      if (!data.videos || data.videos.length === 0) continue;

      const videoUrl = data.videos[0].video_files[0].link;
      const filename = `clip_${i}.mp4`;

      console.log(`⬇️ downloading: ${filename}`);
      await downloadVideo(videoUrl, filename);

      if (fs.existsSync(filename)) {
        console.log(`✅ valid clip: ${filename}`);
        clips.push(filename);
      }
    }

    if (clips.length === 0) {
      return res.status(400).json({ error: "No clips found" });
    }

    console.log("🎬 clips ready:", clips);

    // ===== CREATE CONCAT FILE =====
    const listFile = "videos.txt";
    fs.writeFileSync(
      listFile,
      clips.map(c => `file '${path.resolve(c)}'`).join("\n")
    );

    // ===== STITCH =====
    console.log("🎞 stitching...");
    execSync(
      `ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy stitched.mp4`
    );

    // ===== LOOP (make longer) =====
    console.log("🔁 looping...");
    execSync(
      `ffmpeg -y -stream_loop 2 -i stitched.mp4 -c copy final.mp4`
    );

    console.log("✅ FINAL READY");

    // ===== RESPONSE =====
    const videoUrl = `https://${req.headers.host}/final.mp4`;

    res.json({
      video: videoUrl,
      preview: `https://${req.headers.host}/stitched.mp4`
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// ===== HEALTH =====
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 running on ${PORT}`);
});