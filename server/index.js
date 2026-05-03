import express from "express";
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 8080;

// init OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// script generator
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

// route
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const script = generateScript(prompt);

    // 🎙️ generate voice
    const audioPath = "public/voice.mp3";

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    res.json({
      script,
      videoUrl: "https://ai-reel-studio-production.up.railway.app/output.mp4",
      audioUrl: "https://ai-reel-studio-production.up.railway.app/voice.mp3"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// health
app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});