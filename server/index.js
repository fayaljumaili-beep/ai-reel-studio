import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const VOICE_MAP = {
  aggressive: "TxGEqnHWrfWFTfGW9XjX",
  calm: "EXAVITQu4vr4xnSDxMaL",
  luxury: "ErXwobaYiN019PkySvjV",
  fast: "VR6AewLTigWG4xSOukaG",
  deep: "onwK4e9ZLuTAKqWW03F9",
  female: "21m00Tcm4TlvDq8ikWAM",
  podcast: "AZnzlk1XvdvUeBnXmlld",
  cold: "pNInz6obpgDQGcFmaJgB",
  story: "yoZ06aMxZJJ28mfd3POQ"
};

app.post("/generate-video", async (req, res) => {
  const { prompt, category, voice, style, length } = req.body;

  const duration = parseInt(length) || 60;
  const scenesCount = Math.floor(duration / 5);

  // fake script for now (replace later with GPT)
  const script = `${prompt}. ${prompt}. ${prompt}. ${prompt}. ${prompt}`;

  const scenes = script.split(".").slice(0, scenesCount);

  // 🎙️ generate voice
  const selectedVoice = VOICE_MAP[voice] || VOICE_MAP.fast;

  const voiceRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_monolingual_v1"
      })
    }
  );

  const audioBuffer = await voiceRes.arrayBuffer();
  fs.writeFileSync("voice.mp3", Buffer.from(audioBuffer));

  // TODO: replace with real video pipeline
  // for now return sample video
  const videoPath = "sample.mp4";

  res.sendFile(videoPath, { root: "." });
});

app.listen(8080, () => console.log("Server running 🚀"));