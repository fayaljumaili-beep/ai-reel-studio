import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*",
}));

ffmpeg.setFfmpegPath(ffmpegPath);

const TEMP_DIR = "temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// 🔊 SIMPLE TEXT SPLIT
function splitText(prompt) {
  return prompt.split(".").filter(s => s.trim().length > 0);
}

// 🔊 TEXT TO SPEECH (FREE)
async function generateVoice(text, filePath) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  fs.writeFileSync(filePath, Buffer.from(buffer));
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, length = "60" } = req.body;

    let duration = length === "90" ? 90 : length === "30" ? 30 : 60;

    const scenes = splitText(prompt);
    const sceneCount = Math.min(scenes.length, 5) || 3;
    const sceneDuration = Math.floor(duration / sceneCount);

    const sceneVideos = [];

    for (let i = 0; i < sceneCount; i++) {
      const text = scenes[i] || prompt;

      // 🖼 image
      const imgPath = path.join(TEMP_DIR, `img${i}.jpg`);
      const imgRes = await fetch(`https://picsum.photos/1080/1920?random=${Date.now()}${i}`);
      fs.writeFileSync(imgPath, Buffer.from(await imgRes.arrayBuffer()));

      // 🔊 voice
      const audioPath = path.join(TEMP_DIR, `voice${i}.mp3`);
      await generateVoice(text, audioPath);

      const scenePath = path.join(TEMP_DIR, `scene${i}.mp4`);

      // 🎬 VIDEO + AUDIO + CAPTION
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(imgPath)
          .loop(sceneDuration)
          .input(audioPath)
          .outputOptions([
            "-t " + sceneDuration,
            "-vf",
            `scale=1080:1920,drawtext=text='${text.replace(/:/g, "").replace(/'/g, "")}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200`,
            "-shortest"
          ])
          .save(scenePath)
          .on("end", resolve)
          .on("error", reject);
      });

      sceneVideos.push(scenePath);
    }

    // 📄 concat
    const concatFile = path.join(TEMP_DIR, "concat.txt");
    fs.writeFileSync(
      concatFile,
      sceneVideos.map(v => `file '${path.resolve(v)}'`).join("\n")
    );

    const finalPath = path.join(TEMP_DIR, "final.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    res.sendFile(path.resolve(finalPath));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FAILED" });
  }
});

app.listen(8080, () => console.log("Server running 🚀"));