import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(cors());
app.use(express.json());

// ensure temp folder exists
if (!fs.existsSync("temp")) {
  fs.mkdirSync("temp");
}

// 🔥 DOWNLOAD FUNCTION (FIXES YOUR ERROR)
async function downloadVideo(url, outputPath) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("❌ Failed to download video");
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // 🚨 CRITICAL FIX
  if (buffer.length < 10000) {
    throw new Error("❌ Invalid video (too small)");
  }

  fs.writeFileSync(outputPath, buffer);
  console.log("✅ Saved:", outputPath);
}

// 🎬 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🔥 Request received");

    const { prompt } = req.body;

    // 🔥 GET VIDEO FROM PEXELS
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        prompt
      )}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      throw new Error("❌ No videos found");
    }

    // 🔥 GET VALID MP4
    const videoUrl =
      data.videos[0].video_files.find(
        (v) => v.file_type === "video/mp4"
      )?.link;

    if (!videoUrl) {
      throw new Error("❌ No valid MP4 found");
    }

    const scenePath = "temp/scene1.mp4";

    // 🔥 DOWNLOAD VIDEO (FIXED)
    await downloadVideo(videoUrl, scenePath);

    // 🔥 SAFETY CHECK
    if (!fs.existsSync(scenePath)) {
      throw new Error("❌ Scene file missing");
    }

    const finalPath = "temp/output.mp4";

    // 🎬 PROCESS VIDEO (SIMPLE + SAFE)
    await new Promise((resolve, reject) => {
      ffmpeg(scenePath)
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p",
          "-c:a aac",
          "-shortest",
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
  console.log("🚀 Server running on port 8080");
});