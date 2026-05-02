import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

ffmpeg.setFfmpegPath(ffmpegPath);

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== GENERATE SCRIPT =====
async function generateScript(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You create viral Instagram Reels. Return JSON with title + 4 scenes. Each scene has: text, visual keywords.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = completion.choices[0].message.content;

  try {
    return JSON.parse(text);
  } catch {
    // fallback if model returns messy text
    return {
      title: prompt,
      scenes: [
        { text: text, visual: prompt },
      ],
    };
  }
}

// ===== FETCH VIDEO FROM PEXELS =====
async function getVideo(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=1`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
    }
  );

  return res.data.videos?.[0]?.video_files?.[0]?.link || null;
}

// ===== DOWNLOAD + STITCH =====
async function stitchVideos(videoUrls) {
  return new Promise(async (resolve, reject) => {
    try {
      const files = [];

      // 1. Download clips
      for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        const path = `public/clip_${i}.mp4`;

        const response = await axios({
          url,
          method: "GET",
          responseType: "stream",
        });

        const writer = fs.createWriteStream(path);
        response.data.pipe(writer);

        await new Promise((res) => writer.on("finish", res));

        files.push(path);
      }

      // 2. Create concat file (LOW MEMORY METHOD)
      const concatFile = "public/concat.txt";

      const content = files
        .map(f => `file '${f}'`)
        .join("\n");

      fs.writeFileSync(concatFile, content);

      const output = "public/final.mp4";

      // 3. Use SAFE concat (no memory overload)
      exec(
        `ffmpeg -f concat -safe 0 -i ${concatFile} -vf "scale=720:1280" -c:v libx264 -preset veryfast -crf 28 -y ${output}`,
        (err) => {
          if (err) {
            console.error("FFMPEG ERROR:", err);
            return reject(err);
          }
          resolve(output);
        }
      );

    } catch (err) {
      reject(err);
    }
  });
}

// ===== MAIN ROUTE =====
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    // 1. script
    const data = await generateScript(prompt);

    const title = data.title;
    const scenes = data.scenes || [];

    // 2. attach videos
    for (let scene of scenes) {
      const videoUrl = await getVideo(scene.visual || prompt);
      scene.videoUrl = videoUrl;
    }

    // 3. stitch
    const videoUrls = scenes
      .map(s => s.videoUrl)
      .filter(Boolean);

    let finalVideo = null;

    if (videoUrls.length > 0) {
      finalVideo = await stitchVideos(videoUrls);
    }

    // 4. response
    res.json({
      title,
      scenes,
      finalVideoUrl: finalVideo
        ? `/${finalVideo.replace("public/", "")}`
        : null,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== START =====
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});