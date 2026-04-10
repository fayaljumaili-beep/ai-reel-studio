require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/**
 * Global CORS
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
 * Generate route
 */
app.options("/generate", cors());

app.post("/generate", async (req, res) => {
  try {
    const { topic, voice, template } = req.body;

    return res.json({
      success: true,
      message: "Generate route is working",
      topic,
      voice,
      template,
    });
  } catch (error) {
    console.error("Generate route error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
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