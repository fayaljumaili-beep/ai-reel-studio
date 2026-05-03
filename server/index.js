import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: serve static files
app.use("/public", express.static(path.join(process.cwd(), "server/public")));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Prompt:", prompt);

    // 1. Generate script
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short motivational script about: ${prompt}`,
        },
      ],
    });

    const script = completion.choices[0].message.content;
    console.log("Script:", script);

    // 2. Generate voice
    const audioPath = path.join(process.cwd(), "server/public/audio.mp3");

    const audioResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    const buffer = Buffer.from(await audioResponse.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    // 3. Image path (FIXED)
    const imagePath = path.join(process.cwd(), "server/public/input.jpg");

    // 4. Output video
    const outputPath = path.join(process.cwd(), "server/public/output.mp4");

    // 5. Create video with ffmpeg
    const command = `
      ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" \
      -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
      -pix_fmt yuv420p -shortest "${outputPath}"
    `;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).json({ error: "Video generation failed" });
      }

      console.log("Video created!");

      // 6. Return video URL
      res.json({
        videoUrl: `${req.protocol}://${req.get("host")}/public/output.mp4`,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});