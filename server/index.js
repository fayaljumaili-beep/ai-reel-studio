import express from "express";
import cors from "cors";
import fs from "fs";
import { execSync } from "child_process";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

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
          content: `Write a short motivational script for a TikTok video about: ${prompt}. Keep it under 20 seconds.`,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    console.log("Script:", script);

    // -------------------------
    // 2. GENERATE AUDIO (TTS)
    // -------------------------
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("public/audio.mp3", audioBuffer);

    // -------------------------
    // 3. CREATE CAPTIONS (SRT)
    // -------------------------
    const words = script.split(" ");
    let srt = "";
    let time = 0;

    words.forEach((word, i) => {
      const start = time;
      const end = time + 1;

      srt += `${i + 1}\n`;
      srt += `00:00:${String(start).padStart(2, "0")},000 --> 00:00:${String(end).padStart(2, "0")},000\n`;
      srt += `${word}\n\n`;

      time++;
    });

    fs.writeFileSync("public/subtitles.srt", srt);

    // -------------------------
    // 4. GENERATE VIDEO (loop image)
    // -------------------------
    execSync(`
      ffmpeg -y -loop 1 -i public/input.jpg -i public/audio.mp3 \
      -vf "subtitles=public/subtitles.srt:force_style='Fontsize=24,PrimaryColour=&Hffffff&'" \
      -shortest -c:v libx264 -c:a aac public/output.mp4
    `);

    console.log("Video created!");

    // -------------------------
    // 5. RETURN FILES
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