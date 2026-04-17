"use client";

import { useState } from "react";

export default function PremiumDashboard() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateScript = async () => {
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

      console.log("SCRIPT RESPONSE:", data);

      alert(data.script || "No script returned");
    } catch (err) {
      console.error(err);
      alert("❌ Script generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceover = () => {
    alert("🎤 Voiceover coming next (we'll wire this after)");
  };

  const handleDownload = () => {
    alert("⬇️ Download coming next (we'll wire this after)");
  };

  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Reel Studio</h1>

      <p className="mb-6">
        Turn any topic into a premium short-form content machine.
      </p>

      <input
        type="text"
        placeholder="Enter topic (e.g. how to become successful)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="border p-3 rounded w-full mb-4"
      />

      <div className="flex gap-4">
        <button
          onClick={handleGenerateScript}
          className="rounded-2xl bg-zinc-800 px-4 py-3 font-semibold text-white"
        >
          {loading ? "Generating..." : "Generate Premium Script"}
        </button>

        <button
          onClick={handleVoiceover}
          className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white"
        >
          Generate AI Voiceover
        </button>

        <button
          onClick={handleDownload}
          className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white"
        >
          Download Narrated Reel
        </button>
      </div>
    </section>
  );
}