"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🎯 GENERATE SCRIPT
  const handleScript = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setScript(data.script);
    } catch (err) {
      console.error(err);
      alert("Script failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔊 GENERATE VOICE
  const handleVoice = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      if (!res.ok) throw new Error("Voice failed");

      const blob = await res.blob(); // ✅ FIXED
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);

      // ▶️ play audio
      const audio = new Audio(url);
      audio.play();

      // ⬇️ download audio
      const link = document.createElement("a");
      link.href = url;
      link.download = "voice.mp3";
      link.click();
    } catch (err) {
      console.error(err);
      alert("Voice failed");
    } finally {
      setLoading(false);
    }
  };

  // 🎬 GENERATE VIDEO (next step backend)
  const handleVideo = async () => {
    try {
      if (!audioUrl) throw new Error("No audio yet");

    const res = await fetch("https://ai-reel-studio-production.up.railway.app/generate-video", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    script: prompt, // ✅ THIS is the key fix
  }),
});

const data = await res.json();

if (!data.videoUrl) throw new Error("No video");

window.open(data.videoUrl);
    } catch (err) {
      console.error(err);
      alert("Video failed");
    }
  };

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🎬 AI Reel Generator</h1>

      <input
        placeholder="Enter your idea..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginTop: 20,
          marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleScript}>
          ✨ Generate Script
        </button>

        <button onClick={handleVoice}>
          🔊 Generate Voice
        </button>

        <button onClick={handleVideo}>
          🎬 Generate Video
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {script && (
        <pre
          style={{
            marginTop: 20,
            whiteSpace: "pre-wrap",
            background: "#111",
            color: "#fff",
            padding: 20,
          }}
        >
          {script}
        </pre>
      )}
    </main>
  );
}