require("dotenv").config();

const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const app = express();

app.use(cors());
app.use(express.json());

// health check (important for Railway)
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

// --- TEST ROUTE (so we know backend works)
app.get("/test", (req, res) => {
  res.json({ message: "Backend is alive 🚀" });
});

// --- VIDEO GENERATION PLACEHOLDER
app.post("/generate-video", async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({ error: "Missing script" });
    }

    // For now just simulate success
    // (we’ll plug real ffmpeg later)
    const fakeUrl = "https://www.w3schools.com/html/mov_bbb.mp4";

    return res.json({
      success: true,
      videoUrl: fakeUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Video generation failed" });
  }
});

// --- START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});