import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync("temp")) {
  fs.mkdirSync("temp");
}

// DOWNLOAD FUNCTION
async function downloadVideo(url, outputPath) {
  const res = await fetch(url);

  if (!res.ok) throw new Error("Download failed");

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length < 10000) {
    throw new Error("Invalid video");
  }

  fs.writeFileSync(outputPath, buffer);
}

// MAIN
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating:", prompt);

    // how many clips (each ~5s)
    const clipsNeeded = Math.ceil(duration / 5);

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=${clipsNeeded}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      throw new Error("No videos found");
    }

    let scenePaths = [];

    // 🔥 DOWNLOAD MULTIPLE CLIPS
    for (let i = 0; i < clipsNeeded; i++) {
      const video = data.videos[i];

      const videoUrl = video.video_files.find(
        (v) => v.file_type === "video/mp4"
      )?.link;

      if (!videoUrl) continue;

      const filePath = `temp/scene${i}.mp4`;

      await downloadVideo(videoUrl, filePath);

      scenePaths.push(filePath);
    }

    if (scenePaths.length === 0) {
      throw new Error("No valid clips downloaded");
    }

    // 🔥 CREATE CONCAT FILE
    const concatFile = "temp/concat.txt";
    fs.writeFileSync(
      concatFile,
      scenePaths.map((p) => `file '${path.resolve(p)}'`).join("\n")
    );

    const finalPath = "temp/output.mp4";

    // 🔥 CONCAT VIDEOS
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p",
          "-c:a aac",
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Multi-scene video ready");

    res.sendFile(path.resolve(finalPath));
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});