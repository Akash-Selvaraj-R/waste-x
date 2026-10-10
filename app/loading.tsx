export default function Loading() {
  return (
    <main className="boundary-page" role="status" aria-live="polite">
      <div className="boundary-card">
        <span className="signal-line"><span className="pulse" /> LOADING MODULE</span>
        <h1>BOOTING VIEW…</h1>
        <p>Assembling the WASTEX operational screen. Demo fixtures load locally — no network request is required.</p>
      </div>
    </main>
  )
}
