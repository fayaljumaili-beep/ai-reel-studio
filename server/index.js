import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

ffmpeg.setFfmpegPath(ffmpegPath);

// ===== OPENAI =====
const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

// ===== PEXELS =====
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// ===== ROUTE =====
app.post("/generate-video", async (req, res) => {
try {
const { prompt } = req.body;

```
console.log("🎯 Prompt:", prompt);

// ===== 1. GENERATE SCRIPT =====
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content:
        "Return JSON with title and 3 scenes. Each scene must have text and visual_keywords array.",
    },
    {
      role: "user",
      content: prompt,
    },
  ],
});

const script = JSON.parse(completion.choices[0].message.content);

console.log("🧠 Script:", script);

// ===== 2. FETCH VIDEOS =====
const clips = [];

const scenes = script.scenes.slice(0, 2); // 🔥 LIMIT TO 2 CLIPS

for (let i = 0; i < scenes.length; i++) {
  const query = scenes[i].visual_keywords.join(" ");

  const response = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  );

  const videoUrl =
    response.data.videos[0].video_files[0].link;

  console.log("📹 Video URL:", videoUrl);

  const filePath = `public/clip_${i}.mp4`;

  const writer = fs.createWriteStream(filePath);

  const videoStream = await axios({
    url: videoUrl,
    method: "GET",
    responseType: "stream",
  });

  videoStream.data.pipe(writer);

  await new Promise((resolve) => writer.on("finish", resolve));

  clips.push(filePath);
}

console.log("📁 Clips ready:", clips);

// ===== 3. CREATE CONCAT FILE =====
const concatFile = "public/concat.txt";

const concatContent = clips
  .map((clip) => `file '${path.resolve(clip)}'`)
  .join("\n");

fs.writeFileSync(concatFile, concatContent);

console.log("🧾 Concat file created");

// ===== 4. FFMPEG STITCH =====
const output = "public/final.mp4";

await new Promise((resolve, reject) => {
  ffmpeg()
    .input(concatFile)
    .inputOptions(["-f concat", "-safe 0"])
    .outputOptions([
      "-vf scale=480:854", // 🔥 LOW RES (important)
      "-c:v libx264",
      "-preset ultrafast",
      "-crf 32",
      "-pix_fmt yuv420p",
    ])
    .output(output)
    .on("start", (cmd) => console.log("🎬 FFmpeg:", cmd))
    .on("end", () => {
      console.log("✅ FINAL VIDEO READY");
      resolve();
    })
    .on("error", (err) => {
      console.error("❌ FFMPEG ERROR:", err);
      reject(err);
    })
    .run();
});

// ===== RESPONSE =====
res.json({
  script,
  videoUrl: "/final.mp4",
});
```

} catch (err) {
console.error("🔥 SERVER ERROR:", err);
res.status(500).json({ error: "Server error" });
}
});

// ===== START SERVER =====
app.listen(PORT, () => {
console.log(`🚀 Server running on port ${PORT}`);
});
