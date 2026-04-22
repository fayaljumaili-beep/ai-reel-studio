const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors()); // ✅ THIS LINE IS CRITICAL
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server works");
});

app.post("/generate-video", (req, res) => {
  console.log("BODY:", req.body); // 👈 debug

  const prompt = (req.body.prompt || "").toLowerCase();

  let videoUrl;

  if (prompt.includes("gym")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/05/30/24177-339430569_large.mp4";
  } else if (prompt.includes("motivation")) {
    videoUrl = "https://cdn.pixabay.com/video/2020/01/28/31569-387605019_large.mp4";
  } else if (prompt.includes("nature")) {
    videoUrl = "https://cdn.pixabay.com/video/2019/03/26/22388-327070540_large.mp4";
  } else {
    videoUrl = "https://cdn.pixabay.com/video/2017/08/31/11664-232650331_large.mp4";
  }

  res.json({ videoUrl });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port", PORT);
});