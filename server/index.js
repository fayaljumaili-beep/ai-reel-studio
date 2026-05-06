const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require("child_process");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("AI Reel Generator Backend Running");
});

app.post("/generate-video", async (req, res) => {
  try {
    const prompt = req.body.prompt || "success mindset";

    console.log("🔥 START:", prompt);

    // CLEAN OLD FILES
    [
      "voice.mp3",
      "output.mp4",
      "combined.mp4",
      "final.mp4",
      "list.txt",
      "clip0.mp4",
      "clip1.mp4",
      "clip2.mp4",
      "clip3.mp4",
      "clip4.mp4",
      "clip5.mp4",
    ].forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });

    // =========================
    // SCRIPT
    // =========================

    const script = `
Success is built daily.
Most people quit too early.
Discipline changes everything.
Keep going even when it's hard.
Success is built daily.
`;

    // =========================
    // ELEVENLABS VOICE
    // =========================

    const voice = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      data: {
        text: script,
        model_id: "eleven_multilingual_v2",
      },
    });

    fs.writeFileSync("voice.mp3", voice.data);

    console.log("🎤 Voice ready");

    // =========================
    // PEXELS SEARCH
    // =========================

    const search = await axios.get(
      `https://api.pexels.com/videos/search?query=${prompt}&per_page=6`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = search.data.videos;

    if (!videos.length) {
      return res.status(500).json({
        error: "No videos found",
      });
    }

    // =========================
    // DOWNLOAD + TRIM CLIPS
    // =========================

    const selectedVideos = videos.slice(0, 6);

    for (let i = 0; i < selectedVideos.length; i++) {
      const videoUrl = selectedVideos[i].video_files[0].link;

      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
      });

      const tempFile = `temp${i}.mp4`;
      const outputFile = `clip${i}.mp4`;

      const writer = fs.createWriteStream(tempFile);

      response.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      // TRIM TO 5 SECONDS
      execSync(`
        ffmpeg -y \
        -i ${tempFile} \
        -t 5 \
        -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
        -preset ultrafast \
        ${outputFile}
      `);

      fs.unlinkSync(tempFile);
    }

    console.log("🎬 Clips downloaded + trimmed");

    // =========================
    // CONCAT CLIPS
    // =========================

    let list = "";

    for (let i = 0; i < selectedVideos.length; i++) {
      list += `file 'clip${i}.mp4'\n`;
    }

    fs.writeFileSync("list.txt", list);

    execSync(`
      ffmpeg -y \
      -f concat \
      -safe 0 \
      -i list.txt \
      -c copy \
      combined.mp4
    `);

    console.log("📎 Clips combined");

    // =========================
    // CAPTIONS
    // =========================

    execSync(`
      ffmpeg -y \
      -i combined.mp4 \
      -i voice.mp3 \
      -vf "drawtext=text='SUCCESS IS BUILT DAILY':fontcolor=yellow:fontsize=52:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-220,drawtext=text='DISCIPLINE CHANGES EVERYTHING':fontcolor=white:fontsize=40:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-150" \
      -map 0:v \
      -map 1:a \
      -shortest \
      -preset ultrafast \
      -crf 32 \
      -s 720x1280 \
      -r 24 \
      -c:v libx264 \
      -c:a aac \
      -b:a 128k \
      final.mp4
    `);

    console.log("✅ FINAL VIDEO READY");

    const videoBuffer = fs.readFileSync("final.mp4");

    res.setHeader("Content-Type", "video/mp4");

    res.send(videoBuffer);

  } catch (err) {
    console.error("❌ ERROR:", err);

    res.status(500).json({
      error: "Failed to generate video",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});