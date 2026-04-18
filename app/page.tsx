"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = "https://ai-reel-studio-frontend-production.up.railway.app/";

  // 1️⃣ GENERATE SCRIPT
  const handleScript = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
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

  // 2️⃣ GENERATE VOICE
  const handleVoice = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/voiceover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      const data = await res.json();

      if (!data.audioUrl) throw new Error("No audio");

      // download audio
      const link = document.createElement("a");
      link.href = `${BASE_URL}${data.audioUrl}`;
      link.download = "voice.mp3";
      link.click();
    } catch (err) {
      console.error(err);
      alert("Voice failed");
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ GENERATE VIDEO
  const handleVideo = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/generate-video`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Video failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      a.click();
    } catch (err) {
      console.error(err);
      alert("Video failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 40, maxWidth: 600, margin: "auto" }}>
      <h1>🎬 AI Reel Generator</h1>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic..."
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleScript}>
        {loading ? "Loading..." : "✨ Generate Script"}
      </button>

      <button onClick={handleVoice} style={{ marginLeft: 10 }}>
        🔊 Generate Voice
      </button>

      <button onClick={handleVideo} style={{ marginLeft: 10 }}>
        🎬 Download Video
      </button>

      <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        {script}
      </pre>
    </main>
  );
}