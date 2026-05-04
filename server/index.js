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

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
}

// 🎯 smarter AI generation
async function generateContent({ prompt, scenario, theme }) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You create viral TikTok style short-form video scripts."
      },
      {
        role: "user",
        content: `
Topic: ${prompt}
Scenario: ${scenario}
Theme: ${theme}

Return STRICTLY:
Hook:
Caption:
Script:
`
      }
    ]
  });

  const text = res.choices[0].message.content;

  return {
    hook: text.match(/Hook:(.*)/)?.[1]?.trim(),
    caption: text.match(/Caption:(.*)/)?.[1]?.trim(),
    script: text.match(/Script:(.*)/s)?.[1]?.trim()
  };
}

// 🎥 better randomization
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

// 🔊 voice selector
function getVoiceId(voice) {
  const voices = {
    male: "uIZsnBL0YK1S5j69bAih",
    female: "EXAVITQu4vr4xnSDxMaL",
    deep: "TxGEqnHWrfWFTfGW9XjX"
  };
  return voices[voice] || voices.male;
}

async function generateVoice(text, voice) {
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${getVoiceId(voice)}`,
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

// 🚀 MAIN ROUTE
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, scenario, theme, voice } = req.body;

    const results = [];

    for (let i = 0; i < 3; i++) {
      const ai = await generateContent({ prompt, scenario, theme });

      const videoUrl = await getVideo(prompt);
      const videoPath = `video-${Date.now()}-${i}.mp4`;

      const videoRes = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(videoPath);
      videoRes.data.pipe(writer);
      await new Promise(r => writer.on("finish", r));

      const voicePath = await generateVoice(ai.script, voice);

      const output = `output-${Date.now()}-${i}.mp4`;

      await execPromise(`
        ffmpeg -y -i ${videoPath} -i ${voicePath} \
        -c:v libx264 -preset ultrafast -crf 30 \
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
app.listen(process.env.PORT || 8080);