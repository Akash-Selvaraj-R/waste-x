'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="boundary-page">
      <div className="boundary-card boundary-card-error" role="alert">
        <span className="signal-line"><AlertTriangle /> SYSTEM / RUNTIME FAULT</span>
        <h1>RENDER FAILED</h1>
        <p>
          {error.message || 'An unexpected error interrupted this view.'}
          {error.digest ? ` / REF ${error.digest}` : ''}
        </p>
        <div className="boundary-actions">
          <button className="button button-lime" onClick={reset}>RETRY VIEW <ArrowUpRight /></button>
          <Link href="/dashboard" className="button button-outline">COMMAND CENTER</Link>
          <Link href="/" className="button button-outline">BACK TO HOME</Link>
        </div>
      </div>
    </main>
  )
}
