import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Prompt:", prompt);

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=1`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      return res.json({
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      });
    }

    // pick best quality file
    const videoFiles = data.videos[0].video_files;

    const videoUrl =
      videoFiles.find(v => v.quality === "hd")?.link ||
      videoFiles[0].link;

    console.log("Selected video:", videoUrl);

    res.json({ videoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});