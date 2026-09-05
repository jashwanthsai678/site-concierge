import type { Topic } from '@/lib/topicMatch'

/**
 * One level more specific than topicMatch.ts: once a sentence has already
 * been scored as being "about" a topic/page, this looks for which single
 * item ON that page the sentence is actually talking about, so the mascot
 * can point at the USA card specifically instead of just landing on the
 * Destinations page in general. Keys here are matched 1:1 against the `id`
 * prop passed to <Highlightable> on each company-site page.
 */
const ENTITY_KEYWORDS: Partial<Record<Topic, Record<string, string[]>>> = {
  destinations: {
    usa: ['usa', 'united states', 'america', 'stem'],
    uk: ['uk', 'united kingdom', 'britain'],
    canada: ['canada', 'pr-friendly', 'co-op'],
    australia: ['australia'],
  },
  pricing: {
    'counseling-package': ['counseling', 'application package', 'shortlisting to offer', '45,000', '45000'],
    'visa-addon': ['visa filing add-on', 'visa add-on', '15,000', '15000'],
  },
  process: {
    'step-1': ['free consultation', 'step 1', 'first step'],
    'step-2': ['shortlisting'],
    'step-3': ['documentation', 'sop', 'recommendation letter'],
    'step-4': ['visa filing', 'mock interview'],
    'step-5': ['fly', 'settle', 'pre-departure'],
  },
  'why-us': {
    'why-visa': ['visa filing and mock interview', 'mock interview prep'],
    'why-scholarship': ['scholarship'],
    'why-speed': ['8 weeks', 'offer letter in as little'],
    'why-counselors': ['dedicated', 'regional counselor'],
  },
  testimonials: {
    ananya: ['ananya', 'canada application'],
    rohit: ['rohit', 'partial scholarship'],
  },
  faq: {
    'faq-timeline': ['how long', '8-12 weeks'],
    'faq-documents': ['documents', 'transcripts', 'passport'],
    'faq-scholarship': ['scholarship'],
    'faq-visa-rejected': ['visa rejected', 're-filing'],
  },
}

export function matchHighlightEntity(text: string, topic: Topic): string | null {
  const entities = ENTITY_KEYWORDS[topic]
  if (!entities) return null
  const lower = text.toLowerCase()

  let bestId: string | null = null
  let bestScore = 0
  for (const [id, keywords] of Object.entries(entities)) {
    const score = keywords.reduce((count, k) => count + (lower.includes(k) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestId = id
    }
  }
  return bestId
}
