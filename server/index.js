import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.get("/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt || "motivational success";

    // 🔥 STEP 1: Generate script
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short viral TikTok script about: ${prompt}.
          Keep it under 80 words, fast-paced, and engaging. Start with a hook.`
        }
      ]
    });

    const script = completion.choices[0].message.content;

    console.log("🎬 SCRIPT:\n", script);

    // 🎥 STEP 2: Video processing (your existing logic)

    const __dirname = new URL('.', import.meta.url).pathname;

    const clips = [
      path.join(__dirname, "assets/videos/clip-0.mp4"),
      path.join(__dirname, "assets/videos/clip-1.mp4"),
      path.join(__dirname, "assets/videos/clip-2.mp4")
    ];

    const normalized = clips.map((_, i) => `temp${i}.mp4`);
    const output = "output.mp4";

    // Normalize clips
    for (let i = 0; i < clips.length; i++) {
      await new Promise((resolve, reject) => {
        exec(
          `ffmpeg -y -i "${clips[i]}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -an ${normalized[i]}`,
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    // Combine clips
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -i temp0.mp4 -i temp1.mp4 -i temp2.mp4 -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]" -map "[outv]" -c:v libx264 -preset fast ${output}`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // 🧠 OPTIONAL: send script in headers (so frontend can read it)
    res.setHeader("X-Script", script);

    // 🎬 Send video
    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.toString());
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});