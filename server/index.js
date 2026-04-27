import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import FormData from "form-data";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ FIXED CORS
app.use(cors({
  origin: "*",
}));

// ✅ set ffmpeg path (important for Railway)
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const PORT = process.env.PORT || 5000;
const __dirname = new URL(".", import.meta.url).pathname;

// ==============================
// 🎥 DOWNLOAD STOCK CLIPS
// ==============================
async function downloadClips(query) {
  console.log("📥 Downloading clips...");

  const response = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=3`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  const clips = [];

  for (let i = 0; i < response.data.videos.length; i++) {
    const videoUrl = response.data.videos[i].video_files[0].link;
    const filePath = `clip-${i}.mp4`;

    const writer = fs.createWriteStream(filePath);

    const videoStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    videoStream.data.pipe(writer);

    await new Promise((res) => writer.on("finish", res));

    console.log("✅ Downloaded:", filePath);
    clips.push(filePath);
  }

  return clips;
}

// ==============================
// 🔊 GENERATE VOICE (OpenAI TTS)
// ==============================
async function generateVoice(text) {
  console.log("🎙 Generating voice...");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/speech",
    {
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    }
  );

  const filePath = "voice.mp3";
  fs.writeFileSync(filePath, response.data);

  console.log("✅ Voice saved:", filePath);
  return filePath;
}

// ==============================
// 🎬 BUILD VIDEO (FIXED)
// ==============================
async function buildVideo(clips, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log("🎬 Building video...");

    const command = ffmpeg();

    // add video clips
    clips.forEach((clip) => {
      command.input(clip);
    });

    // STEP 1: concat videos ONLY
    command
      .complexFilter([
        {
          filter: "concat",
          options: {
            n: clips.length,
            v: 1,
            a: 0,
          },
          inputs: clips.map((_, i) => `${i}:v`),
          outputs: "v",
        },
      ])
      .outputOptions(["-map [v]"])
      .output("temp.mp4")
      .on("end", () => {
        console.log("✅ Video stitched");

        // STEP 2: add audio
        ffmpeg()
          .input("temp.mp4")
          .input(audioPath)
          .outputOptions([
            "-map 0:v",
            "-map 1:a",
            "-shortest",
          ])
          .save(outputPath)
          .on("end", () => {
            console.log("✅ Final video ready");
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Audio merge error:", err);
            reject(err);
          });
      })
      .on("error", (err) => {
        console.error("❌ Concat error:", err);
        reject(err);
      })
      .run();
  });
}

// ==============================
// 🚀 API ROUTE
// ==============================
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🧠 Request:", prompt);

    // 1. get clips
    const clips = await downloadClips(prompt);

    // 2. voice
    const voiceFile = await generateVoice(prompt);

    // 3. build video
    const outputPath = path.join(__dirname, "output.mp4");
    await buildVideo(clips, voiceFile, outputPath);

    // 4. send result
    res.sendFile(outputPath);

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err.message);

    res.status(500).json({
      error: err.message || "Video generation failed",
    });
  }
});

// ==============================
app.get("/", (req, res) => {
  res.send("🚀 AI Reel Server Running");
});

// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});