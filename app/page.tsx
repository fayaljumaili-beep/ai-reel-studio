"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("motivational");
  const [template, setTemplate] = useState("money");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const generateReel = async () => {
    try {
      setLoading(true);

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://ai-reel-studio-frontend-production.up.railway.app";

      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          voice,
          template,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate video");
      }

      const data = await res.json();
      setVideoUrl(data.videoUrl);
      setHistory((prev) => [data.videoUrl, ...prev]);
    } catch (error) {
      console.error("Frontend error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-5xl font-bold mb-10">🎬 AI Reel Studio</h1>

        <div className="bg-zinc-900 rounded-3xl shadow-2xl p-6 space-y-5 border border-zinc-800">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter reel topic..."
            className="w-full rounded-xl bg-black border border-zinc-700 px-4 py-4 text-lg outline-none"
          />

          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full rounded-xl bg-black border border-zinc-700 px-4 py-4 text-lg"
          >
            <option value="motivational">🎙️ Motivational</option>
            <option value="business">💼 Business Coach</option>
            <option value="gym">💪 Gym Hype</option>
          </select>

          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-xl bg-black border border-zinc-700 px-4 py-4 text-lg"
          >
            <option value="money">💸 Rich Mindset</option>
            <option value="love">❤️ Love</option>
            <option value="mindset">🧠 Mindset</option>
          </select>

          <button
            onClick={generateReel}
            disabled={loading}
            className="w-full rounded-xl bg-white text-black font-semibold py-4 text-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Generating..." : "✨ Generate Reel"}
          </button>
        </div>

        {videoUrl && (
          <div className="mt-10">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-2xl border border-zinc-700"
            />
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Recent Reels</h2>
            <div className="space-y-3">
              {history.map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  className="w-full rounded-xl border border-zinc-800"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
