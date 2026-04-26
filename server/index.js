import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 🔥 CLEAN TEXT (VERY IMPORTANT)
function clean(text) {
  return text
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 30);
}

// 🔥 SPLIT INTO 2 LINES (FOR HOOK)
function splitLines(text) {
  const words = text.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [
    words.slice(0, mid).join(" "),
    words.slice(mid).join(" ")
  ];
}


app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    const imagePath = path.join(__dirname, "image.jpg");
    const musicPath = path.join(__dirname, "assets", "music.mp3");
    const voicePath = path.join(__dirname, "voice.mp3");
    const output = path.join(__dirname, "output.mp4");

    // 🧠 SCRIPT (SHORT + VIRAL SAFE)
    const scriptRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create 1 short viral hook (3 words) and 1 short sentence (5 words max). No punctuation."
        },
        { role: "user", content: prompt }
      ],
    });

    const raw = scriptRes.choices[0].message.content.split("\n");

    const hookRaw = raw[0] || "Make money fast";
    const sentenceRaw = raw[1] || "Become rich with discipline";

    const hook = clean(hookRaw);
    const sentence = clean(sentenceRaw);

    const [line1, line2] = splitLines(hook);

    const words = sentence.split(" ");

    // 🎤 VOICE
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: sentence,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync(voicePath, buffer);

    const duration = 6;
    const perWord = duration / words.length;

    // 🔥 WORD TIMING
    let wordFilters = [];

    words.forEach((w, i) => {
      const start = (i * perWord).toFixed(2);
      const end = (start * 1 + perWord).toFixed(2);

      wordFilters.push(
        `drawtext=text='${w}':
        fontcolor=cyan:
        fontsize=70:
        borderw=2:
        bordercolor=black:
        x=(w-text_w)/2:
        y=(h-text_h)/2:
        enable='between(t,${start},${end})'`
      );
    });

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePath)
        .loop(duration)

        .input(voicePath)
        .input(musicPath)

        .complexFilter([
          "[2:a]volume=0.2[a2]",
          "[1:a][a2]amix=inputs=2:duration=longest[aout]"
        ])

        .videoFilters([
          // 🔥 smooth zoom
          "zoompan=z='1.05':d=150:s=720x1280",

          // 🔥 HOOK (2 lines, no overflow)
          `drawtext=text='${line1}':
          fontcolor=yellow:
          fontsize=70:
          borderw=3:
          bordercolor=black:
          x=(w-text_w)/2:
          y=80`,

          `drawtext=text='${line2}':
          fontcolor=yellow:
          fontsize=70:
          borderw=3:
          bordercolor=black:
          x=(w-text_w)/2:
          y=160`,

          // 🔥 WORD BY WORD
          ...wordFilters,

          // 🔥 SUBTITLE (clean bottom)
          `drawtext=text='${sentence}':
          fontcolor=white:
          fontsize=36:
          borderw=2:
          bordercolor=black:
          x=(w-text_w)/2:
          y=h-120`
        ])

        .outputOptions([
          "-map 0:v",
          "-map [aout]",
          "-t 6",
          "-preset ultrafast",
          "-crf 28",
          "-shortest"
        ])

        .save(output)
        .on("end", resolve)
        .on("error", reject);
    });

    res.sendFile(output);

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, () => {
  console.log("🚀 Phase 2 CLEAN running");
});