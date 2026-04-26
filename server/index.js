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

// DOWNLOAD FILE
async function downloadFile(url, outputPath) {
  const res = await fetch(url);

  if (!res.ok) throw new Error("Download failed");

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length < 10000) {
    throw new Error("Invalid file");
  }

  fs.writeFileSync(outputPath, buffer);
}

// MAIN
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating:", prompt);

    const clipsNeeded = Math.ceil(duration / 5);

    // 🔥 GET VIDEOS
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=${clipsNeeded}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    let scenePaths = [];

    for (let i = 0; i < clipsNeeded; i++) {
      const video = data.videos[i];

      const videoUrl = video.video_files.find(
        (v) => v.file_type === "video/mp4"
      )?.link;

      if (!videoUrl) continue;

      const filePath = `temp/scene${i}.mp4`;

      await downloadFile(videoUrl, filePath);

      scenePaths.push(filePath);
    }

    // 🔥 CONCAT
    const concatFile = "temp/concat.txt";
    fs.writeFileSync(
      concatFile,
      scenePaths.map((p) => `file '${path.resolve(p)}'`).join("\n")
    );

    const stitched = "temp/stitched.mp4";

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c:v libx264", "-preset veryfast", "-pix_fmt yuv420p"])
        .save(stitched)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🔥 DOWNLOAD MUSIC (royalty free sample)
    const musicPath = "temp/music.mp3";

    await downloadFile(
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=upbeat-pop-113997.mp3",
  musicPath
);

    const finalPath = "temp/output.mp4";

    // 🔥 ADD AUDIO
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(stitched)
        .input(musicPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest",
          "-map 0:v:0",
          "-map 1:a:0",
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Video + audio ready");

    res.sendFile(path.resolve(finalPath));
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});