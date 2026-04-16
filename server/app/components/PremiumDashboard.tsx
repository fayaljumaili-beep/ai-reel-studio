export default function PremiumDashboard() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">AI Reel Studio</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Faceless Reel SaaS <span className="text-zinc-400">v4</span>
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Generate viral scripts, premium voiceovers, and export ready-to-post narrated reels in minutes.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Today</p>
            <p className="mt-2 text-2xl font-semibold">24 videos</p>
            <p className="text-sm text-emerald-400">+18% vs yesterday</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">Create Your Next Viral Reel</h2>
            <p className="mt-2 text-zinc-400">Turn any topic into a premium short-form content machine.</p>

            <div className="mt-6 space-y-4">
              <input
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-lg outline-none"
                placeholder="Enter a topic like: how to become successful"
              />

              <div className="grid gap-3 md:grid-cols-3">
                <button className="rounded-2xl bg-white px-4 py-4 font-semibold text-black transition hover:scale-[1.02]">
                  Generate Premium Script
                </button>
                <button className="rounded-2xl bg-zinc-800 px-4 py-4 font-semibold transition hover:bg-zinc-700">
                  Generate AI Voiceover
                </button>
                <button className="rounded-2xl bg-emerald-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.02]">
                  Download Narrated Reel
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-2xl font-bold">Credits & Billing</h3>
            <p className="mt-3 text-zinc-400">120 credits remaining · Stripe-ready plans</p>
            <div className="mt-6 rounded-2xl bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Current plan</p>
              <p className="mt-2 text-3xl font-bold">Pro</p>
              <p className="text-emerald-400">$49/mo</p>
            </div>
            <button className="mt-6 w-full rounded-2xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800">
              Upgrade to Agency
            </button>
          </aside>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">Scripts Generated</p>
            <p className="mt-2 text-4xl font-bold">1,284</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">Voiceovers</p>
            <p className="mt-2 text-4xl font-bold">942</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-500">Downloads</p>
            <p className="mt-2 text-4xl font-bold">611</p>
          </div>
        </div>
      </div>
    </main>
  );
}
