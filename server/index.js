import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// 🎬 MAIN ENDPOINT
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("🎯 Prompt:", prompt);

    // 1️⃣ GENERATE SCRIPT
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create a short Instagram Reel plan.
Return JSON ONLY like:
{
  "title": "...",
  "scenes": [
    {
      "text": "...",
      "visual_keywords": ["...", "..."]
    }
  ]
}`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    let content = ai.choices[0].message.content;

    // clean markdown if exists
    content = content.replace(/```json|```/g, "");

    const script = JSON.parse(content);

    console.log("🧠 Script:", script);

    if (!script.scenes || script.scenes.length === 0) {
      throw new Error("No scenes generated");
    }

    // 2️⃣ FETCH VIDEOS FROM PEXELS
    const videoUrls = [];

    for (let i = 0; i < script.scenes.length; i++) {
      const keywords = script.scenes[i].visual_keywords.join(" ");

      const response = await axios.get(
        `https://api.pexels.com/videos/search?query=${keywords}&per_page=1`,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        }
      );

      const video = response.data.videos?.[0];

      if (video) {
        const url = video.video_files[0].link;
        videoUrls.push(url);
      }
    }

    console.log("🎥 Video URLs:", videoUrls);

    if (videoUrls.length === 0) {
      throw new Error("No videos found");
    }

    // 3️⃣ DOWNLOAD CLIPS
    const files = [];

    for (let i = 0; i < videoUrls.length; i++) {
      const path = `public/clip_${i}.mp4`;

      const response = await axios({
        url: videoUrls[i],
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(path);
      response.data.pipe(writer);

      await new Promise((res) => writer.on("finish", res));

      files.push(path);
    }

    console.log("📁 Files downloaded:", files);

    // 4️⃣ CREATE CONCAT FILE (FIXED PATH)
    const concatFile = "public/concat.txt";

    const contentTxt = files
      .map(f => `file '${f.replace("public/", "")}'`)
      .join("\n");

    fs.writeFileSync(concatFile, contentTxt);

    console.log("📝 Concat file created");

    // 5️⃣ STITCH VIDEO (LOW MEMORY SAFE)
    const output = "public/final.mp4";

    await new Promise((resolve, reject) => {
      exec(
        `cd public && ffmpeg -f concat -safe 0 -i concat.txt -vf "scale=720:1280" -c:v libx264 -preset veryfast -crf 28 -y final.mp4`,
        (err, stdout, stderr) => {
          if (err) {
            console.error("❌ FFMPEG ERROR:", stderr);
            return reject(err);
          }
          console.log("✅ FFMPEG SUCCESS");
          resolve();
        }
      );
    });

    console.log("🎬 FINAL VIDEO READY");

    // 6️⃣ RETURN RESULT
    res.json({
      script,
      videoUrl: "/final.mp4",
    });

  } catch (err) {
    console.error("🚨 SERVER ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});


// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});