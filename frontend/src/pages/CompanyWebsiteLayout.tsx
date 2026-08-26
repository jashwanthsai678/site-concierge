import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { VoiceWidget } from '@/components/widget/VoiceWidget'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { BusinessPublic } from '@/types/business'
import type { Topic } from '@/lib/topicMatch'

export interface CompanySiteContext {
  business: BusinessPublic
}

const NAV_LINKS: { topic: Topic; label: string }[] = [
  { topic: 'destinations', label: 'Destinations' },
  { topic: 'process', label: 'How It Works' },
  { topic: 'pricing', label: 'Pricing' },
  { topic: 'why-us', label: 'Why Us' },
  { topic: 'testimonials', label: 'Success Stories' },
  { topic: 'faq', label: 'FAQ' },
]

/**
 * Persistent chrome around the mock multi-page company site — nav, footer,
 * and the VoiceWidget all live here, one level above the routed page
 * content (see pages/company-site/*, reached via <Outlet>), so the widget
 * and its live conversation survive page-to-page navigation instead of
 * remounting every time the AI moves the visitor to a new page.
 *
 * `Topic` values (see lib/topicMatch.ts) double as the route segments under
 * this layout on purpose — one mapping, not two, between "what the AI is
 * talking about" and "which page that lives on."
 */
export function CompanyWebsiteLayout() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['landing-page', slug],
    queryFn: () => api.getLandingPage(slug),
    enabled: slug.length > 0,
  })

  const handleTopicMatch = (topic: Topic) => {
    navigate(`/site/${slug}/${topic}`)
  }

  if (query.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoadingSpinner size={28} />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-6 text-center text-gray-500">
        We couldn't find that page.
      </div>
    )
  }

  const { business } = query.data
  const context: CompanySiteContext = { business }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <nav className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-12">
        <Link to={`/site/${slug}`} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: business.branding_color }}
          >
            {business.name.charAt(0)}
          </div>
          <span className="font-semibold">{business.name}</span>
        </Link>
        <div className="hidden gap-6 text-sm text-gray-500 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.topic} to={`/site/${slug}/${link.topic}`} className="hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <Outlet context={context} />

      <footer className="border-t border-gray-100 px-6 py-10 text-center text-xs text-gray-400 sm:px-12">
        © {new Date().getFullYear()} {business.name}. All rights reserved.
      </footer>

      <VoiceWidget
        slug={slug}
        businessName={business.name}
        mascotKey={business.mascot_key}
        onTopicMatch={handleTopicMatch}
      />
    </div>
  )
}
