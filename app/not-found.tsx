import Link from 'next/link'
import { ArrowUpRight, Radar } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="boundary-page">
      <div className="boundary-card">
        <span className="signal-line"><span className="pulse" /> ROUTER / NO MATCH</span>
        <h1>404 / SIGNAL LOST</h1>
        <p>This route is not registered in the WASTEX command grid. Check the address or head back to the operational sections.</p>
        <div className="boundary-actions">
          <Link href="/" className="button button-lime">BACK TO HOME <ArrowUpRight /></Link>
          <Link href="/dashboard" className="button button-outline">COMMAND CENTER <Radar /></Link>
          <Link href="/incidents" className="button button-outline">INCIDENTS <ArrowUpRight /></Link>
        </div>
      </div>
    </main>
  )
}
