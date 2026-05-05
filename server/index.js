import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

// serve final video
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

// ensure folders exist
if (!fs.existsSync("videos")) fs.mkdirSync("videos");
if (!fs.existsSync("public")) fs.mkdirSync("public");

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🔥 START:", prompt);

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is missing" });
    }

    // =========================
    // 1. FETCH VIDEOS (PEXELS)
    // =========================
    const response = await axios.get(
      "https://api.pexels.com/videos/search",
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query: prompt,
          per_page: 3,
        },
      }
    );

    const videos = response.data.videos;

    if (!videos || videos.length === 0) {
      throw new Error("No videos found");
    }

    console.log("✅ Found clips:", videos.length);

    // =========================
    // 2. DOWNLOAD CLIPS
    // =========================
    const clipPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const url = videos[i].video_files[0].link;
      const filePath = `videos/clip_${i}.mp4`;

      console.log(`⬇️ Downloading clip ${i}`);

      const writer = fs.createWriteStream(filePath);
      const videoStream = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      videoStream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // ensure file exists
      if (fs.existsSync(filePath)) {
        clipPaths.push(filePath);
        console.log(`✅ Saved clip_${i}.mp4`);
      } else {
        console.log(`❌ Failed clip_${i}.mp4`);
      }
    }

    if (clipPaths.length === 0) {
      throw new Error("No clips downloaded");
    }

    // =========================
    // 3. CREATE CONCAT FILE
    // =========================
    const listFile = "videos.txt";

    fs.writeFileSync(
      listFile,
      clipPaths.map(p => `file '${path.resolve(p)}'`).join("\n")
    );

    console.log("📄 videos.txt created");

    // =========================
    // 4. STITCH WITH FFMPEG
    // =========================
    const outputPath = "public/final.mp4";

    const command = `
      ffmpeg -y -f concat -safe 0 -i ${listFile} \
      -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
      -c:v libx264 -preset fast -crf 23 \
      -pix_fmt yuv420p \
      -r 30 \
      ${outputPath}
    `;

    console.log("🎬 Running ffmpeg...");

    await new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          console.error("❌ FFmpeg error:", stderr);
          reject(err);
        } else {
          console.log("✅ Video stitched");
          resolve();
        }
      });
    });

    // =========================
    // 5. RETURN VIDEO URL
    // =========================
    const videoUrl = `${req.protocol}://${req.get("host")}/final.mp4`;

    console.log("🎉 DONE:", videoUrl);

    res.json({
      success: true,
      videoUrl,
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});