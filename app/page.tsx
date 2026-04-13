"use client";

import { useState } from "react";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const generateScript = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!res.ok) throw new Error("Script generation failed");

      const data = await res.json();
      setScript(data.script || data.text || "");
    } catch (error) {
      console.error(error);
      alert("Script generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateVoice = async () => {
    try {
      const res = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/voiceover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: script || prompt,
          }),
        }
      );

      if (!res.ok) throw new Error("Voice generation failed");

      const data = await res.json();
      const url = data.audioUrl || data.voiceUrl || data.url || "";
      setVoiceUrl(url);
    } catch (error) {
      console.error(error);
      alert("Voice generation failed");
    }
  };

  const downloadReel = async () => {
    try {
      setLoading(true);

      const payload = {
        prompt,
        audioUrl: voiceUrl,
        voiceUrl,
        audio: voiceUrl,
        url: voiceUrl,
      };

      const res = await fetch(
        "https://ai-reel-studio-frontend-production.up.railway.app/generate-video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Video generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Video generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-10 bg-white text-black">
      <h1 className="text-5xl font-bold mb-8">
        Faceless Reel Scripts in 5 Seconds
      </h1>

      <p className="mb-4 text-lg">LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="how to become successful"
        className="w-full max-w-2xl border border-gray-400 p-3 rounded mb-4"
      />

      <div className="flex gap-3 mb-8 flex-wrap">
        <button
          onClick={generateScript}
          disabled={loading}
          className="border px-4 py-2 rounded"
        >
          ✨ Generate Premium Reel Script
        </button>

        <button
          onClick={generateVoice}
          disabled={!script}
          className="border px-4 py-2 rounded"
        >
          🎙️ Generate AI Voiceover
        </button>

        <button
          onClick={downloadReel}
          disabled={!voiceUrl || loading}
          className="border px-4 py-2 rounded"
        >
          🎬 Download Narrated Reel
        </button>
      </div>

      <section>
        <h2 className="text-3xl font-bold mb-4">Generated Output</h2>
        <pre className="whitespace-pre-wrap text-base leading-7">
          {script}
        </pre>
      </section>
    </main>
  );
}
