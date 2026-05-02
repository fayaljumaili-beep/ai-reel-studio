import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

ffmpeg.setFfmpegPath(ffmpegPath);

// ensure public folder exists
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

// ===== FETCH VIDEOS FROM PEXELS =====
async function fetchVideos(query) {
  try {
    console.log("🔍 Fetching videos for:", query);

    const response = await axios.get(
      `https://api.pexels.com/videos/search?query=${query}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = response.data.videos;

    if (!videos || videos.length === 0) {
      throw new Error("No videos found");
    }

    return videos.map((v) => v.video_files[0].link);
  } catch (err) {
    console.error("❌ Pexels error:", err.message);
    throw err;
  }
}

// ===== DOWNLOAD FILE =====
async function downloadFile(url, filename) {
  const writer = fs.createWriteStream(filename);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// ===== MAIN ROUTE =====
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🚀 Generate request:", prompt);

    // 1. fetch videos
    const videoUrls = await fetchVideos(prompt);

    // 2. download clips
    const clipPaths = [];

    for (let i = 0; i < videoUrls.length; i++) {
      const filePath = `public/clip_${i}.mp4`;
      console.log("⬇️ Downloading:", videoUrls[i]);

      await downloadFile(videoUrls[i], filePath);
      clipPaths.push(filePath);
    }

    console.log("✅ Files downloaded:", clipPaths);

    // 3. create concat file
    const concatPath = "public/concat.txt";
    const concatContent = clipPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    fs.writeFileSync(concatPath, concatContent);

    console.log("🧩 Concat file created");

    // 4. run ffmpeg
    const outputPath = "public/final.mp4";

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-vf scale=720:1280",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 28",
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    console.log("🎬 FINAL VIDEO READY");

    res.json({
      videoUrl: `/final.mp4`,
    });
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});