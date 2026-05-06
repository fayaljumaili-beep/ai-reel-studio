import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🔥 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;
    console.log("🔥 START:", idea);

    // -------------------------
    // 1. SCRIPT (simple for now)
    // -------------------------
    const script = `Live your best life. ${idea}. Success starts today.`;
    console.log("🧠 Script ready");

    // -------------------------
    // 2. VOICE (ElevenLabs)
    // -------------------------
    const voiceRes = await axios.post(
      "https://api.elevenlabs.io/v1/text-to-speech/dPah2VEoifKnZT37774q",
      {
        text: script,
        model_id: "eleven_monolingual_v1"
      },
      {
        responseType: "arraybuffer",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const voicePath = `${TEMP_DIR}/voice.mp3`;
    fs.writeFileSync(voicePath, voiceRes.data);
    console.log("🎤 Voice ready");

    // -------------------------
    // 3. GET 1 SMALL VIDEO
    // -------------------------
    const clipsRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY
        }
      }
    );

    const video = clipsRes.data.videos[0];
    const file =
      video.video_files.find(v => v.quality === "sd") ||
      video.video_files[0];

    const videoUrl = file.link;

    const videoPath = `${TEMP_DIR}/clip.mp4`;

    const videoBuffer = await axios.get(videoUrl, {
      responseType: "arraybuffer"
    });

    fs.writeFileSync(videoPath, videoBuffer.data);
    console.log("🎬 Clip downloaded");

    // -------------------------
    // 4. MERGE VIDEO + VOICE (FAST)
    // -------------------------
    const outputPath = `${TEMP_DIR}/final.mp4`;

    await execPromise(`
      ffmpeg -y \
      -i ${videoPath} \
      -i ${voicePath} \
      -map 0:v:0 \
      -map 1:a:0 \
      -shortest \
      -vf "scale=720:-2" \
      -preset ultrafast \
      -crf 32 \
      -c:v libx264 \
      -c:a aac \
      ${outputPath}
    `);

    console.log("✅ FINAL VIDEO READY");

    // -------------------------
    // 5. RETURN VIDEO
    // -------------------------
    const videoFile = fs.readFileSync(outputPath);

    res.setHeader("Content-Type", "video/mp4");
    res.send(videoFile);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});