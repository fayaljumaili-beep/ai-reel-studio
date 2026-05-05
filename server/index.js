import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { execSync } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 8080;

/* =========================
   🎥 DOWNLOAD VIDEO
========================= */
async function downloadVideo(url, filename) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filename);
    response.data.pipe(writer);

    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/* =========================
   🔍 GET PEXELS VIDEO
========================= */
async function getPexelsVideo(query) {
  const res = await axios.get("https://api.pexels.com/videos/search", {
    headers: {
      Authorization: process.env.PEXELS_API_KEY
    },
    params: {
      query,
      per_page: 10
    }
  });

  const videos = res.data.videos;

  if (!videos || videos.length === 0) {
    throw new Error("No videos found");
  }

  const random = videos[Math.floor(Math.random() * videos.length)];
  return random.video_files[0].link;
}

/* =========================
   🎙 GENERATE VOICE
========================= */
async function generateVoice(text) {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY");
  }

  const response = await axios({
    method: "POST",
    url: "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    data: {
      text,
      model_id: "eleven_monolingual_v1"
    },
    responseType: "arraybuffer"
  });

  fs.writeFileSync("voice.mp3", response.data);
}

/* =========================
   🎬 GENERATE VIDEO
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🔥 START:", prompt);

    const clips = [];

    // 🔥 GET MULTIPLE CLIPS
    for (let i = 0; i < 5; i++) {
      console.log(`🔍 fetching clip ${i}`);

      const videoUrl = await getPexelsVideo(prompt);
      const filename = `clip_${i}.mp4`;

      await downloadVideo(videoUrl, filename);

      clips.push(filename);
    }

    console.log("🎬 clips ready:", clips);

    if (clips.length < 2) {
      throw new Error("Not enough clips");
    }

    // 🧾 CREATE CONCAT FILE
    fs.writeFileSync(
      "videos.txt",
      clips.map(c => `file '${c}'`).join("\n")
    );

    console.log("🎞 stitching...");

    // 🎥 STITCH
    execSync(`
      ffmpeg -y -f concat -safe 0 -i videos.txt -c copy stitched.mp4
    `);

    console.log("🔁 looping...");

    // 🔁 LOOP TO MAKE LONGER
    execSync(`
      ffmpeg -y -stream_loop 2 -i stitched.mp4 -c copy final.mp4
    `);

    /* =========================
       🎙 VOICE + MERGE
    ========================= */
    try {
      console.log("🎙 generating voice...");

      const script = `This is a ${prompt} lifestyle video showcasing success, luxury, and inspiration.`;

      await generateVoice(script);

      console.log("🎧 merging voice...");

      execSync(`
        ffmpeg -y -i final.mp4 -i voice.mp3 \
        -c:v copy -c:a aac -shortest output.mp4
      `);

    } catch (err) {
      console.log("⚠️ voice failed, using silent video");
      fs.copyFileSync("final.mp4", "output.mp4");
    }

    console.log("✅ FINAL READY");

    const videoUrl = `${req.protocol}://${req.get("host")}/output.mp4`;

    res.json({
      video: videoUrl
    });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

/* =========================
   🚀 START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 server running on ${PORT}`);
});