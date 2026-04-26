import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// 🔥 helper: clean text for ffmpeg
function safeText(text) {
  return text
    .replace(/'/g, "")
    .replace(/"/g, "")
    .replace(/:/g, "")
    .replace(/\n/g, " ")
    .slice(0, 80);
}

// 🔥 split script into scenes
function splitScenes(script) {
  const sentences = script.split(".");
  return sentences.filter(s => s.trim().length > 10).slice(0, 6);
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt" });
    }

    // 🎯 fake script generator (replace later with GPT)
    const script = `
    ${prompt} is something most people ignore.
    But this is why you are still stuck.
    The difference between success and failure is simple.
    Discipline beats motivation every time.
    If you understand this, everything changes.
    Start now before it's too late.
    `;

    const scenes = splitScenes(script);

    if (!fs.existsSync("temp")) fs.mkdirSync("temp");

    let videoParts = [];

    for (let i = 0; i < scenes.length; i++) {
      const scenePath = `temp/scene${i}.mp4`;

      // 🎬 fetch image
      const imgRes = await fetch(
        `https://api.pexels.com/v1/search?query=${prompt}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY
          }
        }
      );

      const imgData = await imgRes.json();
      const imageUrl =
        imgData.photos?.[0]?.src?.landscape ||
        "https://images.pexels.com/photos/11035371/pexels-photo-11035371.jpeg";

      const imgBuffer = await fetch(imageUrl).then(r => r.buffer());
      const imgPath = `temp/img${i}.jpg`;
      fs.writeFileSync(imgPath, imgBuffer);

      const text = safeText(scenes[i]);

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(imgPath)
          .loop(1)
          ..videoFilters([
  "scale=1280:720",

  `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:
   text='${safeText(scenes[i])}':
   fontcolor=white:
   fontsize=42:
   box=1:
   boxcolor=black@0.7:
   boxborderw=15:
   x=(w-text_w)/2:
   y=(h-text_h)/2`
])
          .outputOptions("-t 5")
          .save(scenePath)
          .on("end", resolve)
          .on("error", reject);
      });

      videoParts.push(scenePath);
    }

    // 🎬 CONCAT ALL SCENES
    const listPath = "temp/list.txt";
    fs.writeFileSync(
      listPath,
      videoParts.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const finalVideo = "temp/final.mp4";

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(finalVideo)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🎉 SEND VIDEO
    res.sendFile(path.resolve(finalVideo));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});