import express from "express";
import cors from "cors";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(express.json());

// serve static files from /public
app.use(express.static("public"));

// simple script generator
function generateScript(prompt) {
  return `Here's the truth about ${prompt}.

It doesn't happen overnight.

Every successful person you admire started with nothing but an idea and the willingness to keep going.

There will be days when you feel stuck, when nothing seems to work, and when giving up feels easier.

But consistency is what separates winners from everyone else.

The small actions you take daily might not feel like much, but over time, they build something powerful.

Stay focused, stay disciplined, and trust the process.

Because if you keep showing up, success becomes inevitable.`;
}

// API route
app.post("/generate-video", (req, res) => {
  const { prompt } = req.body;

  const script = generateScript(prompt);

  res.json({
    script,
    videoUrl: "https://ai-reel-studio-production.up.railway.app/output.mp4"
  });
});

// health check
app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});