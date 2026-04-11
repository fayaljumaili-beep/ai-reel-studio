"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState("Motivational");
  const [template, setTemplate] = useState("Rich Mindset");

  const [scriptResult, setScriptResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            voice,
            template,
          }),
        }
      );

      const data = await res.json();
      console.log("RAW API RESPONSE:", data);

      setScriptResult(data);
    } catch (error) {
      console.error(error);
      alert("Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate-video",
        {
          method: "POST",
        }
      );

      if (!res.ok) throw new Error("Video failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      a.click();
    } catch (error) {
      console.error(error);
      alert("Video generation failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1120] text-white flex justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-[#111827] p-6 shadow-2xl">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Faceless Reel Scripts in 5 Seconds
          </h1>

          <p className="text-gray-300 mb-6">
            Generate scroll-stopping hooks, engaging body scripts, and now export
            them as downloadable MP4 reels.
          </p>

          <div className="space-y-4">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your topic..."
              className="w-full rounded-xl bg-[#1F2937] p-4 outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="rounded-xl bg-[#1F2937] p-3"
              >
                <option>Motivational</option>
                <option>Luxury</option>
                <option>Authority</option>
              </select>

              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="rounded-xl bg-[#1F2937] p-3"
              >
                <option>Rich Mindset</option>
                <option>Discipline</option>
                <option>Luxury</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 py-4 font-bold"
            >
              {loading ? "Generating..." : "✨ Generate Premium Reel Script"}
            </button>

            <button
              onClick={handleDownload}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 font-bold"
            >
              🎬 Download Reel Video
            </button>
          </div>
        </div>

        {/* GUARANTEED RESPONSE RENDER */}
        {scriptResult && (
          <div className="mt-6 rounded-2xl bg-[#111827] p-6">
            <h2 className="text-2xl font-bold mb-4">Generated Output</h2>

            <pre className="whitespace-pre-wrap text-sm text-green-300">
              {JSON.stringify(scriptResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}