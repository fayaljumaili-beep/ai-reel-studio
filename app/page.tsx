export default function FacelessReelSaaS() {
  const features = [
    'Ultra-fast AI script generation',
    'Studio-quality voiceovers',
    'One-click reel export',
    'Caption-ready workflow',
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
              Trusted by creators • Built for viral growth
            </p>
            <h1 className="text-6xl font-black tracking-tight leading-tight">
              The AI Reel Studio That Can Compete With The Big Names 🚀
            </h1>
            <p className="mt-5 max-w-2xl text-xl text-zinc-400">
              Create premium faceless reels with pro scripts, natural voiceovers, instant previews, and export-ready MP4s in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button className="rounded-2xl bg-white px-6 py-4 font-bold text-black">Start Creating</button>
              <button className="rounded-2xl border border-zinc-700 px-6 py-4 font-bold">Watch Demo</button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-900 p-4"><p className="text-3xl font-black">10x</p><p className="text-zinc-400">Faster workflow</p></div>
              <div className="rounded-2xl bg-zinc-900 p-4"><p className="text-3xl font-black">4K</p><p className="text-zinc-400">Export ready</p></div>
              <div className="rounded-2xl bg-zinc-900 p-4"><p className="text-3xl font-black">99%</p><p className="text-zinc-400">Automation</p></div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <label className="mb-3 block text-sm font-semibold text-zinc-400">Reel Topic</label>
            <input
              placeholder="How to become successful"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-4 outline-none focus:border-zinc-500"
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button className="rounded-2xl bg-white px-4 py-3 font-semibold text-black">Generate Script</button>
              <button className="rounded-2xl bg-zinc-800 px-4 py-3 font-semibold">AI Voice</button>
              <button className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 font-semibold">Export Reel</button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-2xl font-bold">🎬 Live Reel Preview</h2>
              <div className="aspect-video rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-500">
                TikTok / Reels style preview player
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-2xl font-bold">📝 Premium Script Engine</h2>
              <div className="space-y-3 text-zinc-300">
                <p><span className="font-semibold text-white">Hook:</span> Scroll-stopping emotional opener.</p>
                <p><span className="font-semibold text-white">Value:</span> Story + transformation + proof.</p>
                <p><span className="font-semibold text-white">CTA:</span> Designed for follows and conversions.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-bold">🔊 Voice Studio</h2>
              <audio controls className="w-full">
                <source src="/voice-output.mp3" type="audio/mpeg" />
              </audio>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-bold">⚡ Why You Win</h2>
              <ul className="space-y-3 text-zinc-300">
                {features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
              <h2 className="text-2xl font-black">Pro Plan</h2>
              <p className="mt-2 text-sm opacity-90">Unlimited reels • premium voices • team workspace</p>
              <button className="mt-5 rounded-2xl bg-white px-5 py-3 font-bold text-black">Upgrade</button>
            </div>
          </div>
        </div>
              <div className="mt-16 grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-2xl font-bold">💳 Credits & Billing</h3>
            <p className="mt-3 text-zinc-400">120 credits remaining • Stripe-powered subscriptions • auto top-up.</p>
            </p>
</div>