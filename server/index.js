import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = "./temp";

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, category, length } = req.body;

    const duration = parseInt(length); // 30 / 60 / 90
    const clipsNeeded = Math.ceil(duration / 5);

    console.log("Fetching clips:", clipsNeeded);

    // 🔥 FETCH VIDEOS FROM PEXELS
    const response = await axios.get(
      `https://api.pexels.com/videos/search?query=${category}&per_page=${clipsNeeded}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
      }
    );

    const videos = response.data.videos;

    if (!videos.length) {
      return res.status(400).send("No videos found");
    }

    const clipPaths = [];

    // 🔥 DOWNLOAD CLIPS
    for (let i = 0; i < videos.length; i++) {
      const videoFile = videos[i].video_files[0].link;
      const filePath = path.join(TEMP_DIR, `clip${i}.mp4`);

      const writer = fs.createWriteStream(filePath);
      const vidRes = await axios.get(videoFile, { responseType: "stream" });

      vidRes.data.pipe(writer);

      await new Promise((resolve) => writer.on("finish", resolve));

      clipPaths.push(filePath);
    }

    console.log("Downloaded clips:", clipPaths.length);

    // 🔥 CREATE CONCAT FILE
    const concatFile = path.join(TEMP_DIR, "concat.txt");

    const concatContent = clipPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    fs.writeFileSync(concatFile, concatContent);

    const outputPath = path.join(TEMP_DIR, "output.mp4");

    // 🔥 MERGE WITH FFMPEG
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("Video created!");

    res.sendFile(path.resolve(outputPath));

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video");
  }
});

app.listen(8080, () => console.log("Server running 🚀"));