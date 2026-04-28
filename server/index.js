import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// ✅ Absolute paths (Railway safe)
const CLIPS = [
  path.join(process.cwd(), "server/assets/clip-0.mp4"),
  path.join(process.cwd(), "server/assets/clip-1.mp4"),
  path.join(process.cwd(), "server/assets/clip-2.mp4"),
];

const OUTPUT = path.join(process.cwd(), "server/output.mp4");

// ✅ helper to escape text (safe for ffmpeg)
function safeText(text) {
  return text
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

app.get("/generate-video", async (req, res) => {
  try {
    console.log("🎬 Generating video...");

    // ✅ check files exist
    CLIPS.forEach((clip) => {
      if (!fs.existsSync(clip)) {
        throw new Error(`Missing file: ${clip}`);
      }
    });

    const TEXT = safeText("Stay focused");

    const command = ffmpeg();

    // ✅ add all clips
    CLIPS.forEach((clip) => {
      command.input(clip);
    });

    command
      .complexFilter([
        // 🔥 STEP 1: normalize all clips (fix concat crash)
        ...CLIPS.map((_, i) => ({
          filter: "scale",
          options: { w: 720, h: 1280 },
          inputs: `${i}:v`,
          outputs: `v${i}`,
        })),

        // 🔥 STEP 2: concat normalized clips
        {
          filter: "concat",
          options: {
            n: CLIPS.length,
            v: 1,
            a: 0,
          },
          inputs: CLIPS.map((_, i) => `v${i}`),
          outputs: "v",
        },

        // 🔥 STEP 3: add text
        {
          filter: "drawtext",
          options: {
            text: TEXT,
            fontcolor: "white",
            fontsize: 40,
            x: "(w-text_w)/2",
            y: "h-100",
          },
          inputs: "v",
          outputs: "v2",
        },
      ])
      .outputOptions([
        "-map [v2]",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
      ])
      .save(OUTPUT)
      .on("end", () => {
        console.log("✅ Video created");
        res.sendFile(OUTPUT);
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).send(err.message);
      });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("NEW VERSION DEPLOYED");
});