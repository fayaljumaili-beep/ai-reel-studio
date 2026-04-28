import express from "express";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

const ROOT = process.cwd();

// ✅ Your files (must exist exactly)
const CLIPS = [
  path.join(ROOT, "server/assets/clip-0.mp4"),
  path.join(ROOT, "server/assets/clip-1.mp4"),
  path.join(ROOT, "server/assets/clip-2.mp4"),
];

const AUDIO = path.join(ROOT, "server/assets/music.mp3");

const MERGED = path.join(ROOT, "server/merged.mp4");
const OUTPUT = path.join(ROOT, "server/output.mp4");

const CAPTION = "Success starts with action";

app.get("/", (req, res) => {
  res.send("🚀 AI Reel Backend Running");
});

app.get("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    // 🧹 cleanup old files
    if (fs.existsSync(MERGED)) fs.unlinkSync(MERGED);
    if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);

    // 🎬 STEP 1: CONCAT (REAL FIX)
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(CLIPS[0])
        .input(CLIPS[1])
        .input(CLIPS[2])
        .complexFilter([
          {
            filter: "concat",
            options: {
              n: 3,
              v: 1,
              a: 0,
            },
          },
        ])
        .outputOptions(["-pix_fmt yuv420p"])
        .on("start", (cmd) => console.log("Concat cmd:", cmd))
        .on("end", () => {
          console.log("✅ Clips merged");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ Concat error:", err.message);
          reject(err);
        })
        .save(MERGED);
    });

    // 🎵 STEP 2: ADD AUDIO + CAPTIONS
    ffmpeg(MERGED)
      .input(AUDIO)
      .outputOptions([
        "-map 0:v",
        "-map 1:a",
        "-shortest",

        // 📱 vertical + caption
        `-vf scale=720:1280,drawtext=text='${CAPTION}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-150`,

        "-pix_fmt yuv420p",
      ])
      .on("start", (cmd) => console.log("Final cmd:", cmd))
      .on("end", () => {
        console.log("✅ Final video ready");
        res.sendFile(OUTPUT);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).json({ error: err.message });
      })
      .save(OUTPUT);

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});