import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";
import { exec } from "child_process";
import OpenAI from "openai";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🎥 GET VIDEO FROM PEXELS
async function getVideo(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY
      }
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error("No video found from Pexels");
  }

  // pick best quality file
  return data.videos[0].video_files[0].link;
}

// ⬇️ DOWNLOAD VIDEO
function downloadVideo(url, path) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);

    https.get(url, (response) => {
      response.pipe(file);

      file.on("finish", () => {
        file.close(resolve);
      });

    }).on("error", (err) => {
      fs.unlink(path, () => reject(err));
    });
  });
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 🧠 1. Generate script
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a short, engaging, viral-style motivational script for a reel about: ${prompt}`
        }
      ]
    });

    const script = scriptRes.choices[0].message.content;

    // 🔊 2. Generate voice
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync("public/audio.mp3", audioBuffer);

    // 🎥 3. Get video from Pexels
    const videoUrl = await getVideo(prompt);

    // ⬇️ 4. Download video
    await downloadVideo(videoUrl, "public/input.mp4");

    // 🎬 5. Combine video + audio
    exec(
      `ffmpeg -y -i public/input.mp4 -i public/audio.mp3 -shortest -c:v copy -c:a aac public/output.mp4`,
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send("FFmpeg error");
        }

        // ✅ Return result
        res.json({
          script,
          audio: `${req.protocol}://${req.get("host")}/audio.mp3`
        });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});