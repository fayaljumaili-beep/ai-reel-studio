import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = "temp";

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// -----------------------------
// 🎯 SIMPLE AI SCENE MAPPER
// -----------------------------
function getScenesFromPrompt(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes("rich") || p.includes("money") || p.includes("success")) {
    return [
      "https://videos.pexels.com/video-files/3209299/3209299-uhd_2560_1440_25fps.mp4",
      "https://videos.pexels.com/video-files/855564/855564-hd_1280_720_25fps.mp4",
      "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4"
    ];
  }

  if (p.includes("fitness") || p.includes("gym")) {
    return [
      "https://videos.pexels.com/video-files/1552249/1552249-hd_1280_720_25fps.mp4",
      "https://videos.pexels.com/video-files/4761779/4761779-hd_1280_720_25fps.mp4"
    ];
  }

  // fallback
  return [
    "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
    "https://videos.pexels.com/video-files/855564/855564-hd_1280_720_25fps.mp4"
  ];
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, duration = 30 } = req.body;

    console.log("🎬 Generating video:", prompt);

    const scenes = getScenesFromPrompt(prompt);

    // -----------------------------
    // AUDIO
    // -----------------------------
    const audioUrl =
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    const audioPath = path.join(TEMP_DIR, "audio.mp3");

    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.buffer();
    fs.writeFileSync(audioPath, audioBuffer);

    // -----------------------------
    // DOWNLOAD VIDEOS
    // -----------------------------
    const videoPaths = [];

    for (let i = 0; i < scenes.length; i++) {
      const filePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      const response = await fetch(scenes[i]);
      const buffer = await response.buffer();

      fs.writeFileSync(filePath, buffer);
      videoPaths.push(filePath);
    }

    // -----------------------------
    // CUT SCENES BASED ON DURATION
    // -----------------------------
    const segmentDuration = Math.floor(duration / videoPaths.length);

    const clippedVideos = [];

    for (let i = 0; i < videoPaths.length; i++) {
      const input = videoPaths[i];
      const output = path.join(TEMP_DIR, `clip_${i}.mp4`);

      await new Promise((resolve, reject) => {
        ffmpeg(input)
          .setStartTime(0)
          .duration(segmentDuration)
          .outputOptions([
            "-c:v libx264",
            "-preset veryfast",
            "-pix_fmt yuv420p"
          ])
          .save(output)
          .on("end", resolve)
          .on("error", reject);
      });

      clippedVideos.push(output);
    }

    // -----------------------------
    // CONCAT
    // -----------------------------
    const concatFile = path.join(TEMP_DIR, "concat.txt");

    fs.writeFileSync(
      concatFile,
      clippedVideos.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const mergedPath = path.join(TEMP_DIR, "merged.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-pix_fmt yuv420p"
        ])
        .save(mergedPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // -----------------------------
    // ADD AUDIO
    // -----------------------------
    const finalPath = path.join(TEMP_DIR, "final.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(mergedPath)
        .input(audioPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-shortest",
          `-t ${duration}`
        ])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ FINAL READY");

    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on 8080");
});