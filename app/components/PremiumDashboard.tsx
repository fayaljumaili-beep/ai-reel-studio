"use client";

import { useState } from "react";

export default function PremiumDashboard() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const handleGenerateScript = async () => {
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
    setLoading(false);
  };

  const handleVoice = async () => {
    setPlaying(true);
    const res = await fetch("/api/generate-voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: script }),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();

    audio.onended = () => setPlaying(false);
  };

  const handleDownload = async () => {
    const res = await fetch("/api/generate-voice", {
      method: "POST",
      body: JSON.stringify({ text: script }),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "voiceover.mp3";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

        <h1 className="text-4xl font-bold mb-2">🚀 AI Reel Studio</h1>
        <p className="text-zinc-400 mb-6">
          Turn ideas into viral short-form content
        </p>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your idea..."
          className="w-full p-4 rounded-xl bg-black/40 border border-white/10 mb-6 outline-none"
        />

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleGenerateScript}
            className="flex-1 bg-white text-black font-semibold py-3 rounded-xl hover:opacity-80"
          >
            {loading ? "Generating..." : "Generate Script"}
          </button>

          <button
            onClick={handleVoice}
            className="flex-1 bg-blue-500 py-3 rounded-xl hover:bg-blue-600"
          >
            {playing ? "Playing..." : "Generate Voice"}
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 bg-green-500 py-3 rounded-xl hover:bg-green-600"
          >
            Download MP3
          </button>
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-white/10 whitespace-pre-wrap">
          {script || "Your script will appear here..."}
        </div>
      </div>
    </div>
  );
}