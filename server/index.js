import express from "express";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serves /output.mp4 and /audio.mp3

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1. Generate script
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short motivational reel script: ${prompt}`
        }
      ]
    });

    const script = scriptRes.choices[0].message.content;

    // 2. Generate voice
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("public/audio.mp3", audioBuffer);

    // 3. Combine video + audio
    exec(
      `ffmpeg -y -i public/input.mp4 -i public/audio.mp3 -shortest -c:v copy -c:a aac public/output.mp4`,
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send("FFmpeg error");
        }

        res.json({
          script,
          audio: `${req.protocol}://${req.get("host")}/audio.mp3`
        });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});