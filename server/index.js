import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = "temp";

// ensure temp folder exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// 🎬 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🎬 Generating video for:", prompt);

    // -----------------------------
    // 1. MOCK SCENES (you can upgrade later)
    // -----------------------------
    const scenes = [
      "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
      "https://videos.pexels.com/video-files/855564/855564-hd_1280_720_25fps.mp4"
    ];

    const videoPaths = [];

    // -----------------------------
    // 2. DOWNLOAD VIDEOS
    // -----------------------------
    for (let i = 0; i < scenes.length; i++) {
      const url = scenes[i];
      const filePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      const response = await fetch(url);
      const buffer = await response.buffer();

      fs.writeFileSync(filePath, buffer);
      videoPaths.push(filePath);
    }

    // -----------------------------
    // 3. CREATE CONCAT FILE
    // -----------------------------
    const concatFile = path.join(TEMP_DIR, "concat.txt");

    const concatContent = videoPaths
      .map((v) => `file '${path.resolve(v)}'`)
      .join("\n");

    fs.writeFileSync(concatFile, concatContent);

    const finalPath = path.join(TEMP_DIR, "final.mp4");

    // -----------------------------
    // 4. CONCAT VIDEOS (SAFE)
    // -----------------------------
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p",
          "-c:a aac",
          "-shortest"
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Video ready:", finalPath);

    // -----------------------------
    // 5. RETURN VIDEO
    // -----------------------------
    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

// -----------------------------
// SERVER
// -----------------------------
app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});