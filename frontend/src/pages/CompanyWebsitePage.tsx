import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { VoiceWidget } from '@/components/widget/VoiceWidget'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SpotlightSection } from '@/components/common/SpotlightSection'
import type { Topic } from '@/lib/topicMatch'

const SPOTLIGHT_DURATION_MS = 6000
const SPOTLIGHT_CAPTION = '💬 Let me show you this'

const DESTINATIONS = [
  { country: 'USA', blurb: 'STEM & Business Master\'s, strong OPT pathways.' },
  { country: 'UK', blurb: '1-year Master\'s programs, fast return on investment.' },
  { country: 'Canada', blurb: 'PR-friendly programs, co-op work terms.' },
  { country: 'Australia', blurb: 'January & July intakes, post-study work visa.' },
]

const PRICING = [
  { name: 'Counseling & Application Package', price: 'INR 45,000', blurb: 'Full-service counseling, shortlisting, and filing for up to 6 universities.' },
  { name: 'Visa Filing Add-on', price: 'INR 15,000', blurb: 'End-to-end visa documentation and mock interview prep.' },
]

const WHY_US = [
  'End-to-end visa filing and mock interview prep',
  'Merit & need-based scholarship guidance at no extra cost',
  'Shortlisting to offer letter in as little as 8 weeks',
  'Dedicated regional counselors for every destination',
]

const TESTIMONIALS = [
  { name: 'Ananya R.', quote: "They handled my entire Canada application — I didn't have to chase anything myself." },
  { name: 'Rohit K.', quote: 'Got a partial scholarship I didn\'t even know I was eligible for. Highly recommend.' },
]

const PROCESS = [
  { step: '1', title: 'Free Consultation', blurb: 'Share your goals, budget, and background with a counselor.' },
  { step: '2', title: 'Shortlisting', blurb: 'We match you to universities that fit your profile and budget.' },
  { step: '3', title: 'Application & Documentation', blurb: 'We handle forms, SOPs, and recommendation letters end-to-end.' },
  { step: '4', title: 'Visa Filing', blurb: 'Complete visa documentation plus mock interview preparation.' },
  { step: '5', title: 'Fly & Settle', blurb: 'Pre-departure briefing and support once you land.' },
]

const FAQS = [
  { q: 'How long does the process take?', a: 'Typically 8-12 weeks from shortlisting to offer letter, depending on the destination.' },
  { q: 'What documents do I need?', a: 'Academic transcripts, passport, English proficiency scores, and a statement of purpose.' },
  { q: 'Do you help with scholarships?', a: 'Yes — we screen every applicant for merit and need-based scholarships at no extra cost.' },
  { q: 'What if my visa gets rejected?', a: 'We offer free re-filing support and additional mock interview prep to maximize approval chances.' },
]

// Maps a topic the widget detects in the AI's reply to this page's own
// section ids — the widget itself has no idea these ids exist; it only
// reports "this reply seems to be about X" (see VoiceWidget's onTopicMatch).
const TOPIC_SECTION_ID: Record<Topic, string> = {
  destinations: 'destinations',
  pricing: 'pricing',
  'why-us': 'why-us',
  testimonials: 'testimonials',
  process: 'process',
  faq: 'faq',
}

/**
 * A mock of a business's OWN existing website — deliberately plain,
 * light-themed marketing copy, nothing like our product's branding. This
 * is what "the ad takes the visitor to the company's real site" looks like
 * for the demo. The VoiceWidget floats on top of it exactly as it would on
 * a real customer's site.
 */
export function CompanyWebsitePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const query = useQuery({
    queryKey: ['landing-page', slug],
    queryFn: () => api.getLandingPage(slug),
    enabled: slug.length > 0,
  })

  // Hooks must run unconditionally on every render — all declared here,
  // BEFORE the loading/error early returns below, not after them.
  const [spotlightTopic, setSpotlightTopic] = useState<Topic | null>(null)
  const spotlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleTopicMatch = (topic: Topic) => {
    document.getElementById(TOPIC_SECTION_ID[topic])?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (spotlightTimerRef.current) clearTimeout(spotlightTimerRef.current)
    setSpotlightTopic(topic)
    spotlightTimerRef.current = setTimeout(() => setSpotlightTopic(null), SPOTLIGHT_DURATION_MS)
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <nav className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-12">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: business.branding_color }}
          >
            {business.name.charAt(0)}
          </div>
          <span className="font-semibold">{business.name}</span>
        </div>
        <div className="hidden gap-8 text-sm text-gray-500 sm:flex">
          <span>Programs</span>
          <span>About</span>
          <span>Success Stories</span>
          <span>Contact</span>
        </div>
      </nav>

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
        {[
          ['500+', 'Students Placed'],
          ['15+', 'Partner Countries'],
          ['98%', 'Visa Success Rate'],
          ['12+', 'Years of Experience'],
        ].map(([stat, label]) => (
          <div key={label}>
            <p className="text-2xl font-bold text-gray-900">{stat}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      <section id="destinations" className="px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'destinations'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Popular Destinations</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {DESTINATIONS.map((d) => (
              <div key={d.country} className="rounded-xl border border-gray-100 p-5 shadow-sm">
                <p className="font-semibold text-gray-900">{d.country}</p>
                <p className="mt-1 text-sm text-gray-500">{d.blurb}</p>
              </div>
            ))}
          </div>
        </SpotlightSection>
      </section>

      <section id="process" className="px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'process'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">How It Works</h2>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-5">
            {PROCESS.map((p) => (
              <div key={p.step} className="text-center">
                <div
                  className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: business.branding_color }}
                >
                  {p.step}
                </div>
                <p className="font-semibold text-gray-900">{p.title}</p>
                <p className="mt-1 text-xs text-gray-500">{p.blurb}</p>
              </div>
            ))}
          </div>
        </SpotlightSection>
      </section>

      <section id="pricing" className="bg-gray-50 px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'pricing'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Pricing</h2>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {PRICING.map((p) => (
              <div key={p.name} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="mt-1 text-lg font-bold" style={{ color: business.branding_color }}>{p.price}</p>
                <p className="mt-1 text-sm text-gray-500">{p.blurb}</p>
              </div>
            ))}
          </div>
        </SpotlightSection>
      </section>

      <section id="why-us" className="px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'why-us'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Why Choose Us</h2>
          <ul className="mx-auto max-w-2xl space-y-3">
            {WHY_US.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="mt-0.5 text-green-600">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </SpotlightSection>
      </section>

      <section id="testimonials" className="bg-gray-50 px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'testimonials'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">What Our Students Say</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm italic text-gray-600">"{t.quote}"</p>
                <p className="mt-3 text-xs font-semibold text-gray-800">{t.name}</p>
              </div>
            ))}
          </div>
        </SpotlightSection>
      </section>

      <section id="faq" className="bg-gray-50 px-6 py-16 sm:px-12">
        <SpotlightSection
          active={spotlightTopic === 'faq'}
          color={business.branding_color}
          caption={SPOTLIGHT_CAPTION}
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="mx-auto max-w-2xl space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="font-semibold text-gray-900">{f.q}</p>
                <p className="mt-1 text-sm text-gray-500">{f.a}</p>
              </div>
            ))}
          </div>
        </SpotlightSection>
      </section>

      <footer className="border-t border-gray-100 px-6 py-10 text-center text-xs text-gray-400 sm:px-12">
        © {new Date().getFullYear()} {business.name}. All rights reserved.
      </footer>

      <VoiceWidget slug={slug} businessName={business.name} onTopicMatch={handleTopicMatch} />
    </div>
  )
}
