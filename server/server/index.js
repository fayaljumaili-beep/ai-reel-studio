const express = require("express");

const app = express();

// manual CORS (bulletproof)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  console.log("🔥 route hit");

  res.json({
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port", PORT);
});