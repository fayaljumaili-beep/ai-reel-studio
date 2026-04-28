import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// ✅ ASSETS PATH
const ASSETS = `${process.cwd()}/server/assets`;

// ✅ LOCAL VIDEO FILES
const LOCAL_VIDEOS = [
  "server/assets/videos/video1.mp4",
  "server/assets/videos/video2.mp4",
  "server/assets/videos/video3.mp4"
];

// ✅ OUTPUT PATH
const OUTPUT = `${process.cwd()}/output.mp4`;

// ================================
// 🚀 TEST ROUTE (SINGLE VIDEO ONLY)
// ================================
app.post("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating test video...");

    const inputVideo = LOCAL_VIDEOS[0]; // 👈 ONLY ONE VIDEO

    ffmpeg(inputVideo)
      .outputOptions([
        "-pix_fmt yuv420p"
      ])
      .on("start", cmd => console.log("FFmpeg cmd:", cmd))
      .on("end", () => {
        console.log("✅ Video generated");
        res.sendFile(OUTPUT);
      })
      .on("error", err => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).json({ error: err.message });
      })
      .save(OUTPUT);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// 🚀 START SERVER
// ================================
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});