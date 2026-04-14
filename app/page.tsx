"use client";

import { useState } from "react";

const API = "https://ai-reel-studio-frontend-production.up.railway.app";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const generateScript = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/generate-script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error("Script generation failed");
      }

      const data = await res.json();
      setScript(data.script || "");
      setVoiceUrl(""); // reset old voice when new script generated
    } catch (error) {
      console.error("SCRIPT ERROR:", error);
      alert("Script generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateVoice = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/voiceover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Voice generation failed");
      }

      const data = await res.json();
      console.log("VOICE RESPONSE:", data);

      // ✅ critical fix
      setVoiceUrl(data.voiceUrl || "");
    } catch (error) {
      console.error("VOICE ERROR:", error);
      alert("Voice generation failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadReel = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceUrl,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Video generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-reel.mp4";
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("VIDEO ERROR:", error);
      alert("Video generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-4xl font-bold">
        Faceless Reel Scripts in 5 Seconds
      </h1>

      <p>LIVE SAAS MODE 🚀</p>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="how to become successful"
        className="border px-4 py-2 w-full"
      />

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={generateScript}
          disabled={loading}
          className="border px-4 py-2 rounded"
        >
          Generate Premium Reel Script
        </button>

        <button
          onClick={generateVoice}
          disabled={!script || loading}
          className="border px-4 py-2 rounded"
        >
          Generate AI Voiceover
        </button>

        <button
          onClick={downloadReel}
          disabled={!voiceUrl || loading}
          className="border px-4 py-2 rounded"
        >
          Download Narrated Reel
        </button>
      </div>

      <section>
        <h2 className="text-2xl font-bold">Generated Output</h2>
        <pre className="whitespace-pre-wrap">{script}</pre>
      </section>

      {/* ✅ audio player appears once voiceUrl is set */}
      {voiceUrl && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Generated Voice</h2>
          <audio controls src={voiceUrl} className="w-full" />
        </section>
      )}
    </main>
  );
}