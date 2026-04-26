import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// ✅ FIXED CORS (IMPORTANT)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

ffmpeg.setFfmpegPath(ffmpegPath);

// 📁 temp folder
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🎬 generate endpoint
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, length = "60" } = req.body;

    // 🎯 duration logic
    let duration = 60;
    if (length === "30") duration = 30;
    if (length === "90") duration = 90;

    // 🎬 scenes (3–5 scenes)
    const sceneCount = 4;
    const sceneDuration = Math.floor(duration / sceneCount);

    // 🔥 fetch images (placeholder free API)
    const imageUrls = [];
    for (let i = 0; i < sceneCount; i++) {
      imageUrls.push(`https://picsum.photos/1080/1920?random=${Date.now()}${i}`);
    }

    // 📥 download images
    const imagePaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imgPath = path.join(TEMP_DIR, `img${i}.jpg`);
      const response = await fetch(imageUrls[i]);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(imgPath, Buffer.from(buffer));
      imagePaths.push(imgPath);
    }

    // 🎬 create scene videos
    const sceneVideos = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const scenePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg(imagePaths[i])
          .loop(sceneDuration)
          .outputOptions([
            "-vf scale=1080:1920",
            "-t " + sceneDuration,
            "-r 30"
          ])
          .save(scenePath)
          .on("end", resolve)
          .on("error", reject);
      });

      sceneVideos.push(scenePath);
    }

    // 📄 concat file
    const concatFile = path.join(TEMP_DIR, "concat.txt");
    const concatContent = sceneVideos
      .map(v => `file '${path.resolve(v)}'`)
      .join("\n");

    fs.writeFileSync(concatFile, concatContent);

    // 🎥 final video
    const finalPath = path.join(TEMP_DIR, "final.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c copy"
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // 📤 send video
    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// 🚀 start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on " + PORT);
});