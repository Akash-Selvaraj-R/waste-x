import WastexApp from '@/components/wastex-app'

export default function Page() {
  return <WastexApp />
}

export const metadata = {
  title: 'WASTEX — AI Waste Intelligence',
  description: 'See waste. Understand risk. Orchestrate action. Verify impact.',
}

export const viewport = { themeColor: '#F5F1E8', colorScheme: 'light' as const }

// Routes inside the command center are rendered by app/[...slug]/page.tsx.

export const dynamic = 'force-static'
