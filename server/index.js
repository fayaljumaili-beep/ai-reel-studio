const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/generate", (req, res) => {
  const { topic, voice, template } = req.body;

  const script = `Hook: Want to know ${topic}?

Main:
Here are 3 mindset shifts used by highly successful people.
1. Stay disciplined
2. Think long term
3. Execute daily

CTA:
Follow for more ${template} content.`;

  return res.json({
    success: true,
    script,
    topic,
    voice,
    template,
  });
});

app.post("/generate-video", (req, res) => {
  const filePath = path.join(__dirname, "sample.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(500).json({
      error: "sample.mp4 missing in server folder",
    });
  }

  return res.download(filePath, "viral-reel-final.mp4");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
