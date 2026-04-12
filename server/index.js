import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const port = process.env.PORT || 8080;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).send("Prompt required");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a viral faceless reel script about: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    res.send(script);
  } catch (error) {
    console.error("Generate route error:", error);
    res.status(500).send("Script generation failed");
  }
});

app.post("/generate-voice", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "script required" });
    }

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = "/app/voiceover.mp3";

    fs.writeFileSync(audioPath, audioBuffer);

    res.json({ success: true, audioPath });
  } catch (error) {
    console.error("Voice route error:", error);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const audioPath = "/app/voiceover.mp3";
    const outputPath = "/app/viral-reel.mp4";
    const imagePath = "/app/frame.png";

    const blackPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlAbwAAAABJRU5ErkJggg==";

    fs.writeFileSync(imagePath, Buffer.from(blackPngBase64, "base64"));

    ffmpeg()
      .input(imagePath)
      .loop(8)
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("720x1280")
      .fps(24)
      .outputOptions([
        "-preset ultrafast",
        "-tune stillimage",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-threads 1",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ LOW MEMORY MP4 READY");
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err) => {
        console.error("FFMPEG LOW MEMORY ERROR:", err);
        res.status(500).send("Video generation failed");
      });
  } catch (error) {
    console.error("Video route crash:", error);
    res.status(500).send("Video generation failed");
  }
});
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
