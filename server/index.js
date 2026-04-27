import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// 🔧 helper to run ffmpeg
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ FFmpeg error:", stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// 🎬 GET STOCK VIDEO FROM PEXELS
async function getStockVideo(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error("No videos found");
  }

  const video = data.videos[Math.floor(Math.random() * data.videos.length)];

  const file =
    video.video_files.find((v) => v.quality === "sd") ||
    video.video_files[0];

  return file.link;
}

// 🚀 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { text, style, aesthetic, duration, voice } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log("🎬 Request:", { text, style, aesthetic, duration, voice });

    const tempVideo = path.join(__dirname, "temp.mp4");
    const captionsPath = path.join(__dirname, "captions.srt");
    const outputVideo = path.join(__dirname, "output.mp4");

    // 📝 captions
    const captionContent = `1
00:00:00,000 --> 00:00:05,000
${text}
`;

    fs.writeFileSync(captionsPath, captionContent);

    // 🎞️ fetch stock video
    console.log("📥 Fetching stock video...");
    const videoUrl = await getStockVideo(text);

    // download video
    await runCommand(`curl -L "${videoUrl}" -o "${tempVideo}"`);

    // fix subtitle path (linux)
    const safeCaptionsPath = captionsPath.replace(/:/g, "\\:");

    // 🎬 build final video (OPTIMIZED)
    await runCommand(
      `ffmpeg -y -i "${tempVideo}" -t 10 -vf "scale=720:-2,subtitles=${safeCaptionsPath}" -preset ultrafast -crf 28 "${outputVideo}"`
    );

    console.log("✅ Video created:", outputVideo);

    // 🚀 stream response
    res.setHeader("Content-Type", "video/mp4");

    const stream = fs.createReadStream(outputVideo);

    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      res.status(500).end();
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});