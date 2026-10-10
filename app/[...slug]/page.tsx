import { notFound } from 'next/navigation'
import WastexApp from '@/components/wastex-app'

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params

  if (slug.length === 0 || slug.length > 2) notFound()

  const [head, second] = slug

  // Deep routes only exist under /incidents (/:ref and /new).
  if (slug.length === 2 && head !== 'incidents') notFound()
  if (slug.length === 2 && second.length === 0) notFound()

  return <WastexApp segments={slug} />
}

export function generateStaticParams() {
  return ['dashboard','incidents','incidents/new','map','ai-vision','hotspots','operations','routes','verification','analytics','agents','reports','settings','demo'].map((slug) => ({ slug: slug.split('/') }))
}

export const dynamicParams = true
