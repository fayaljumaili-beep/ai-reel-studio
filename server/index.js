import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

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
    const script = latestScript || "Default viral reel script";
    const mp3Path = path.join(process.cwd(), "public", "voiceover.mp3");
    const outputPath = path.join(process.cwd(), "public", "viral-reel.mp4");

    const safeText = script
      .replace(/'/g, "")
      .replace(/:/g, "")
      .slice(0, 60);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input("color=c=black:s=720x1280:d=12")
        .inputOptions(["-f lavfi"])
        .input(mp3Path)
        .videoCodec("libx264")
        .audioCodec("aac")
        .audioBitrate("128k")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-shortest",
          "-preset ultrafast",
          "-r 24",
          `-vf drawtext=text='${safeText}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2`
        ])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="viral-reel.mp4"'
    );

    res.sendFile(outputPath);
  } catch (error) {
    console.error("FINAL VALID INPUT ORDER ERROR:", error);
    res.status(500).json({ error: "Video generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
