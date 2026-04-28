import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Absolute paths (Railway-safe)
const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const OUTPUT = path.join(process.cwd(), "server/output.mp4");

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/generate-video", async (req, res) => {
  console.log("🎬 HIT /generate-video");

  try {
    // ✅ Check files exist
    for (const clip of CLIPS) {
      if (!fs.existsSync(clip)) {
        console.error("❌ Missing file:", clip);
        return res.status(500).send(`Missing file: ${clip}`);
      }
    }

    // ✅ Remove old output if exists
    if (fs.existsSync(OUTPUT)) {
      fs.unlinkSync(OUTPUT);
    }

    const command = ffmpeg();

    // Add inputs
    CLIPS.forEach((clip) => command.input(clip));

    command
      .on("start", (cmd) => {
        console.log("🚀 FFmpeg started:", cmd);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        if (!res.headersSent) {
          res.status(500).send("FFmpeg failed");
        }
      })
      .on("end", () => {
        console.log("✅ Video generated");

        if (!fs.existsSync(OUTPUT)) {
          return res.status(500).send("Output not found");
        }

        res.sendFile(OUTPUT);
      })

      // 🔥 SIMPLE CONCAT (NO FILTERS)
      .mergeToFile(OUTPUT);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send("Server failed");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});