import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { pipeline } from "stream";
import { promisify } from "util";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath.path);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TEMP_DIR = "/tmp";

const streamPipeline = promisify(pipeline);

//////////////////////////////
// 🔥 SAFE DOWNLOAD (FIXED)
//////////////////////////////
async function downloadFile(url, filepath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${url}`);
  }

  await streamPipeline(response.body, fs.createWriteStream(filepath));

  const stats = fs.statSync(filepath);

  if (stats.size < 100000) {
    throw new Error("Downloaded file too small (corrupted)");
  }

  console.log("Downloaded:", filepath, stats.size);
}

//////////////////////////////
// 🧠 SCRIPT (TEMP)
//////////////////////////////
function generateScript(prompt) {
  return [
    "Success starts with your mindset",
    "Discipline beats motivation every time",
    "Small habits create big results",
    "Stay focused and never quit"
  ];
}

//////////////////////////////
// 🎬 VIDEO SOURCES
//////////////////////////////
function getVideos() {
  return [
    "https://videos.pexels.com/video-files/3195394/3195394-hd_720_1280_25fps.mp4",
    "https://videos.pexels.com/video-files/855564/855564-hd_720_1280_25fps.mp4",
    "https://videos.pexels.com/video-files/3209298/3209298-hd_720_1280_25fps.mp4",
    "https://videos.pexels.com/video-files/854081/854081-hd_720_1280_25fps.mp4"
  ];
}

//////////////////////////////
// 🔊 AI VOICE
//////////////////////////////
async function generateVoice(text, outputPath) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text
    })
  });

  if (!response.ok) {
    throw new Error("TTS failed");
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log("Voice generated");
}

//////////////////////////////
// 🚀 MAIN ROUTE
//////////////////////////////
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const script = generateScript(prompt);
    const videos = getVideos();

    const clips = [];

    console.log("SCRIPT:", script);

    //////////////////////////////
    // 🎬 CREATE CLIPS
    //////////////////////////////
    for (let i = 0; i < script.length; i++) {
      const videoUrl = videos[i % videos.length];

      const inputPath = `${TEMP_DIR}/input_${i}.mp4`;
      const outputPath = `${TEMP_DIR}/clip_${i}.mp4`;

      await downloadFile(videoUrl, inputPath);

      const caption = script[i];
      const hook = "This will change your life";

      const isFirst = i === 0;

      const textFilter = isFirst
        ? `drawtext=text='${hook}':fontcolor=yellow:fontsize=60:x=(w-text_w)/2:y=150,
           drawtext=text='${caption}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200`
        : `drawtext=text='${caption}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200`;

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec("libx264") // 🔥 force re-encode
          .setStartTime(0)
          .setDuration(4)
          .videoFilters([
            "scale=720:1280",
            textFilter
          ])
          .outputOptions([
            "-preset veryfast",
            "-crf 28",
            "-pix_fmt yuv420p"
          ])
          .save(outputPath)
          .on("end", resolve)
          .on("error", reject);
      });

      clips.push(outputPath);
    }

    console.log("CLIPS:", clips);

    //////////////////////////////
    // 🔗 CONCAT
    //////////////////////////////
    const listFile = `${TEMP_DIR}/list.txt`;

    fs.writeFileSync(
      listFile,
      clips.map(c => `file '${c}'`).join("\n")
    );

    const mergedVideo = `${TEMP_DIR}/merged.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(mergedVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////
    // 🔊 VOICE
    //////////////////////////////
    const fullScript = script.join(". ");
    const audioPath = `${TEMP_DIR}/voice.mp3`;

    await generateVoice(fullScript, audioPath);

    //////////////////////////////
    // 🎥 FINAL MERGE
    //////////////////////////////
    const finalVideo = `${TEMP_DIR}/final.mp4`;

    await new Promise((resolve, reject) => {
      ffmpeg(mergedVideo)
        .input(audioPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest"
        ])
        .save(finalVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    //////////////////////////////
    // 📤 SEND
    //////////////////////////////
    res.sendFile(finalVideo);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});