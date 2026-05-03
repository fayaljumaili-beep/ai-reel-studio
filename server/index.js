import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// --- paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

// --- OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- serve static files ---
app.use(express.static(publicDir));

// --- helper: transcribe audio ---
async function transcribeAudio(filePath) {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "gpt-4o-mini-transcribe"
  });

  return response.text;
}

// --- helper: format time ---
function formatTime(seconds) {
  const date = new Date(seconds * 1000).toISOString().substr(11, 12);
  return date.replace(".", ",");
}

// --- helper: text → SRT ---
function textToSRT(text) {
  const words = text.split(" ");
  let srt = "";
  let i = 1;

  for (let j = 0; j < words.length; j += 3) {
    const chunk = words.slice(j, j + 3).join(" ");

    const start = j * 0.5;
    const end = start + 1.5;

    srt += `${i}\n`;
    srt += `${formatTime(start)} --> ${formatTime(end)}\n`;
    srt += `${chunk}\n\n`;

    i++;
  }

  return srt;
}

// --- helper: burn captions ---
function burnCaptions(videoPath, srtPath, outputPath) {
  execSync(
  `ffmpeg -y -i "${videoPath}" \
  -vf "subtitles=${srtPath}:force_style='FontSize=18'" \
  -preset ultrafast \
  -crf 32 \
  -c:v libx264 \
  -c:a aac \
  -b:a 96k \
  "${outputPath}"`,
  { stdio: "inherit" }
);
}

// --- main route ---
app.post("/generate-video", async (req, res) => {
  try {
    console.log("Prompt:", req.body.prompt);

    const audioPath = path.join(publicDir, "audio.mp3");
    const videoPath = path.join(publicDir, "output.mp4");
    const srtPath = path.join(publicDir, "subtitles.srt");
    const finalPath = path.join(publicDir, "final.mp4");

    // 1. transcribe
    console.log("Transcribing...");
    const text = await transcribeAudio(audioPath);

    // 2. create subtitles
    console.log("Creating subtitles...");
    const srt = textToSRT(text);
    fs.writeFileSync(srtPath, srt);

    // 3. burn captions
    console.log("Burning captions...");
    burnCaptions(videoPath, srtPath, finalPath);

    console.log("Done!");

    res.json({
      video: "https://ai-reel-studio-production.up.railway.app/final.mp4",
      audio: "https://ai-reel-studio-production.up.railway.app/audio.mp3"
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Caption generation failed" });
  }
});

// --- health check ---
app.get("/", (req, res) => {
  res.send("Server running");
});

// --- start server ---
app.listen(8080, () => {
  console.log("Server running on port 8080");
});