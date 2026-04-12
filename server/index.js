import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.static("/app"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const prompt = req.body?.prompt || "";
    if (!prompt.trim()) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const script = completion.choices?.[0]?.message?.content || "";
    return res.json({ success: true, script });
  } catch (error) {
    console.error("Generate route error:", error);
    return res.status(500).json({ error: "Script generation failed", details: error.message });
  }
});

app.post("/generate-voice", async (req, res) => {
  try {
    const script = req.body?.script || "";
    if (!script.trim()) {
      return res.status(400).json({ error: "Missing script input" });
    }

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = "/app/voiceover.mp3";
    fs.writeFileSync(audioPath, audioBuffer);

    return res.json({
      success: true,
      audioUrl: "/voiceover.mp3",
      bytes: audioBuffer.length,
    });
  } catch (error) {
    console.error("Voice route error:", error);
    return res.status(500).json({ error: "Voice generation failed", details: error.message });
  }
});

app.post("/generate-video", async (req, res) => {
  try {
    const script = req.body?.script || "";
    const captionText = req.body?.captionText || script || "Viral reel";
    const audioPath = "/app/voiceover.mp3";
    const outputPath = "/app/final-reel.mp4";

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ error: "Generate voice before video" });
    }

    const safeCaption = String(captionText)
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .slice(0, 100);

    ffmpeg()
      .input("color=c=black:s=1080x1920:d=6")
      .inputFormat("lavfi")
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        `-vf drawtext=text='${safeCaption}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-220`,
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-shortest",
      ])
      .on("end", () => res.download(outputPath, "viral-reel.mp4"))
      .on("error", (err) => {
        console.error("FFmpeg merge error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "FFmpeg merge failed", details: err.message });
        }
      })
      .save(outputPath);
  } catch (error) {
    console.error("Video route error:", error);
    return res.status(500).json({ error: "Video generation failed", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});