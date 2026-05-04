import express from "express";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";
import OpenAI from "openai";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// helper
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        reject(stderr);
      } else resolve(stdout);
    });
  });
}

// AI content
async function generateContent(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You create viral TikTok hooks and captions."
      },
      {
        role: "user",
        content: `Topic: ${prompt}
Return STRICTLY:
Hook:
Caption:
Script:`
      }
    ]
  });

  const text = res.choices[0].message.content;

  const hook = text.match(/Hook:(.*)/)?.[1]?.trim() || prompt;
  const caption = text.match(/Caption:(.*)/)?.[1]?.trim() || "";
  const script = text.match(/Script:(.*)/s)?.[1]?.trim() || prompt;

  return { hook, caption, script, full: text };
}

// Pexels
async function getVideo(query) {
  const res = await axios.get(
    `https://api.pexels.com/videos/search?query=${query}&per_page=10`,
    {
      headers: { Authorization: process.env.PEXELS_API_KEY }
    }
  );

  const vids = res.data.videos;
  const random = vids[Math.floor(Math.random() * vids.length)];

  return random.video_files[0].link;
}

// voice
async function generateVoice(text) {
  const res = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/uIZsnBL0YK1S5j69bAih",
    { text },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  const file = `voice-${Date.now()}.mp3`;
  fs.writeFileSync(file, res.data);
  return file;
}

// MAIN
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const results = [];

    for (let i = 0; i < 3; i++) {
      const ai = await generateContent(prompt + " " + i);

      const videoUrl = await getVideo(prompt);
      const videoPath = `video-${Date.now()}-${i}.mp4`;

      const videoRes = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(videoPath);
      videoRes.data.pipe(writer);

      await new Promise(resolve => writer.on("finish", resolve));

      const voicePath = await generateVoice(ai.script);

      const output = `output-${Date.now()}-${i}.mp4`;

      await execPromise(`
        ffmpeg -y -i ${videoPath} -i ${voicePath} \
        -c:v libx264 -preset ultrafast -crf 32 \
        -shortest ${output}
      `);

      results.push({
        videoUrl: `https://ai-reel-studio-production.up.railway.app/${output}`,
        hook: ai.hook,
        caption: ai.caption
      });
    }

    res.json({ results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

app.use(express.static("."));

app.listen(process.env.PORT || 8080, () =>
  console.log("Server running")
);