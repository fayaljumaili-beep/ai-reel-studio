import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ENV
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// TEMP DIR
const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// ------------------------
// 🎬 GENERATE VIDEO
// ------------------------
app.post("/generate-video", async (req, res) => {
  try {
    const { idea } = req.body;
    console.log("🔥 START:", idea);

    if (!idea) return res.status(400).json({ error: "No idea provided" });

    // ------------------------
    // 1. GENERATE SCRIPT (OpenAI)
    // ------------------------
    const scriptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Write a short viral reel script about: ${idea}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const script = scriptRes.data.choices[0].message.content;
    console.log("🧠 Script ready");

    // ------------------------
    // 2. GENERATE VOICE (ElevenLabs)
    // ------------------------
    const voiceRes = await axios.post(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        text: script,
        model_id: "eleven_monolingual_v1",
      },
      {
        responseType: "arraybuffer",
        headers: {
          "xi-api-key": ELEVEN_API_KEY, // ✅ IMPORTANT
          "Content-Type": "application/json",
        },
      }
    );

    const voicePath = path.join(TEMP_DIR, "voice.mp3");
    fs.writeFileSync(voicePath, voiceRes.data);
    console.log("🎤 Voice ready");

    // ------------------------
    // 3. GET CLIPS (Pexels)
    // ------------------------
    const clipsRes = await axios.get(
      `https://api.pexels.com/videos/search?query=${idea}&per_page=3`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    const videos = clipsRes.data.videos;

    if (!videos.length) {
      return res.status(500).json({ error: "No clips found" });
    }

    console.log("📦 Found clips:", videos.length);

    const videoPaths = [];

    for (let i = 0; i < videos.length; i++) {
      const url = videos[i].video_files[0].link;
      const filePath = path.join(TEMP_DIR, `clip_${i}.mp4`);

      const response = await axios.get(url, {
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      videoPaths.push(filePath);
    }

    console.log("⬇️ Clips downloaded");

    // ------------------------
    // 4. CREATE CONCAT FILE
    // ------------------------
    const listPath = path.join(TEMP_DIR, "videos.txt");

    const listContent = videoPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    // ------------------------
    // 5. STITCH VIDEO (LOW MEMORY)
    // ------------------------
    console.log("🎬 Running ffmpeg stitch...");

    await execPromise(`
      ffmpeg -y \
      -f concat -safe 0 -i ${listPath} \
      -vf scale=720:-2 \
      -preset ultrafast \
      -crf 32 \
      -c:v libx264 \
      -r 24 \
      ${TEMP_DIR}/stitched.mp4
    `);

    // ------------------------
    // 6. ADD VOICE
    // ------------------------
    console.log("🔊 Adding voice...");

    await execPromise(`
      ffmpeg -y \
      -i ${TEMP_DIR}/stitched.mp4 \
      -i ${voicePath} \
      -shortest \
      -c:v copy \
      -c:a aac \
      ${TEMP_DIR}/final.mp4
    `);

    console.log("✅ FINAL VIDEO READY");

    // ------------------------
    // 7. RETURN VIDEO
    // ------------------------
    res.sendFile(path.resolve(`${TEMP_DIR}/final.mp4`));
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

// ------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});