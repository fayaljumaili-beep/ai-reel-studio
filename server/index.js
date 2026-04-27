import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

const TMP_DIR = "./tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// helper to run ffmpeg
async function run(cmd) {
  console.log("Running:", cmd);
  try {
    await execPromise(cmd);
  } catch (err) {
    console.error("FFMPEG ERROR:", err.stderr || err);
    throw err;
  }
}

// 🔥 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 🎬 MULTI SCENE KEYWORDS
    const scenes = [
      prompt,
      "success business",
      "luxury lifestyle",
      "money growth",
      "winning mindset"
    ];

    const clips = [];

    // 🎥 DOWNLOAD STOCK CLIPS
    for (let i = 0; i < scenes.length; i++) {
      const keyword = scenes[i];

      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const videoUrl = response.data.videos[0].video_files[0].link;

      const rawPath = path.join(TMP_DIR, `raw_${i}.mp4`);
      const cleanPath = path.join(TMP_DIR, `clip_${i}.mp4`);

      // download
      const video = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(rawPath);
      video.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      // 🎯 NORMALIZE CLIP (IMPORTANT FIX)
      await run(
        `ffmpeg -y -i ${rawPath} -vf "scale=720:1280,setsar=1" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${cleanPath}`
      );

      clips.push(cleanPath);
    }

    // 📄 CONCAT LIST
    const listPath = path.join(TMP_DIR, "list.txt");
    fs.writeFileSync(
      listPath,
      clips.map((c) => `file '${path.resolve(c)}'`).join("\n")
    );

    const mergedPath = path.join(TMP_DIR, "merged.mp4");

    // 🔗 MERGE CLIPS
    await run(
  `ffmpeg -y -f concat -safe 0 -i ${listPath} -vf "scale=720:1280,setsar=1" -r 30 -c:v libx264 -preset veryfast -pix_fmt yuv420p -an ${mergedPath}`
);

    // 🎵 GENERATE AUDIO (simple tone for now)
    const audioPath = path.join(TMP_DIR, "audio.mp3");

    await run(
  `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 20 ${audioPath}`
);

    const finalPath = path.join(TMP_DIR, "final.mp4");

    // 🎬 FINAL VIDEO WITH AUDIO
    await run(
      `ffmpeg -y -i ${mergedPath} -i ${audioPath} -c:v copy -c:a aac -shortest ${finalPath}`
    );

    // send video
    res.sendFile(path.resolve(finalPath));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video");
  }
});

// health check
app.get("/", (req, res) => {
  res.send("Server running");
});

// start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});