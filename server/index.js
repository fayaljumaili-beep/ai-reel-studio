import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

/* =========================
   🧠 SCRIPT
========================= */
async function generateScript(prompt) {
  return `Here’s the truth about ${prompt}.

It doesn’t happen overnight.

Every successful person you admire started with nothing but an idea and the willingness to keep going.

Consistency beats motivation every single time.

Because motivation fades… but discipline builds results.

So if you want to succeed, start small.

Take action today.

And don’t stop.`;
}

/* =========================
   🎥 PEXELS
========================= */
async function getClips(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=3`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  return res.data.videos.map(v => v.video_files[0].link);
}

/* =========================
   ⬇️ DOWNLOAD
========================= */
async function downloadFile(url, output) {
  const res = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  const writer = fs.createWriteStream(output);

  return new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/* =========================
   🔊 VOICE (ElevenLabs)
========================= */
async function generateVoice(script) {
  const response = await axios({
    method: "POST",
    url: "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    data: {
      text: script,
      model_id: "eleven_monolingual_v1"
    },
    responseType: "arraybuffer"
  });

  const filePath = "public/voice.mp3";
  fs.writeFileSync(filePath, response.data);

  return filePath;
}

/* =========================
   💬 CAPTIONS BUILDER
========================= */
function buildCaptions(lines) {
  let time = 0;
  const duration = 2.5;

  return lines.map(line => {
    const start = time;
    const end = time + duration;
    time += duration;

    const clean = line
      .replace(/'/g, "")
      .replace(/:/g, "")
      .trim();

    return `drawtext=text='${clean}':
    fontcolor=white:fontsize=48:
    box=1:boxcolor=black@0.5:
    x=(w-text_w)/2:y=h-200:
    enable='between(t,${start},${end})'`;
  }).join(",");
}

/* =========================
   🎬 MAIN ROUTE
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Prompt:", prompt);

    if (!fs.existsSync("public")) fs.mkdirSync("public");

    // 1. Script
    const script = await generateScript(prompt);

    // 2. Split into caption lines
    const lines = script.split(". ");

    // 3. Get clips
    const clips = await getClips(prompt);

    // 4. Download clips
    const clipPaths = [];
    for (let i = 0; i < clips.length; i++) {
      const p = `public/clip_${i}.mp4`;
      await downloadFile(clips[i], p);
      clipPaths.push(path.resolve(p));
    }

    // 5. Create concat file
    const concatPath = "public/concat.txt";
    fs.writeFileSync(
      concatPath,
      clipPaths.map(p => `file '${p}'`).join("\n")
    );

    // 6. Merge clips (RE-ENCODE FIX 🔥)
    await execAsync(`
      ffmpeg -y \
      -f concat -safe 0 -i ${concatPath} \
      -vf "scale=720:1280,format=yuv420p" \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac \
      public/final.mp4
    `);

    // 7. Voice
    const voicePath = await generateVoice(script);

    // 8. Captions filter
    const captions = buildCaptions(lines);

    // 9. Final merge (VIDEO + AUDIO + CAPTIONS 🔥)
    await execAsync(`
      ffmpeg -y \
      -i public/final.mp4 \
      -i ${voicePath} \
      -vf "${captions}" \
      -c:v libx264 -preset fast -crf 23 \
      -c:a aac \
      -shortest \
      public/output.mp4
    `);

    // 10. Return result
    res.json({
      videoUrl: "/output.mp4",
      script
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("AI Reel Studio running 🚀");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});