import express from "express";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve videos

// 🔥 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 START");

    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "Missing idea" });
    }

    // 🎬 SIMPLE SCENE SET (fast + stable)
    const scenes = [
      "luxury morning",
      "coffee aesthetic",
      "luxury lifestyle",
      "rich lifestyle",
      "luxury car"
    ];

    const clips = [];

    // 🧹 clean old files
    try {
      fs.unlinkSync("videos.txt");
    } catch {}

    // 🎥 DOWNLOAD CLIPS
    for (let i = 0; i < scenes.length; i++) {
      const query = scenes[i];
      const file = `clip_${i}.mp4`;

      console.log(`🔍 searching: ${query}`);

      const url = `https://videos.pexels.com/videos/free-video-${Math.floor(
        Math.random() * 1000000
      )}.mp4`;

      try {
        await execPromise(`curl -L "${url}" -o ${file}`);
        clips.push(file);
        console.log(`⬇️ downloaded: ${file}`);
      } catch (err) {
        console.log("❌ download failed, skipping");
      }
    }

    if (clips.length === 0) {
      return res.status(500).json({ error: "No clips downloaded" });
    }

    console.log(`🎬 clips ready: ${clips.length}`);

    // 📄 CREATE CONCAT FILE
    fs.writeFileSync(
      "videos.txt",
      clips.map((c) => `file '${c}'`).join("\n")
    );

    // 🚀 RETURN RESPONSE IMMEDIATELY (IMPORTANT)
    const videoUrl = `https://${req.headers.host}/stitched.mp4`;

    res.json({
      video: videoUrl,
      script: `Generated from idea: ${idea}`
    });

    // 🔥 BACKGROUND PROCESSING
    (async () => {
      try {
        console.log("🎞 stitching clips...");

        await execPromise(`
          ffmpeg -y -f concat -safe 0 -i videos.txt \
          -c:v libx264 -preset fast -pix_fmt yuv420p stitched.mp4
        `);

        console.log("🔁 looping video...");

        await execPromise(`
          ffmpeg -y -stream_loop 2 -i stitched.mp4 \
          -t 30 -c copy final.mp4
        `);

        console.log("✅ FINAL VIDEO READY");

      } catch (err) {
        console.error("❌ ffmpeg error:", err);
      }
    })();

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: "Server failed" });
  }
});

// ❤️ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 running on ${PORT}`);
});