import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/*
===========================
🎯 HELPER: Generate Script
===========================
*/
function generateScript(prompt) {
  return `Here's the truth about ${prompt}.

It doesn't happen overnight.

Every successful person you admire started with nothing but an idea and the willingness to keep going.

There will be days when you feel stuck, when nothing seems to work, and when giving up feels easier.

But consistency is what separates winners from everyone else.

The small actions you take daily might not feel like much, but over time, they build something powerful.

Stay focused, stay disciplined, and trust the process.

Because if you keep showing up, success becomes inevitable.`;
}

/*
===========================
🎙️ HELPER: Generate Voice
===========================
Uses OpenAI TTS (or fallback)
*/
async function generateVoice(script) {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: script,
      }),
    });

    const buffer = await response.arrayBuffer();

    const filePath = path.join("public", "voice.mp3");
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return "/voice.mp3";
  } catch (err) {
    console.log("❌ Voice generation failed, using fallback");

    // fallback (your demo.mp3)
    return "/demo.mp3";
  }
}

/*
===========================
🚀 MAIN ROUTE
===========================
*/
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 1. generate script
    const script = generateScript(prompt);

    // 2. generate voice
    const audioUrl = await generateVoice(script);

    // 3. return everything frontend needs
    res.json({
      success: true,
      script,
      videoUrl: "/output.mp4", // your static video
      audioUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/*
===========================
❤️ HEALTH CHECK
===========================
*/
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

/*
===========================
🚀 START SERVER
===========================
*/
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});