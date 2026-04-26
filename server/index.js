import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(process.cwd(), "temp");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.post("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    const sceneVideos = [];

    // 🔥 SIMPLE VIDEO SCENES (NO TEXT FILTER)
    for (let i = 0; i < 3; i++) {
      const scenePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input("color=c=black:s=720x1280:d=2")
          .inputFormat("lavfi")
          .outputOptions([
            "-c:v libx264",
            "-t 2",
            "-pix_fmt yuv420p"
          ])
          .save(scenePath)
          .on("end", resolve)
          .on("error", reject);
      });

      sceneVideos.push(scenePath);
    }

    // 🧾 CONCAT FILE
    const concatFile = path.join(TEMP_DIR, "concat.txt");

    const concatContent = sceneVideos
      .map((p) => `file '${p}'`)
      .join("\n");

    fs.writeFileSync(concatFile, concatContent);

    // 🎥 FINAL VIDEO
    const finalPath = path.join(TEMP_DIR, "final.mp4");

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

    console.log("✅ Video ready");

    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});