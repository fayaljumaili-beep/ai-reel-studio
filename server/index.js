require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/**
 * CORS
 * Use wildcard first to fully kill the browser preflight issue.
 * Later we can lock this down to your Vercel domain.
 */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/**
 * Health route
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Reel Studio backend running",
  });
});

/**
 * IMPORTANT:
 * Handle browser preflight for /generate
 */
app.options("/generate", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

app.post("/generate", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    const { topic, voice, template } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Topic is required",
      });
    }

    return res.json({
      success: true,
      message: "Generate route is working",
      topic,
      voice,
      template,
      videoUrl: null,
    });
  } catch (error) {
    console.error("Generate error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
});

/**
 * Railway server start
 */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});