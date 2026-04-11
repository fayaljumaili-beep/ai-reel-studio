import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const { topic } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create a faceless viral reel script about ${topic} with:
HOOK
SCENES
CTA
VOICEOVER`,
        },
      ],
    });

    res.json({
      script: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({
      error: "Script generation failed",
      details: error.message,
    });
  }
});

app.post("/generate-voice", async (req, res) => {
  try {
    const { text } = req.body;

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text || "This is your AI generated faceless reel.",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    if (!buffer || buffer.length === 0) {
      throw new Error("OpenAI returned empty audio");
    }

    const audioPath = path.join(process.cwd(), "voiceover.mp3");
    fs.writeFileSync(audioPath, buffer);

    console.log("✅ voice bytes:", buffer.length);

    res.json({
      success: true,
      audioUrl: `${req.protocol}://${req.get("host")}/voiceover.mp3`,
    });
  } catch (error) {
    console.error("Voice error:", error);
    res.status(500).json({
      error: "Voice generation failed",
      details: error.message,
    });
  }
});

app.get("/voiceover.mp3", (req, res) => {
  const audioPath = path.join(process.cwd(), "voiceover.mp3");
  res.sendFile(audioPath);
});

app.post("/generate-video", async (req, res) => {
  try {
    const audioPath = path.join(process.cwd(), "voiceover.mp3");
    const outputPath = path.join(process.cwd(), "final-reel.mp4");

    if (!fs.existsSync(audioPath)) {
      throw new Error("voiceover.mp3 missing");
    }

    ffmpeg()
      .input("color=c=black:s=720x1280:d=20")
      .inputFormat("lavfi")
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset ultrafast",
        "-crf 32",
        "-r 15",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-shortest"
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ final video ready");
        res.download(outputPath, "viral-reel.mp4");
      })
      .on("error", (err, stdout, stderr) => {
        console.error("FFMPEG ERROR:", err.message);
        console.error("STDOUT:", stdout);
        console.error("STDERR:", stderr);

        res.status(500).json({
          error: "Video generation failed",
          details: stderr || err.message,
        });
      });
  } catch (error) {
    console.error("Video route crash:", error);
    res.status(500).json({
      error: "Video generation failed",
      details: error.message,
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});