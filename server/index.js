import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;

// 📁 Temp folder
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🧹 Clean temp
function cleanTemp() {
  const files = fs.readdirSync(TEMP_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(TEMP_DIR, file));
  }
}

// 🎬 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    console.log("📦 BODY:", req.body);

    // ✅ Accept BOTH (prevents bugs forever)
    const idea = req.body?.idea || req.body?.prompt;

    if (!idea || idea.trim() === "") {
      console.log("❌ No idea provided");
      return res.status(400).json({ error: "No idea provided" });
    }

    console.log("🔥 START:", idea);

    cleanTemp();

    // 🎯 Fetch videos
    const searchRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(idea)}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = searchRes.data.videos;

    if (!videos?.length) {
      return res.status(400).json({ error: "No videos found" });
    }

    console.log("✅ Found clips:", videos.length);

    // 🎥 Download clips
    const clipPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const file = videos[i].video_files.find(
        (f) => f.quality === "sd" || f.quality === "hd"
      );

      if (!file?.link) continue;

      const outputPath = path.join(TEMP_DIR, `clip_${i}.mp4`);

      console.log("⬇️ Downloading:", file.link);

      const response = await axios({
        url: file.link,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(outputPath);

      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      clipPaths.push(outputPath);
      console.log("✅ Saved:", outputPath);
    }

    if (clipPaths.length === 0) {
      return res.status(400).json({ error: "No clips downloaded" });
    }

    // 🧩 Create concat file
    const listPath = path.join(TEMP_DIR, "videos.txt");

    const fileList = clipPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    fs.writeFileSync(listPath, fileList);

    console.log("📄 videos.txt created");

    // 🎞 FFmpeg
    const outputVideo = path.join(TEMP_DIR, "final.mp4");

    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k "${outputVideo}"`;

    console.log("🎬 Running ffmpeg...");
    execSync(ffmpegCmd);

    console.log("✅ FINAL VIDEO READY");

    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    res.json({ video: videoUrl });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// 📡 Serve video
app.get("/final.mp4", (req, res) => {
  const filePath = path.join(TEMP_DIR, "final.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  res.sendFile(path.resolve(filePath));
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});