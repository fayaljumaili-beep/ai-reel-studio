import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ MIDDLEWARE
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8080;

// 📁 TEMP DIR
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// 🔥 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { idea } = req.body;

    if (!idea) {
      console.log("❌ No idea provided");
      return res.status(400).json({ error: "No idea provided" });
    }

    console.log("🔥 START:", idea);

    // 🧠 CLEAN CAPTION TEXT (IMPORTANT)
    const caption = idea.toUpperCase().slice(0, 60);
    const safeCaption = caption.replace(/'/g, "").replace(/:/g, "");

    // 🎯 STEP 1: FETCH VIDEOS FROM PEXELS
    const searchRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        idea
      )}&per_page=3`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = searchRes.data.videos;

    if (!videos || videos.length === 0) {
      console.log("❌ No videos found");
      return res.status(400).json({ error: "No videos found" });
    }

    console.log("✅ Found clips:", videos.length);

    // 🎬 STEP 2: DOWNLOAD CLIPS
    const clipPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const file = videos[i].video_files[0];
      const url = file.link;

      const outputPath = path.join(TEMP_DIR, `clip_${i}.mp4`);

      console.log("⬇️ Downloading:", url);

      const response = await axios({
        url,
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

    // 🧩 STEP 3: CREATE CONCAT FILE
    const listPath = path.join(TEMP_DIR, "videos.txt");

    const fileList = clipPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    fs.writeFileSync(listPath, fileList);

    console.log("📄 videos.txt created");

    // 🎞 STEP 4: FFMPEG (WITH CAPTIONS 🔥)
    const outputVideo = path.join(TEMP_DIR, "final.mp4");

    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -vf "scale=720:1280,format=yuv420p,drawtext=text='${safeCaption}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-200" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k "${outputVideo}"`;

    console.log("🎬 Running ffmpeg...");
    execSync(ffmpegCmd);

    console.log("✅ FINAL VIDEO READY");

    // 🌍 STEP 5: RETURN VIDEO URL
    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    res.json({ video: videoUrl });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// 📡 SERVE VIDEO
app.get("/final.mp4", (req, res) => {
  const filePath = path.join(TEMP_DIR, "final.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  res.sendFile(path.resolve(filePath));
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});