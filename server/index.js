import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import cors from "cors";
import OpenAI from "openai";

console.log("🔥 NEW VERSION DEPLOYED");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔑 OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// helper to run ffmpeg
const run = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });

app.get("/generate", async (req, res) => {
  try {
    const prompt = req.query.prompt || "how to be successful";

    console.log("🎯 Prompt:", prompt);

    // 🤖 STEP 1: Generate AI script
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You create short viral TikTok/Reels scripts with hooks, fast pacing, and motivational tone.",
        },
        {
          role: "user",
          content: `Create a 20-30 second viral video script about: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;

    console.log("🔥 AI SCRIPT:\n", script);

    // 📁 Paths
    const __dirname = new URL(".", import.meta.url).pathname;

    const clips = [
      path.join(__dirname, "assets/videos/clip-0.mp4"),
      path.join(__dirname, "assets/videos/clip-1.mp4"),
      path.join(__dirname, "assets/videos/clip-2.mp4"),
    ];

    const normalized = clips.map((_, i) => `temp${i}.mp4`);

    // 🎬 STEP 2: Normalize clips
    for (let i = 0; i < clips.length; i++) {
      await run(
        `ffmpeg -y -i "${clips[i]}" -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2" -r 30 -preset ultrafast ${normalized[i]}`
      );
    }

    // 📄 STEP 3: Create concat list
    const listFile = "list.txt";
    fs.writeFileSync(
      listFile,
      normalized.map((f) => `file '${f}'`).join("\n")
    );

    // 🎬 STEP 4: Merge clips
    const output = "output.mp4";

    await run(
      `ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${output}`
    );

    // 🧹 Cleanup temp files
    normalized.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
    fs.existsSync(listFile) && fs.unlinkSync(listFile);

    // ✅ SEND VIDEO (no header issues)
    res.sendFile(path.resolve(output));

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});