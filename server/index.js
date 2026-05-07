import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("AI Reel Generator Backend Running 🚀");
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🔥 START:", prompt);

    // -----------------------------------
    // ELEVENLABS VOICE GENERATION
    // -----------------------------------

    const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

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

    fs.writeFileSync("voice.mp3", voiceResponse.data);

    console.log("🎤 Voice ready");

    // -----------------------------------
    // CHECK FILES
    // -----------------------------------

    if (!fs.existsSync("sample.jpg")) {
      throw new Error("sample.jpg missing");
    }

    if (!fs.existsSync("server/music.mp3")) {
      throw new Error("server/music.mp3 missing");
    }

    console.log("🖼️ Image exists");
    console.log("🎵 Music exists");

    // -----------------------------------
    // GENERATE VIDEO
    // -----------------------------------

    await new Promise((resolve, reject) => {
      exec(
        `
ffmpeg -y \
-loop 1 -i sample.jpg \
-i voice.mp3 \
-stream_loop -1 -i server/music.mp3 \
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
output.mp4
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

    res.json({
      success: true,
      videoUrl: "/output.mp4",
    });
  } catch (error) {
    console.error("❌ ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use(express.static("."));

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});