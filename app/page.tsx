"use client";
      console.error(error);
      alert("Voice generation failed");
    } finally {
      setLoadingVoice(false);
    }
  };

  const generateVideo = async () => {
    if (!script.trim()) {
      alert("Generate script first");
      return;
    }

    setLoadingVideo(true);

    try {
      const res = await fetch(`${API}/generate-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script,
          captionText: script.split("\n")[0] || script,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Video generation failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (error) {
      console.error(error);
      alert("Video generation failed");
    } finally {
      setLoadingVideo(false);
    }
  };

  return (
    <main className="min-h-screen p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">
        Faceless Reel Scripts in 5 Seconds
      </h1>

      <p className="mb-6">LIVE SAAS MODE 🚀</p>

      <input
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="How to become successful"
        className="border p-2 w-full mb-4"
      />

      <div className="flex gap-3 flex-wrap mb-8">
        <button
          onClick={generateScript}
          disabled={loadingScript}
          className="border px-4 py-2"
        >
          {loadingScript ? "Generating Script..." : "✨ Generate Premium Reel Script"}
        </button>

        <button
          onClick={generateVoice}
          disabled={loadingVoice}
          className="border px-4 py-2"
        >
          {loadingVoice ? "Generating Voice..." : "🎙️ Generate AI Voiceover"}
        </button>

        <button
          onClick={generateVideo}
          disabled={loadingVideo}
          className="border px-4 py-2"
        >
          {loadingVideo ? "Rendering Reel..." : "🎬 Download Narrated Reel Video"}
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Generated Output</h2>

      <div className="whitespace-pre-wrap border p-4 min-h-[220px] mb-6">
        {script}
      </div>

      {audioUrl && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">VOICEOVER</h3>
          <audio controls src={audioUrl} className="w-full" />
          <a href={audioUrl} download className="block mt-2 underline">
            ⬇️ Download Voiceover
          </a>
        </div>
      )}

      {videoUrl && (
        <div>
          <h3 className="font-semibold mb-2">FINAL REEL</h3>
          <video controls src={videoUrl} className="w-full max-w-sm" />
          <a
            href={videoUrl}
            download="viral-reel.mp4"
            className="block mt-2 underline"
          >
            ⬇️ Download Final Reel
          </a>
        </div>
      )}
    </main>
  );
}
