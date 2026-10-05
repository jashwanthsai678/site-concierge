import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ACCENT, ACCENT_STRONG, ACCENT_TEXT } from '@/lib/palette'
import { BookIcon, BotIcon, LinkIcon, SparkIcon, UsersIcon } from '@/components/portal/icons'

// Kept in sync with OnboardingPage.tsx's CHARACTER_PRESETS — this is a real,
// already-shipped onboarding feature, so the names/blurbs here must stay
// verbatim rather than drift into separate marketing copy.
const CHARACTER_PRESETS = [
  {
    label: 'The Closer',
    blurb: 'Sales-first. Moves quickly toward budget and contact info, minimal small talk.',
  },
  {
    label: 'The Friendly Guide',
    blurb: 'Casual and patient. Builds rapport before ever asking for contact info.',
  },
  {
    label: 'The Qualifier',
    blurb: 'Neutral and checklist-driven. Gathers requirements, no pitching.',
  },
  {
    label: 'The Support Rep',
    blurb: "Answers FAQs from the knowledge base. Doesn't sell or collect leads.",
  },
  {
    label: 'The Consultant',
    blurb: 'Advisory tone. Asks about goals first, then recommends and closes.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Register your business',
    body: 'Sign up with your business info in a couple of minutes — no credit card, no sales call.',
  },
  {
    step: '2',
    title: "Choose your AI's character & teach it your business",
    body: 'Pick a persona preset to set the tone, then add FAQs or crawl your own website so it answers from real knowledge.',
  },
  {
    step: '3',
    title: 'Embed one script tag on your site',
    body: 'Paste a two-line snippet into your site, or hand it to your developer — works with Wix, Shopify, WordPress, or custom code.',
  },
  {
    step: '4',
    title: 'Leads land in your dashboard',
    body: 'Every conversation is qualified into a lead with name, contact, budget, and intent — plus the full transcript.',
  },
]

const FEATURES = [
  {
    icon: SparkIcon,
    title: 'Real conversations, not a form',
    body: 'Visitors chat naturally by voice or text — your AI asks the right questions and qualifies them as it goes.',
  },
  {
    icon: BookIcon,
    title: 'Your own knowledge base',
    body: 'Add FAQs directly or crawl your website so answers are grounded in what your business actually offers.',
  },
  {
    icon: LinkIcon,
    title: 'One script tag, any website',
    body: 'No app to install. Paste a two-line embed snippet and the widget is live on your site.',
  },
  {
    icon: UsersIcon,
    title: 'A live lead dashboard',
    body: 'See every lead with full transcripts and conversation analytics, and edit your persona, knowledge, or branding any time.',
  },
]

export function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <img src="/brand/qualeadio-wordmark-240.png" alt="Qualeadio" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/portal/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              to="/onboarding"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: ACCENT }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-6 py-24 text-white sm:py-28"
        style={{ background: `linear-gradient(160deg, ${ACCENT_STRONG}, #12294f)` }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <SparkIcon className="mb-5 h-9 w-9 opacity-80" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
              Your AI sales concierge, configured your way.
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Turn website visitors into qualified leads — through real conversation.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
              Qualeadio is an AI sales widget you embed on your own website. It talks to visitors by voice or
              text, answers from your own knowledge base, and qualifies them into leads while you sleep.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to="/onboarding"
                className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:brightness-95 sm:w-auto"
                style={{ color: ACCENT_TEXT }}
              >
                Get started free
              </Link>
              <Link
                to="/demo"
                className="w-full rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                See it in action
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">How it works</h2>
          <p className="mt-3 text-sm text-gray-500 sm:text-base">
            From sign-up to your first lead, in four steps.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Character showcase */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Give your AI a personality that fits your business
            </h2>
            <p className="mt-3 text-sm text-gray-500 sm:text-base">
              Pick a character preset during onboarding — it pre-fills how your AI behaves, and stays fully
              editable afterward.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHARACTER_PRESETS.map((preset) => (
              <div key={preset.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">{preset.label}</h3>
                <p className="mt-2 text-sm text-gray-500">{preset.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Everything you need to convert visitors
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${ACCENT}1a` }}
                >
                  <Icon className="h-5 w-5" style={{ color: ACCENT_TEXT }} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{feature.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Final CTA band */}
      <section
        className="relative overflow-hidden px-6 py-16 text-center text-white"
        style={{ background: `linear-gradient(160deg, ${ACCENT_STRONG}, #12294f)` }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-2xl">
          <BotIcon className="mx-auto mb-4 h-8 w-8 opacity-80" />
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to put your AI concierge to work?</h2>
          <p className="mt-3 text-sm text-white/75 sm:text-base">
            Set it up in minutes. No credit card required.
          </p>
          <Link
            to="/onboarding"
            className="mt-7 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:brightness-95"
            style={{ color: ACCENT_TEXT }}
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <img src="/brand/qualeadio-icon-32.png" alt="Qualeadio" className="h-6 w-6 rounded" />
          <p className="text-xs text-gray-400">© {year} Qualeadio</p>
          <Link to="/portal/login" className="text-xs font-medium text-gray-500 hover:text-gray-900">
            Log in
          </Link>
        </div>
      </footer>
    </div>
  )
}
