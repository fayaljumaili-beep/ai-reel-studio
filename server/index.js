import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const __dirname = path.resolve();

// Simple in-memory job store
const jobs = new Map();

app.get("/", (req, res) => {
  res.send("AI Reel Generator Backend Running 🚀");
});

app.get("/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({ status: "not_found" });
  }

  res.json(job);
});

app.post("/generate-video", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  const jobId = Date.now().toString();
  jobs.set(jobId, { status: "processing" });

  res.json({ success: true, jobId });

  try {
    console.log("🔥 START:", prompt);

    const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
    const voiceFile = path.join(__dirname, "voice.mp3");
    const outputFile = path.join(__dirname, "output.mp4");
    const sampleImage = path.join(__dirname, "sample.jpg");
    const musicFile = path.join(__dirname, "server", "music.mp3");

    const voiceResponse = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      responseType: "arraybuffer",
      data: {
        text: `Success starts with discipline. ${prompt} is your opportunity to level up and dominate your future.`,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      },
    });

    fs.writeFileSync(voiceFile, voiceResponse.data);
    console.log("🎤 Voice ready");

    if (!fs.existsSync(sampleImage)) {
      throw new Error("sample.jpg missing");
    }

    if (!fs.existsSync(musicFile)) {
      throw new Error("server/music.mp3 missing");
    }

    console.log("🖼️ Image exists");
    console.log("🎵 Music exists");

    await new Promise((resolve, reject) => {
      exec(
        `
ffmpeg -y \
-loop 1 -i "${sampleImage}" \
-i "${voiceFile}" \
-stream_loop -1 -i "${musicFile}" \
-filter_complex "
[0:v]scale=1080:1920,format=yuv420p[v];
[1:a]volume=1[a1];
[2:a]volume=0.15[a2];
[a1][a2]amix=inputs=2:duration=first[a]
" \
-map "[v]" \
-map "[a]" \
-shortest \
-c:v libx264 \
-c:a aac \
-pix_fmt yuv420p \
"${outputFile}"
        `,
        (error, stdout, stderr) => {
          if (error) {
            console.log(stderr);
            reject(error);
          } else {
            console.log("✅ FINAL VIDEO READY");
            resolve();
          }
        }
      );
    });

    jobs.set(jobId, {
      status: "done",
      videoUrl: `/output.mp4?ts=${Date.now()}`,
    });
  } catch (error) {
    console.error("❌ ERROR:", error);
    jobs.set(jobId, {
      status: "error",
      error: error.message,
    });
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});