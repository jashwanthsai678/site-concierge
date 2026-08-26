import { Link, useOutletContext } from 'react-router-dom'
import type { CompanySiteContext } from '@/pages/CompanyWebsiteLayout'

const STATS: [string, string][] = [
  ['500+', 'Students Placed'],
  ['15+', 'Partner Countries'],
  ['98%', 'Visa Success Rate'],
  ['12+', 'Years of Experience'],
]

const EXPLORE_LINKS = [
  { to: 'destinations', label: 'Popular Destinations', blurb: 'Where our students go, and why.' },
  { to: 'process', label: 'How It Works', blurb: 'From consultation to landing abroad.' },
  { to: 'pricing', label: 'Pricing', blurb: 'Transparent, one-time package pricing.' },
]

export function HomePage() {
  const { business } = useOutletContext<CompanySiteContext>()

  return (
    <>
      <header className="px-6 py-20 text-center sm:px-12">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold text-gray-900">
          Your journey to study abroad starts here
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-500">
          Personalized counseling for university shortlisting, visas, and scholarships —
          trusted by students across India for over a decade.
        </p>
        <button
          type="button"
          className="mt-8 rounded-lg px-6 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: business.branding_color }}
        >
          Book a Free Consultation
        </button>
      </header>

      <section className="grid grid-cols-2 gap-6 border-y border-gray-100 bg-gray-50 px-6 py-10 text-center sm:grid-cols-4 sm:px-12">
        {STATS.map(([stat, label]) => (
          <div key={label}>
            <p className="text-2xl font-bold text-gray-900">{stat}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="px-6 py-16 sm:px-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Explore</h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-xl border border-gray-100 p-5 shadow-sm transition hover:border-gray-200 hover:shadow-md"
            >
              <p className="font-semibold text-gray-900">{link.label}</p>
              <p className="mt-1 text-sm text-gray-500">{link.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
