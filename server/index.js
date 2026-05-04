import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   ENV CONFIG
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const PEXELS_KEY = process.env.PEXELS_API_KEY;

/* =========================
   VIDEO FETCH
========================= */
async function getVideo(query) {
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: { Authorization: PEXELS_KEY }
      }
    );

    const data = await res.json();

    if (!data.videos || data.videos.length === 0) {
      return null;
    }

    const video =
      data.videos[Math.floor(Math.random() * data.videos.length)];

    return video.video_files?.[0]?.link || null;

  } catch (err) {
    console.error("Pexels error:", err);
    return null;
  }
}

/* =========================
   AI SCRIPT (FIXED + MATCHING VISUALS)
========================= */
async function generateContent({ prompt, scenario, theme, emotion, duration }) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You create viral TikTok scripts that MUST match generic stock footage (no specific actions like 'walking dog in park'). Keep it broad and relatable."
      },
      {
        role: "user",
        content: `
Topic: ${prompt}
Theme: ${theme}
Scenario: ${scenario}
Emotion: ${emotion}
Length: ${duration}

Write a HIGH-RETENTION script.

RULES:
- Must match ANY stock video
- No specific scene mismatches
- Hook must grab attention instantly
- Script should feel continuous (20–60 sec)

Return EXACT format:

Hook:
Caption:
Script:
`
      }
    ]
  });

  const text = res.choices[0].message.content;

  return {
    hook: text.match(/Hook:(.*)/)?.[1]?.trim() || "",
    caption: text.match(/Caption:(.*)/)?.[1]?.trim() || "",
    script: text.match(/Script:(.*)/s)?.[1]?.trim() || ""
  };
}

/* =========================
   MAIN ROUTE
========================= */
app.post("/generate-video", async (req, res) => {
  try {
    const {
      prompt,
      scenario,
      theme,
      emotion,
      duration
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const videos = [];

    for (let i = 0; i < 3; i++) {
      const videoUrl = await getVideo(`${theme} ${scenario}`);

      const content = await generateContent({
        prompt,
        scenario,
        theme,
        emotion,
        duration
      });

      videos.push({
        videoUrl,
        ...content
      });
    }

    res.json({ videos });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Failed to generate" });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});