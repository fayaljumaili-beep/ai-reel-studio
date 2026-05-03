import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ FIX: absolute public path
const publicDir = path.join(process.cwd(), "public");

// ✅ FIX: ensure folder exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

app.use(express.static(publicDir));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Prompt:", prompt);

    // -------------------------
    // 1. GENERATE SCRIPT
    // -------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short motivational script for: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;

    // -------------------------
    // 2. GENERATE AUDIO
    // -------------------------
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioPath = path.join(publicDir, "audio.mp3");
    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    fs.writeFileSync(audioPath, audioBuffer);

    // -------------------------
    // 3. CREATE CAPTIONS
    // -------------------------
    const srtPath = path.join(publicDir, "subtitles.srt");

    const words = script.split(" ");
    let srt = "";
    let time = 0;

    words.forEach((word, i) => {
      srt += `${i + 1}\n`;
      srt += `00:00:${String(time).padStart(2, "0")},000 --> 00:00:${String(time + 1).padStart(2, "0")},000\n`;
      srt += `${word}\n\n`;
      time++;
    });

    fs.writeFileSync(srtPath, srt);

    // -------------------------
    // 4. VIDEO GENERATION
    // -------------------------
    const inputImage = path.join(publicDir, "input.jpg");
    const outputVideo = path.join(publicDir, "output.mp4");

    execSync(`
      ffmpeg -y -loop 1 -i ${inputImage} -i ${audioPath} \
      -vf "subtitles=${srtPath}:force_style='Fontsize=24'" \
      -shortest -c:v libx264 -c:a aac ${outputVideo}
    `);

    console.log("Video created!");

    // -------------------------
    // 5. RETURN
    // -------------------------
    res.json({
      video: `${req.protocol}://${req.get("host")}/output.mp4`,
      audio: `${req.protocol}://${req.get("host")}/audio.mp3`,
      script,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate video" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});