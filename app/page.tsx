'use client'

import { useState } from 'react'

export default function Home() {
  const [topic, setTopic] = useState('')
  const [script, setScript] = useState('')
  const [audioUrl, setAudioUrl] = useState('')

  const generateScript = async () => {
    const res = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })

    const data = await res.json()
    setScript(data.script)
  }

  const generateVoice = async () => {
    const res = await fetch('/api/voiceover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    })

    const data = await res.json()
    setAudioUrl(data.audioUrl)
  }

  return (
    <main className="p-10 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">AI Reel Generator</h1>

      <input
        className="w-full p-3 border rounded"
        placeholder="Enter topic..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <button
        onClick={generateScript}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Generate Script
      </button>

      {script && (
        <>
          <div className="p-4 border rounded whitespace-pre-line">
            {script}
          </div>

         <button
  onClick={handleGenerateVoice}
  className="bg-purple-600 text-white px-4 py-2 rounded-lg mt-4"
>
  🎤 Generate Voiceover
</button>
<button
  className="bg-black text-white px-4 py-2 rounded-lg mt-4"
>
  🎬 Generate Narrated Reel
</button>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" />
      )}
    </main>
  )
}
<main className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
  <h1 className="text-3xl font-bold">AI Reel Generator</h1>
  
  {/* your inputs + buttons here */}
</main>