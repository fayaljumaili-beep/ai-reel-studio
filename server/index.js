import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

const TEMP = "./temp";
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP);

// 🧠 VIRAL SCRIPT
function splitScript(prompt) {
  return [
    "Nobody tells you this...",
    `The truth about ${prompt}...`,
    "Most people get this completely wrong.",
    "This is why you're stuck.",
    "Do this instead.",
    "Watch what happens next."
  ];
}

// 🔊 VOICE
async function generateVoice(text) {
  const res = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    {
      text,
      model_id: "eleven_monolingual_v1"
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  const file = path.join(TEMP, "voice.mp3");
  fs.writeFileSync(file, res.data);
  return file;
}

// 🎬 MAIN ENGINE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, category } = req.body;

    const scenes = splitScript(prompt);
    const sceneDuration = 3;

    // 🔊 voice
    const audio = await generateVoice(scenes.join(". "));

    // 🎥 get clips
    const pexels = await axios.get(
      `https://api.pexels.com/videos/search?query=${category}&per_page=${scenes.length}`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY }
      }
    );

    const videos = pexels.data.videos;
    const processed = [];

    for (let i = 0; i < scenes.length; i++) {
      const url = videos[i]?.video_files[0]?.link;
      if (!url) continue;

      const raw = path.join(TEMP, `raw${i}.mp4`);
      const out = path.join(TEMP, `scene${i}.mp4`);

      // download
      const writer = fs.createWriteStream(raw);
      const vid = await axios.get(url, { responseType: "stream" });
      vid.data.pipe(writer);
      await new Promise(r => writer.on("finish", r));

      // 🎬 trim + zoom + captions
      await new Promise((resolve, reject) => {
        ffmpeg(raw)
          .setStartTime(0)
          .duration(sceneDuration)
          .videoFilters([
            "scale=1280:720",
            "zoompan=z='min(zoom+0.0015,1.2)':d=75",

            // main caption
            `drawtext=text='${scenes[i]}':
             fontcolor=white:
             fontsize=48:
             box=1:
             boxcolor=black@0.7:
             boxborderw=20:
             x=(w-text_w)/2:
             y=(h-text_h)/2`,

            // hook (only first scene)
            `drawtext=text='${i === 0 ? "WATCH THIS" : ""}':
             fontcolor=yellow:
             fontsize=32:
             x=(w-text_w)/2:
             y=80`
          ])
          .save(out)
          .on("end", resolve)
          .on("error", reject);
      });

      processed.push(out);
    }

    // 🧩 concat
    const concatFile = path.join(TEMP, "concat.txt");
    fs.writeFileSync(
      concatFile,
      processed.map(p => `file '${path.resolve(p)}'`).join("\n")
    );

    const merged = path.join(TEMP, "merged.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(merged)
        .on("end", resolve)
        .on("error", reject);
    });

    // 🔊 add audio
    const final = path.join(TEMP, "final.mp4");

    await new Promise((resolve, reject) => {
      ffmpeg(merged)
        .input(audio)
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-shortest"
        ])
        .save(final)
        .on("end", resolve)
        .on("error", reject);
    });

    res.sendFile(path.resolve(final));

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video");
  }
});

app.listen(8080, () => console.log("Server running 🚀"));