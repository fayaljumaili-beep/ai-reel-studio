const express = require("express");
const cors = require("cors");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post("/generate-video", async (req, res) => {
try {
const { text = "how to become successful", duration = 6 } = req.body;

```
const imagePath = path.join(__dirname, "assets/image.jpg");
const outputPath = path.join(__dirname, "final-reel.mp4");

const words = text.split(" ");
const wordDuration = duration / words.length;

const hook = "MAKE MONEY FAST";

let filters = [];

// 🎥 Smooth zoom
filters.push("zoompan=z='min(zoom+0.0005,1.2)':d=125");

// 🧠 Hook (FIXED QUOTES)
filters.push(
  `drawtext=text='${hook.replace(/'/g, "")}':fontcolor=yellow:fontsize=60:x=(w-text_w)/2:y=80`
);

// 💬 Word-by-word
words.forEach((word, i) => {
  const start = (i * wordDuration).toFixed(2);
  const end = ((i + 1) * wordDuration).toFixed(2);

  filters.push(
    `drawtext=text='${word.replace(/'/g, "")}':fontcolor=white:fontsize=70:x=(w-text_w)/2:y=(h/2):enable='between(t,${start},${end})'`
  );
});

// 📌 Bottom text
filters.push(
  `drawtext=text='${text.replace(/'/g, "")}':fontcolor=cyan:fontsize=40:x=(w-text_w)/2:y=h-120`
);

ffmpeg()
  .input(imagePath)
  .loop(duration)
  .outputOptions([
    `-t ${duration}`,
    `-vf ${filters.join(",")}`,
    "-pix_fmt yuv420p",
    "-c:v libx264"
  ])
  .save(outputPath)
  .on("end", () => {
    res.sendFile(outputPath);
  })
  .on("error", (err) => {
    console.error(err);
    res.status(500).json({ error: "ffmpeg failed" });
  });
```

} catch (err) {
console.error(err);
res.status(500).json({ error: "server error" });
}
});

app.listen(PORT, () => {
console.log("Server running on port", PORT);
});
