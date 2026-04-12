"use client";
  };

  return (
    <main className="min-h-screen p-10 max-w-4xl mx-auto">
      <h1 className="text-5xl font-bold mb-4">Faceless Reel Scripts in 5 Seconds</h1>
      <p className="mb-6 text-lg">LIVE SAAS MODE 🚀</p>

      <div className="space-y-4 mb-6">
        <input
          className="border px-3 py-2 w-full"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic"
        />

        <div className="flex gap-3">
          <select
            className="border px-3 py-2"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option>Motivational</option>
            <option>Luxury</option>
            <option>Educational</option>
          </select>

          <select
            className="border px-3 py-2"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option>Rich Mindset</option>
            <option>Luxury Lifestyle</option>
            <option>Authority</option>
          </select>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="border px-4 py-2" onClick={generateScript}>
            {loadingScript ? "Generating..." : "✨ Generate Premium Reel Script"}
          </button>
          <button className="border px-4 py-2" onClick={generateVoice}>
            {loadingVoice ? "Generating Voice..." : "🎙️ Generate AI Voiceover"}
          </button>
          <button className="border px-4 py-2" onClick={downloadVideo}>
            {loadingVideo ? "Rendering Video..." : "🎬 Download Narrated Reel Video"}
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold">Generated Output</h2>

        {script && (
          <pre className="whitespace-pre-wrap border p-4 rounded-xl bg-gray-50">
            {script}
          </pre>
        )}

        {voiceUrl && (
          <div className="space-y-2">
            <audio controls src={voiceUrl} className="w-full" />
            <a className="underline" href={voiceUrl} download>
              ⬇ Download Voiceover
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
