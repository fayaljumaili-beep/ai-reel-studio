import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

// ensure public folder exists
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

// helper: run shell command
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ CMD ERROR:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// download file
async function downloadFile(url, output) {
  const writer = fs.createWriteStream(output);
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

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("🎯 Prompt:", prompt);

    // 1. FETCH VIDEOS FROM PEXELS
    const response = await axios.get(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=5`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = response.data.videos;

    if (!videos || videos.length === 0) {
      return res.json({ error: "No videos found" });
    }

    console.log("📦 Videos fetched:", videos.length);

    // 2. DOWNLOAD CLIPS
    const clips = [];

    for (let i = 0; i < Math.min(5, videos.length); i++) {
      const videoFile = videos[i].video_files[0].link;
      const filePath = `public/clip_${i}.mp4`;

      console.log("⬇️ Downloading:", videoFile);

      await downloadFile(videoFile, filePath);
      clips.push(filePath);
    }

    console.log("✅ Clips downloaded:", clips);

    // 3. CREATE CONCAT FILE (FIXED PATH BUG HERE)
    const concatContent = clips
      .map((clip) => `file '${clip.replace("public/", "")}'`)
      .join("\n");

    fs.writeFileSync("public/concat.txt", concatContent);

    console.log("📝 Concat file created:");
    console.log(concatContent);

    // 4. MERGE WITH FFMPEG
    const outputVideo = "public/final.mp4";

    const ffmpegCmd = `
      ffmpeg -y -f concat -safe 0 -i public/concat.txt -c copy ${outputVideo}
    `;

    console.log("🎬 Running ffmpeg...");
    await run(ffmpegCmd);

    console.log("✅ FINAL VIDEO READY");

    // 5. RETURN VIDEO URL
    res.json({
      videoUrl: "/final.mp4",
    });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// health check
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});