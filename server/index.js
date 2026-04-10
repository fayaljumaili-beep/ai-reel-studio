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

   const script = `
Hook: Want to know ${topic}?

Main:
Here are 3 mindset shifts used by highly successful people.
1. Stay disciplined
2. Think long term
3. Execute daily

CTA:
Follow for more ${template} content.
`;

return res.json({
  success: true,
  script,
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

app.options("/generate", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

/**
 * Railway server start
 */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});