import express from "express";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// ✅ ASSETS PATH
const ASSETS = `${process.cwd()}/server/assets/videos`;

const LOCAL_VIDEOS = [
  `${ASSETS}/video1.mp4`,
  `${ASSETS}/video2.mp4`,
  `${ASSETS}/video3.mp4`
];

// ✅ MUSIC
const MUSIC_FILE = `${ASSETS}/music.mp3`;

// ✅ FONT
const FONT_FILE = `${ASSETS}/font.ttf`;

//////////////////////////////////////////////////////
// 🎬 SCRIPT
//////////////////////////////////////////////////////
function generateScript() {
  return [
    "Success starts with your mindset",
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit",
  ];
}

//////////////////////////////////////////////////////
// 🧠 CAPTION FILTERS
//////////////////////////////////////////////////////
function buildCaptionFilters(script) {
  return script
    .map((line, i) => {
      const start = i * 3;
      const end = start + 3;

      return `drawtext=text='${line}':fontfile=${FONT_FILE}:fontsize=48:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-120:enable='between(t,${start},${end})'`;
    })
    .join(",");
}

//////////////////////////////////////////////////////
// 🎥 GENERATE VIDEO
//////////////////////////////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const script = generateScript();

    const tempDir = "/tmp";
    const mergedVideo = `${tempDir}/merged.mp4`;
    const finalVideo = `${tempDir}/final.mp4`;

    //////////////////////////////////////////////////////
    // 1. MERGE CLIPS
    //////////////////////////////////////////////////////
    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      LOCAL_VIDEOS.forEach((video) => {
        command.input(video);
      });

      command
        .on("end", resolve)
        .on("error", reject)
        .mergeToFile(mergedVideo, tempDir);
    });

    //////////////////////////////////////////////////////
    // 2. ADD MUSIC + CAPTIONS
    //////////////////////////////////////////////////////
    const captionFilter = buildCaptionFilters(script);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(mergedVideo)
        .input(MUSIC_FILE)
        .outputOptions([
          "-map 0:v:0",
          "-map 1:a:0",
          "-shortest",

          // ✅ FIX ALL YOUR PREVIOUS ERRORS
          "-vf scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2",

          "-pix_fmt yuv420p",
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(finalVideo);
    });

    //////////////////////////////////////////////////////
    // 3. SEND VIDEO
    //////////////////////////////////////////////////////
    res.sendFile(finalVideo);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////////////////////////////////////////////
// 🚀 START SERVER
//////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});