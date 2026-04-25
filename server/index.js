import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Stripe from "stripe";

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json());
app.use(cors());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PORT = process.env.PORT || 8080;

// 🔥 TEMP DB
const users = [];

/* =========================
   AUTH
========================= */

// SIGNUP
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  users.push({ email, password: hashed, premium: false });

  res.json({ success: true });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  const token = jwt.sign({ email }, process.env.JWT_SECRET);

  res.json({ token });
});

/* =========================
   STRIPE
========================= */

app.post("/create-checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: "AI Reel Studio Pro" },
        unit_amount: 999,
      },
      quantity: 1,
    }],
    success_url: process.env.CLIENT_URL,
    cancel_url: process.env.CLIENT_URL,
  });

  res.json({ url: session.url });
});

/* =========================
   GENERATE
========================= */

app.post("/generate-video", async (req, res) => {
  const { prompt } = req.body;

  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${prompt}&per_page=6`,
    { headers: { Authorization: process.env.PEXELS_API_KEY } }
  );

  const data = await response.json();

  const videos = data.videos.map(
    v => v.video_files.find(f => f.quality === "sd")?.link
  );

  const hooks = [
    "Nobody tells you this...",
    "You’re doing this wrong...",
  ];

  const body = [
    "Consistency beats motivation.",
    "Small actions compound.",
    "Discipline creates freedom.",
    "Execute daily.",
  ];

  const script = [...hooks, ...body];

  res.json({ videos, script });
});

/* =========================
   EXPORT
========================= */

app.post("/export-video", async (req, res) => {
  try {
    const { videos, script, style } = req.body;

    const output = "final.mp4";
    const duration = 2.5;

    let textColor = "white";
    if (style === "luxury") textColor = "gold";
    if (style === "gym") textColor = "red";

    const command = ffmpeg();

    videos.slice(0, script.length).forEach(v => {
      command.input(v).inputOptions([`-t ${duration}`]);
    });

    const subtitles = script.map((line, i) => {
      const start = i * duration;
      const end = start + duration;

      return `drawtext=text='${line}':fontcolor=${textColor}:fontsize=40:x=(w-text_w)/2:y=h-150:borderw=3:bordercolor=black:enable='between(t,${start},${end})'`;
    }).join(",");

    command
      .complexFilter([
        `[0:v][1:v][2:v][3:v][4:v][5:v]concat=n=${script.length}:v=1:a=0[v]`,
        `[v]${subtitles}[outv]`
      ])
      .outputOptions(["-map [outv]"])
      .on("end", () => {
        res.download(output, () => fs.unlinkSync(output));
      })
      .on("error", err => {
        console.error(err);
        res.status(500).send("FFmpeg error");
      })
      .save(output);

  } catch (err) {
    res.status(500).send("Export error");
  }
});

app.listen(PORT, () => {
  console.log("🚀 Server running on " + PORT);
});