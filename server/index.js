import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Absolute paths (Railway-safe)
const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const MUSIC = path.join(process.cwd(), "server/assets/music.mp3");
const OUTPUT = path.join(process.cwd(), "output.mp4");

app.get("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    // Step 1: concat clips
    const command = ffmpeg();

    CLIPS.forEach((clip) => {
      command.input(clip);
    });

    command
      .complexFilter([
        {
          filter: "concat",
          options: {
            n: CLIPS.length,
            v: 1,
            a: 0,
          },
        },
      ])
      .outputOptions([
        "-vf",
        "drawtext=text='Stay focused':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-100",
      ])
      .input(MUSIC)
      .outputOptions([
        "-map 0:v",
        "-map 1:a",
        "-shortest",
        "-pix_fmt yuv420p",
      ])
      .on("start", (cmd) => console.log("FFmpeg:", cmd))
      .on("end", () => {
        console.log("✅ Done");
        res.sendFile(OUTPUT);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).send(err.message);
      })
      .save(OUTPUT);
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});